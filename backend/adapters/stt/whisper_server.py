"""Speech-to-text adapter for a running whisper.cpp ``whisper-server`` (GPU build).

The adapter only connects to an already running server; it never starts it. Start it with:

    <exe_dir>\\whisper-server.exe -m <model_path> --host 127.0.0.1 --port 8178 -l en -ml 1 -sow

``-ml 1 -sow`` makes the server split output per word so word timestamps are usable.
"""

from __future__ import annotations

import io
import wave

import httpx
import numpy as np

from backend.adapters.stt.whisper_cpp import WHISPER_RATE, resample
from backend.core.models import AudioClip, Transcript, WordItem

START_HINT = (
    r'"%LOCALAPPDATA%\english-tutor\whisper-cuda\Release\whisper-server.exe" '
    r'-m "<path to ggml model .bin>" --host {host} --port {port} -l en -ml 1 -sow')


def _to_wav(audio: AudioClip) -> bytes:
    samples = resample(audio.samples, audio.sample_rate)
    pcm = (np.clip(samples, -1.0, 1.0) * 32767).astype("<i2")
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(WHISPER_RATE)
        w.writeframes(pcm.tobytes())
    return buf.getvalue()


def parse_verbose_json(data: dict) -> Transcript:
    """Convert a ``verbose_json`` response into a Transcript.

    The server returns sub-word tokens (punctuation arrives as its own entry without a
    leading space); those are merged into the preceding word.
    """
    words: list[WordItem] = []
    for seg in data.get("segments", []):
        for tok in seg.get("words", []):
            raw = tok.get("word", "")
            text = raw.strip()
            if not text:
                continue
            start, end = float(tok["start"]), float(tok["end"])
            prob = tok.get("probability")
            prob = None if prob is None else float(prob)
            if words and not raw.startswith(" "):
                prev = words[-1]
                conf = prev.confidence if prob is None else (
                    prob if prev.confidence is None else min(prev.confidence, prob))
                words[-1] = WordItem(prev.text + text, prev.start, max(prev.end, end), conf)
            else:
                words.append(WordItem(text, start, end, prob))
    return Transcript(" ".join(w.text for w in words), words)


class WhisperServerSTT:
    def __init__(self, host: str = "127.0.0.1", port: int = 8178, language: str = "en",
                 timeout: float = 60.0) -> None:
        self._url = f"http://{host}:{port}/inference"
        self._language = language
        self._hint = START_HINT.format(host=host, port=port)
        self._client = httpx.Client(timeout=timeout)

    def transcribe(self, audio: AudioClip) -> Transcript:
        try:
            resp = self._client.post(
                self._url,
                files={"file": ("audio.wav", _to_wav(audio), "audio/wav")},
                data={"response_format": "verbose_json", "temperature": "0",
                      "language": self._language})
            resp.raise_for_status()
        except httpx.TransportError as e:
            raise ConnectionError(
                f"whisper-server is not reachable at {self._url} ({type(e).__name__}). "
                f"Start it with: {self._hint}") from e
        return parse_verbose_json(resp.json())
