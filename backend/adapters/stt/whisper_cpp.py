"""Speech-to-text adapter backed by whisper.cpp through ``pywhispercpp``."""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np

from backend.core.models import AudioClip, Transcript, WordItem

WHISPER_RATE = 16000


def resample(samples: np.ndarray, src_rate: int, dst_rate: int = WHISPER_RATE) -> np.ndarray:
    """Linear-interpolation resampling (enough for speech)."""
    if src_rate == dst_rate or len(samples) == 0:
        return samples.astype(np.float32, copy=False)
    n_out = int(round(len(samples) * dst_rate / src_rate))
    x_old = np.linspace(0.0, 1.0, num=len(samples), endpoint=False)
    x_new = np.linspace(0.0, 1.0, num=n_out, endpoint=False)
    return np.interp(x_new, x_old, samples).astype(np.float32)


class WhisperCppSTT:
    def __init__(self, model_path: str, language: str = "en", n_threads: int = 4) -> None:
        if not Path(model_path).is_file():
            raise FileNotFoundError(f"Whisper model file not found: {model_path}")
        from pywhispercpp.model import Model

        self._language = language
        self._model = Model(model_path, n_threads=n_threads)

    def transcribe(self, audio: AudioClip) -> Transcript:
        samples = resample(audio.samples, audio.sample_rate)
        # max_len=1 + split_on_word makes whisper.cpp emit one segment per word.
        segments = self._model.transcribe(
            samples, language=self._language, token_timestamps=True,
            max_len=1, split_on_word=True, extract_probability=True)
        words: list[WordItem] = []
        for seg in segments:
            text = seg.text.strip()
            if not text:
                continue
            prob = getattr(seg, "probability", None)
            conf = None if prob is None or (isinstance(prob, float) and math.isnan(prob)) else float(prob)
            # t0/t1 are in centiseconds.
            words.append(WordItem(text, seg.t0 / 100.0, seg.t1 / 100.0, conf))
        return Transcript(" ".join(w.text for w in words), words)
