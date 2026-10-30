"""Shared whisper-server / TTS server: reuse when reachable, else start detached and wait.

No real models, processes or network: HTTP goes through ``httpx.MockTransport``, process
starts through an injected launcher, time through an injected fake clock.
"""

import logging
import sys

import httpx
import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend.adapters import registry
from backend.adapters.process import ensure_running
from backend.adapters.stt.whisper_server import WhisperServerSTT
from backend.adapters.tts.supertonic_server import SupertonicServerTTS
from backend.api.wav import decode_wav, encode_wav
from backend.core.models import AudioClip
from backend.services.tts_server import create_app


class Clock:
    """Fake time: ``sleep`` advances ``now``."""

    def __init__(self):
        self.now = 0.0

    def time(self):
        return self.now

    def sleep(self, seconds):
        self.now += seconds


class Launcher:
    """Records launches; the fake server comes up ``after`` polls once launched."""

    def __init__(self, fail=False):
        self.calls = []
        self.fail = fail
        self.up = False

    def __call__(self, argv, cwd=None):
        if self.fail:
            raise FileNotFoundError(argv[0])
        self.calls.append(list(argv))
        self.up = True


# --- shared helper ---

def test_ensure_running_reachable_starts_nothing():
    launcher = Launcher()
    assert ensure_running(lambda: True, ["x"], launcher=launcher) is True
    assert launcher.calls == []


def test_ensure_running_starts_once_and_waits():
    clock, launcher = Clock(), Launcher()
    polls = []

    def is_up():
        polls.append(clock.now)
        return launcher.up and len(polls) > 3

    assert ensure_running(is_up, ["srv", "--x"], launcher=launcher, timeout=60,
                          sleep=clock.sleep, clock=clock.time) is True
    assert launcher.calls == [["srv", "--x"]]


def test_ensure_running_launch_failure_and_timeout():
    clock = Clock()
    assert ensure_running(lambda: False, ["nope"], launcher=Launcher(fail=True),
                          sleep=clock.sleep, clock=clock.time) is False
    launcher = Launcher()
    assert ensure_running(lambda: False, ["slow"], launcher=launcher, timeout=5,
                          sleep=clock.sleep, clock=clock.time) is False
    assert len(launcher.calls) == 1 and clock.now >= 5


# --- STT ---

STT_JSON = {"segments": [{"words": [{"word": " Hi", "start": 0.0, "end": 0.3,
                                      "probability": 0.9}]}]}


def stt_client(launcher, reachable=False):
    def handler(request):
        if not (reachable or launcher.up):
            raise httpx.ConnectError("refused")
        if request.url.path == "/inference":
            return httpx.Response(200, json=STT_JSON)
        return httpx.Response(200, text="whisper")
    return httpx.Client(transport=httpx.MockTransport(handler))


def stt(launcher, reachable=False, **kwargs):
    clock = Clock()
    params = dict(host="127.0.0.1", port=8178, language="en",
                  exe_path=r"C:\w\whisper-server.exe", model_path=r"C:\m\ggml.bin")
    params.update(kwargs)
    return WhisperServerSTT(client=stt_client(launcher, reachable), launcher=launcher,
                            sleep=clock.sleep, clock=clock.time, **params)


CLIP = AudioClip(np.zeros(1600, dtype=np.float32), 16000)


def test_stt_reachable_server_is_reused_without_starting():
    launcher = Launcher()
    out = stt(launcher, reachable=True).transcribe(CLIP)
    assert out.text == "Hi" and launcher.calls == []


def test_stt_unreachable_autostarts_once_with_expected_argv_then_uses_it():
    launcher = Launcher()
    s = stt(launcher, language="en")
    assert launcher.calls == [[
        r"C:\w\whisper-server.exe", "-m", r"C:\m\ggml.bin", "--host", "127.0.0.1",
        "--port", "8178", "-l", "en", "-ml", "1", "-sow"]]
    assert s.transcribe(CLIP).text == "Hi"
    assert len(launcher.calls) == 1


def test_stt_expands_env_vars_in_exe_path(monkeypatch):
    monkeypatch.setenv("WHISPER_HOME", r"C:\home")
    launcher = Launcher()
    stt(launcher, exe_path=r"%WHISPER_HOME%\whisper-server.exe")
    assert launcher.calls[0][0] == r"C:\home\whisper-server.exe"


def test_stt_start_failure_raises_clear_error_with_hint():
    launcher = Launcher(fail=True)
    s = stt(launcher)
    with pytest.raises(ConnectionError) as e:
        s.transcribe(CLIP)
    assert "whisper-server.exe" in str(e.value) and "--port 8178" in str(e.value)


def test_stt_autostart_off_or_without_paths_never_launches():
    launcher = Launcher()
    stt(launcher, autostart=False)
    stt(launcher, exe_path=None, model_path=None)
    assert launcher.calls == []


# --- TTS server (FastAPI) ---

class FakeTTS:
    sample_rate = 22050

    def __init__(self):
        self.calls = []

    def synthesize(self, text, *, voice=None, speed=1.0):
        self.calls.append((text, voice, speed))
        t = np.linspace(0, 1, 2205, dtype=np.float32)
        return AudioClip(0.5 * np.sin(2 * np.pi * 5 * t), self.sample_rate)


def test_tts_server_health_and_synthesize_wav_round_trip():
    tts = FakeTTS()
    client = TestClient(create_app(tts))
    assert client.get("/health").status_code == 200
    resp = client.post("/synthesize", json={"text": "Hello", "voice": "F2", "speed": 1.2})
    assert resp.status_code == 200 and resp.headers["content-type"] == "audio/wav"
    clip = decode_wav(resp.content)
    assert clip.sample_rate == 22050 and clip.samples.size == 2205
    assert tts.calls == [("Hello", "F2", 1.2)]
    assert resp.content[:4] == b"RIFF"


def test_tts_server_defaults_and_bad_requests():
    tts = FakeTTS()
    client = TestClient(create_app(tts))
    assert client.post("/synthesize", json={"text": "Hi"}).status_code == 200
    assert tts.calls == [("Hi", None, 1.0)]
    assert client.post("/synthesize", json={"text": "  "}).status_code == 400
    assert client.post("/synthesize", json={}).status_code == 422

    class BadVoice(FakeTTS):
        def synthesize(self, text, *, voice=None, speed=1.0):
            raise ValueError("Unknown Supertonic voice 'X'")

    assert TestClient(create_app(BadVoice())).post(
        "/synthesize", json={"text": "Hi", "voice": "X"}).status_code == 400


# --- TTS adapter ---

def tts_client(launcher, reachable=False, requests=None):
    def handler(request):
        if requests is not None:
            requests.append(request)
        if not (reachable or launcher.up):
            raise httpx.ConnectError("refused")
        if request.url.path == "/health":
            return httpx.Response(200, json={"status": "ok"})
        return httpx.Response(200, content=encode_wav(AudioClip(
            np.full(800, 0.25, dtype=np.float32), 24000)), headers={"content-type": "audio/wav"})
    return httpx.Client(transport=httpx.MockTransport(handler))


def server_tts(launcher, reachable=False, requests=None, local_factory=None, **kwargs):
    clock = Clock()
    return SupertonicServerTTS(
        model_dir=r"C:\models\supertonic", voice="M1", steps=8, port=8179,
        client=tts_client(launcher, reachable, requests), launcher=launcher,
        sleep=clock.sleep, clock=clock.time, local_factory=local_factory, **kwargs)


def never_local(**kwargs):
    raise AssertionError("must not load the model in-process")


def test_tts_reachable_server_is_reused_without_starting():
    launcher, requests = Launcher(), []
    clip = server_tts(launcher, reachable=True, requests=requests,
                      local_factory=never_local).synthesize("Hi", voice="F1", speed=0.9)
    assert launcher.calls == []
    assert clip.sample_rate == 24000 and clip.samples.size == 800
    post = [r for r in requests if r.url.path == "/synthesize"][0]
    import json
    assert json.loads(post.content) == {"text": "Hi", "voice": "F1", "speed": 0.9}


def test_tts_unreachable_autostarts_once_with_expected_argv_then_uses_it():
    launcher = Launcher()
    tts = server_tts(launcher, local_factory=never_local)
    assert launcher.calls == [[
        sys.executable, "-m", "backend.services.tts_server", "--model-dir",
        r"C:\models\supertonic", "--host", "127.0.0.1", "--port", "8179",
        "--voice", "M1", "--steps", "8"]]
    assert tts.synthesize("Hi").samples.size == 800
    assert len(launcher.calls) == 1


def test_tts_start_failure_falls_back_in_process_and_warns_once(caplog):
    launcher, built = Launcher(fail=True), []

    class Local:
        def synthesize(self, text, *, voice=None, speed=1.0):
            return AudioClip(np.zeros(10, dtype=np.float32), 16000)

    def factory(**kwargs):
        built.append(kwargs)
        return Local()

    with caplog.at_level(logging.WARNING):
        tts = server_tts(launcher, local_factory=factory)
        tts.synthesize("a")
        tts.synthesize("b")
    assert built == [{"model_dir": r"C:\models\supertonic", "voice": "M1", "steps": 8}]
    assert sum("in-process" in r.message for r in caplog.records) == 1


def test_tts_autostart_off_falls_back_without_launching():
    launcher, built = Launcher(), []
    tts = server_tts(launcher, autostart=False, local_factory=lambda **k: built.append(k) or
                     type("L", (), {"synthesize": lambda s, t, **kw: AudioClip(
                         np.zeros(1, dtype=np.float32), 16000)})())
    tts.synthesize("x")
    assert launcher.calls == [] and len(built) == 1


def test_registry_lists_supertonic_server_and_keeps_supertonic():
    assert {"supertonic", "supertonic_server"} <= set(registry.available("tts"))
