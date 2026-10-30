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
