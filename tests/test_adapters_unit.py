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
