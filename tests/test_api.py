import base64
import io
import json
import wave

import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend.adapters.store.sqlite import SQLiteStore
from backend.api.app import Services, create_app
from backend.api.wav import decode_wav, encode_wav
from backend.core.context import ContextBudget
from backend.core.models import AudioClip, Transcript
from backend.core.persona import Persona

GOOD_EXPLAIN = json.dumps({"translation": "hola", "explanation": "Un saludo.", "examples": ["Hi!"]})


class FakeSTT:
    def transcribe(self, audio):
        return Transcript("heard text")


class FakeLLM:
    def __init__(self):
        self.explain_reply = GOOD_EXPLAIN

    def generate(self, messages, *, json_schema=None):
        return self.explain_reply if json_schema else "reply here"

    def stream(self, messages):
        yield "x"

    def count_tokens(self, text):
        return len(text.split())


class FakeTTS:
    def synthesize(self, text, *, voice=None, speed=1.0):
        return AudioClip(np.full(160, 0.5, dtype=np.float32), 24000)


def wav_bytes(samples=1600, rate=16000, channels=1, width=2):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(channels)
        w.setsampwidth(width)
        w.setframerate(rate)
        w.writeframes(b"\x00\x10" * samples * channels if width == 2 else b"\x00" * samples * channels)
    return buf.getvalue()


@pytest.fixture
def parts(tmp_path):
    store = SQLiteStore(path=str(tmp_path / "api.db"))
    llm = FakeLLM()
    svc = Services(FakeSTT(), llm, FakeTTS(), store, Persona("emma", "Emma", "F2", "SYS"),
                   ContextBudget(1000, 100, 100))
    yield svc, llm, store
    store.close()


@pytest.fixture
def client(parts):
    return TestClient(create_app(parts[0], static_dir=None))


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_persona(client):
    assert client.get("/api/persona").json() == {"name": "Emma", "stem": "emma"}


def test_create_and_list_sessions(client):
    assert client.get("/api/sessions").json() == []
    sid = client.post("/api/sessions").json()["id"]
    rows = client.get("/api/sessions").json()
    assert len(rows) == 1
    assert set(rows[0]) == {"id", "persona", "created_at", "updated_at", "message_count"}
    assert rows[0]["id"] == sid and rows[0]["persona"] == "emma" and rows[0]["message_count"] == 0


def test_messages_unknown_session_404(client):
    assert client.get("/api/sessions/99/messages").status_code == 404


def test_text_turn_and_messages(client):
    sid = client.post("/api/sessions").json()["id"]
    r = client.post(f"/api/sessions/{sid}/turn/text", json={"text": "hello"})
    assert r.status_code == 200
    body = r.json()
    assert body["user_text"] == "hello" and body["reply_text"] == "reply here"
    assert body["sample_rate"] == 24000
    clip = decode_wav(base64.b64decode(body["audio"]))
    assert clip.sample_rate == 24000 and len(clip.samples) == 160
    msgs = client.get(f"/api/sessions/{sid}/messages").json()
    assert [(m["role"], m["content"]) for m in msgs] == [("user", "hello"), ("assistant", "reply here")]
    assert set(msgs[0]) == {"id", "role", "content"}
    assert client.get("/api/sessions").json()[0]["message_count"] == 2


def test_text_turn_unknown_session_404(client):
    assert client.post("/api/sessions/99/turn/text", json={"text": "hi"}).status_code == 404


def test_text_turn_empty_text_400(client):
    sid = client.post("/api/sessions").json()["id"]
    assert client.post(f"/api/sessions/{sid}/turn/text", json={"text": "  "}).status_code == 400


def test_voice_turn(client):
    sid = client.post("/api/sessions").json()["id"]
    r = client.post(f"/api/sessions/{sid}/turn", content=wav_bytes(),
                    headers={"Content-Type": "audio/wav"})
    assert r.status_code == 200
    assert r.json()["user_text"] == "heard text" and r.json()["reply_text"] == "reply here"


@pytest.mark.parametrize("body", [b"", b"not a wav file", wav_bytes(samples=0), wav_bytes(width=1)])
def test_voice_turn_bad_wav_400(client, body):
    sid = client.post("/api/sessions").json()["id"]
    r = client.post(f"/api/sessions/{sid}/turn", content=body, headers={"Content-Type": "audio/wav"})
    assert r.status_code == 400
    assert r.json()["detail"]


def test_voice_turn_unknown_session_404(client):
    r = client.post("/api/sessions/99/turn", content=wav_bytes(), headers={"Content-Type": "audio/wav"})
    assert r.status_code == 404


def test_voice_turn_without_stt_503_but_text_works(parts):
    svc, _, _ = parts
    c = TestClient(create_app(Services(None, svc.llm, svc.tts, svc.store, svc.persona, svc.budget),
                              static_dir=None))
    sid = c.post("/api/sessions").json()["id"]
    assert c.post(f"/api/sessions/{sid}/turn", content=wav_bytes(),
                  headers={"Content-Type": "audio/wav"}).status_code == 503
    assert c.post(f"/api/sessions/{sid}/turn/text", json={"text": "hi"}).status_code == 200


def test_explain(client, parts):
    sid = client.post("/api/sessions").json()["id"]
    r = client.post("/api/explain", json={"text": "hello", "context": "hello there"})
    assert r.status_code == 200
    assert r.json() == {"text": "hello", "translation": "hola", "explanation": "Un saludo.",
                        "examples": ["Hi!"]}
    assert client.get(f"/api/sessions/{sid}/messages").json() == []  # history untouched


def test_explain_bad_model_json_502(client, parts):
    parts[1].explain_reply = "nope"
    r = client.post("/api/explain", json={"text": "hello", "context": "hello there"})
    assert r.status_code == 502
    assert "invalid JSON" in r.json()["detail"]


def test_wav_round_trip_and_stereo_downmix():
    clip = AudioClip(np.array([0.0, 0.5, -0.5, 1.0], dtype=np.float32), 16000)
    back = decode_wav(encode_wav(clip))
    assert back.sample_rate == 16000
    assert np.allclose(back.samples, clip.samples, atol=1e-3)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(8000)
        w.writeframes(np.array([16384, -16384, 8192, 8192], dtype="<i2").tobytes())
    st = decode_wav(buf.getvalue())
    assert st.sample_rate == 8000 and np.allclose(st.samples, [0.0, 0.25], atol=1e-3)


def test_serves_built_frontend_with_spa_fallback(parts, tmp_path):
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<html>app</html>")
    (dist / "assets" / "a.js").write_text("js")
    c = TestClient(create_app(parts[0], static_dir=dist))
    assert c.get("/").text == "<html>app</html>"
    assert c.get("/assets/a.js").text == "js"
    assert c.get("/some/route").text == "<html>app</html>"
    assert c.get("/health").json() == {"status": "ok"}
    assert c.get("/api/nope").status_code == 404


def test_no_frontend_dir_means_no_root(client):
    assert client.get("/").status_code == 404
