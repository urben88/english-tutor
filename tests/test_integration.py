"""Integration tests against the real local adapters. Skipped when a model/service is missing."""

import json
from pathlib import Path

import httpx
import numpy as np
import pytest

from backend.adapters import registry
from backend.core.config import load_config
from backend.core.models import AudioClip, ChatMessage

pytestmark = pytest.mark.integration

CFG = load_config("config.yaml")


def _llm_available() -> bool:
    try:
        tags = httpx.get(CFG.llm.params.get("base_url", "http://localhost:11434") + "/api/tags",
                         timeout=2).json()
        return any(m["name"] == CFG.llm.params["model"] for m in tags.get("models", []))
    except Exception:
        return False


needs_tts = pytest.mark.skipif(
    not (Path(CFG.tts.params["model_dir"]) / "onnx" / "vocoder.onnx").is_file(),
    reason="Supertonic model dir not found")
needs_stt = pytest.mark.skipif(
    not Path(CFG.stt.params["model_path"]).is_file(), reason="Whisper model file not found")
needs_llm = pytest.mark.skipif(not _llm_available(), reason="Ollama or model not available")


@pytest.fixture(scope="module")
def tts():
    return registry.build_tts(CFG)


@needs_tts
def test_tts_synthesizes_audio(tts):
    clip = tts.synthesize("Hello, how are you today?")
    assert clip.sample_rate > 0 and clip.duration > 0.5
    assert clip.samples.dtype == np.float32 and np.abs(clip.samples).max() > 0.01


@needs_tts
@needs_stt
def test_stt_transcribes_tts_audio(tts):
    stt = registry.build_stt(CFG)
    out = stt.transcribe(tts.synthesize("Hello, how are you today?"))
    assert "hello" in out.text.lower()
    assert out.words and out.words[0].end >= out.words[0].start


@needs_llm
def test_llm_generate_stream_and_json():
    llm = registry.build_llm(CFG)
    msgs = [ChatMessage("user", "Reply with one short greeting.")]
    assert llm.generate(msgs).strip()
    assert "".join(llm.stream(msgs)).strip()
    schema = {"type": "object", "properties": {"ok": {"type": "boolean"}}, "required": ["ok"]}
    data = json.loads(llm.generate([ChatMessage("user", "Return ok true as JSON.")],
                                   json_schema=schema))
    assert "ok" in data
