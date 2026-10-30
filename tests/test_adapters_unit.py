"""Model-free unit tests for adapter helpers."""

import numpy as np
import pytest

from backend.adapters.llm.ollama import OllamaLLM
from backend.adapters.stt.whisper_cpp import WhisperCppSTT, resample
from backend.adapters.tts.supertonic import SupertonicTTS, prepare_text, split_text


def test_prepare_text_wraps_and_punctuates():
    assert prepare_text("Hello  world", "en") == "<en>Hello world.</en>"
    with pytest.raises(ValueError):
        prepare_text("x", "xx")


def test_split_text_respects_maximum():
    chunks = split_text("One. Two. Three. Four.", maximum=10)
    assert all(len(c) <= 10 for c in chunks) and len(chunks) > 1


def test_resample_length():
    assert len(resample(np.zeros(44100, dtype=np.float32), 44100, 16000)) == 16000


def test_missing_models_fail_clearly(tmp_path):
    with pytest.raises(FileNotFoundError):
        SupertonicTTS(model_dir=str(tmp_path))
    with pytest.raises(FileNotFoundError):
        WhisperCppSTT(model_path=str(tmp_path / "nope.bin"))


def test_count_tokens_approximation():
    llm = OllamaLLM(model="x")
    assert llm.count_tokens("") == 0 and llm.count_tokens("abcdefgh") == 2


def _ollama_with(handler) -> OllamaLLM:
    import httpx
    llm = OllamaLLM(model="m")
    llm._client = httpx.Client(transport=httpx.MockTransport(handler))
    return llm


def test_ollama_disables_thinking_and_never_returns_it():
    import httpx
    import json as _json
    from backend.core.models import ChatMessage

    sent = []

    def handler(request):
        sent.append(_json.loads(request.content))
        return httpx.Response(200, json={"message": {"role": "assistant", "content": "Hi!",
                                                      "thinking": "secret reasoning"}})

    reply = _ollama_with(handler).generate([ChatMessage(role="user", content="hello")])

    assert sent[0]["think"] is False
    assert reply == "Hi!"


def test_ollama_stream_skips_thinking_chunks():
    import httpx
    from backend.core.models import ChatMessage

    lines = ('{"message":{"thinking":"hmm"}}\n'
             '{"message":{"content":"Hel"}}\n'
             '{"message":{"content":"lo"},"done":true}\n')

    def handler(request):
        return httpx.Response(200, content=lines.encode())

    chunks = list(_ollama_with(handler).stream([ChatMessage(role="user", content="hi")]))

    assert chunks == ["Hel", "lo"]


def test_whisper_server_parses_verbose_json_and_merges_punctuation():
    from backend.adapters.stt.whisper_server import parse_verbose_json

    data = {"segments": [
        {"id": 0, "text": ""},
        {"id": 1, "words": [
            {"word": " Hello", "start": 0.52, "end": 0.52, "probability": 0.85},
            {"word": ",", "start": 0.59, "end": 0.72, "probability": 0.79}]},
        {"id": 2, "words": [{"word": " my", "start": 0.72, "end": 0.84, "probability": 0.95}]},
    ]}
    out = parse_verbose_json(data)
    assert out.text == "Hello, my"
    assert [(w.text, w.start, w.end) for w in out.words] == [
        ("Hello,", 0.52, 0.72), ("my", 0.72, 0.84)]
    assert out.words[0].confidence == pytest.approx(0.79)


def test_whisper_server_transcribe_with_fake_http(monkeypatch):
    import httpx

    from backend.adapters.stt.whisper_server import WhisperServerSTT
    from backend.core.models import AudioClip

    def handler(request):
        assert request.url.path == "/inference"
        return httpx.Response(200, json={"segments": [
            {"words": [{"word": " Hi", "start": 0.0, "end": 0.3, "probability": 0.9}]}]})

    stt = WhisperServerSTT(port=9)
    stt._client = httpx.Client(transport=httpx.MockTransport(handler))
    out = stt.transcribe(AudioClip(np.zeros(1600, dtype=np.float32), 16000))
    assert out.text == "Hi" and out.words[0].confidence == pytest.approx(0.9)


def test_whisper_server_unreachable_gives_start_command():
    from backend.adapters.stt.whisper_server import WhisperServerSTT
    from backend.core.models import AudioClip

    stt = WhisperServerSTT(port=1, timeout=2)  # nothing listens on port 1
    with pytest.raises(ConnectionError) as e:
        stt.transcribe(AudioClip(np.zeros(1600, dtype=np.float32), 16000))
    msg = str(e.value)
    assert "whisper-server.exe" in msg and "--port 1" in msg and "-ml 1 -sow" in msg


# --- Ollama: share the loaded instance (context window and lifetime) ---

def _ps_llm(ps_response, sent, **kwargs):
    """OllamaLLM whose /api/ps answers ``ps_response`` (an httpx.Response or a dict)."""
    import httpx
    import json as _json

    def handler(request):
        if request.url.path == "/api/ps":
            if isinstance(ps_response, httpx.Response):
                return ps_response
            return httpx.Response(200, json=ps_response)
        sent.append(_json.loads(request.content))
        return httpx.Response(200, json={"message": {"role": "assistant", "content": "ok"}})

    llm = OllamaLLM(model="m", num_ctx=4096, **kwargs)
    llm._client = httpx.Client(transport=httpx.MockTransport(handler))
    return llm


def _loaded(ctx=8192, expires="2099-01-01T00:00:00Z", name="m:latest"):
    return {"models": [{"name": name, "model": name, "context_length": ctx,
                        "expires_at": expires}]}


def _ask(llm):
    from backend.core.models import ChatMessage
    return llm.generate([ChatMessage(role="user", content="hi")])


def test_ollama_adopts_loaded_context_length():
    sent = []
    llm = _ps_llm(_loaded(ctx=8192), sent)
    assert llm.context_size() == 8192
    _ask(llm)
    assert sent[0]["options"]["num_ctx"] == 8192


def test_ollama_not_loaded_uses_configured_num_ctx():
    sent = []
    llm = _ps_llm(_loaded(name="other:latest"), sent)
    assert llm.context_size() == 4096
    _ask(llm)
    assert sent[0]["options"]["num_ctx"] == 4096 and "keep_alive" not in sent[0]


def test_ollama_ps_error_uses_configured_num_ctx():
    import httpx
    sent = []
    llm = _ps_llm(httpx.Response(500), sent)
    assert llm.context_size() == 4096
    _ask(llm)
    assert sent[0]["options"]["num_ctx"] == 4096


def test_ollama_ps_unreachable_uses_configured_num_ctx():
    import httpx
    import json as _json
    from backend.core.models import ChatMessage
    sent = []

    def handler(request):
        if request.url.path == "/api/ps":
            raise httpx.ConnectError("down")
        sent.append(_json.loads(request.content))
        return httpx.Response(200, json={"message": {"role": "assistant", "content": "ok"}})

    llm = OllamaLLM(model="m", num_ctx=4096)
    llm._client = httpx.Client(transport=httpx.MockTransport(handler))
    llm.generate([ChatMessage(role="user", content="hi")])
    assert sent[0]["options"]["num_ctx"] == 4096


def test_ollama_configured_keep_alive_sent_when_not_loaded():
    sent = []
    _ask(_ps_llm({"models": []}, sent, keep_alive="30m"))
    assert sent[0]["keep_alive"] == "30m"


def test_ollama_keep_alive_never_shortens_loaded_model(monkeypatch):
    from datetime import datetime, timezone
    from backend.adapters.llm import ollama
    monkeypatch.setattr(ollama, "_now",
                        lambda: datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc))
    # expires in 1 hour, configured 5m -> keep the longer remaining lifetime
    sent = []
    _ask(_ps_llm(_loaded(expires="2026-01-01T01:00:00.000000000+00:00"), sent, keep_alive="5m"))
    assert sent[0]["keep_alive"] == 3600
    # expires far in the future (loaded with keep_alive -1) -> -1
    sent = []
    _ask(_ps_llm(_loaded(expires="2318-01-01T00:00:00Z"), sent, keep_alive="5m"))
    assert sent[0]["keep_alive"] == -1
    # configured keep-alive longer than the remaining lifetime wins
    sent = []
    _ask(_ps_llm(_loaded(expires="2026-01-01T00:01:00Z"), sent, keep_alive="1h"))
    assert sent[0]["keep_alive"] == "1h"
    # no configured keep_alive but loaded: still never reset to Ollama's 5 min default
    sent = []
    _ask(_ps_llm(_loaded(expires="2026-01-01T01:00:00Z"), sent))
    assert sent[0]["keep_alive"] == 3600


def test_context_budget_follows_effective_context():
    from backend.core.context import ContextBudget

    class Loaded:
        def context_size(self):
            return 8192

    params = {"num_ctx": 4096, "num_predict": 256}
    assert ContextBudget.for_llm(Loaded(), params, 256).num_ctx == 8192
    assert ContextBudget.for_llm(object(), params, 256) == ContextBudget.from_params(params, 256)


def test_build_services_budget_uses_llm_effective_context(tmp_path, monkeypatch):
    from backend.api import app as api_app
    from backend.adapters import registry

    class L:
        def context_size(self):
            return 9000

    cfg = tmp_path / "c.yaml"
    cfg.write_text("stt: {adapter: s}\nllm: {adapter: l, params: {num_ctx: 4096, num_predict: 100}}\n"
                   "tts: {adapter: t}\nstore: {adapter: st}\n", encoding="utf-8")
    monkeypatch.setattr(registry, "build_stt", lambda c: None)
    monkeypatch.setattr(registry, "build_llm", lambda c: L())
    monkeypatch.setattr(registry, "build_tts", lambda c: None)
    monkeypatch.setattr(registry, "build_store", lambda c: None)
    monkeypatch.setattr("backend.core.persona.load_persona", lambda n: None)
    assert api_app.build_services(str(cfg)).budget.num_ctx == 9000


def test_build_services_without_context_size_keeps_configured_budget(tmp_path, monkeypatch):
    from backend.api import app as api_app
    from backend.adapters import registry

    cfg = tmp_path / "c.yaml"
    cfg.write_text("stt: {adapter: s}\nllm: {adapter: l, params: {num_ctx: 4096, num_predict: 100}}\n"
                   "tts: {adapter: t}\nstore: {adapter: st}\n", encoding="utf-8")
    monkeypatch.setattr(registry, "build_stt", lambda c: None)
    monkeypatch.setattr(registry, "build_llm", lambda c: object())
    monkeypatch.setattr(registry, "build_tts", lambda c: None)
    monkeypatch.setattr(registry, "build_store", lambda c: None)
    monkeypatch.setattr("backend.core.persona.load_persona", lambda n: None)
    assert api_app.build_services(str(cfg)).budget.num_ctx == 4096


def test_ollama_without_keep_alive_param_keeps_previous_payload():
    sent = []
    _ask(_ps_llm({"models": []}, sent))
    assert set(sent[0]) == {"model", "messages", "stream", "think", "options"}
