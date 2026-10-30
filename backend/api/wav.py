"""WAV <-> AudioClip with the stdlib ``wave`` module (16-bit PCM)."""

from __future__ import annotations

import io
import wave

import numpy as np

from backend.core.models import AudioClip


def decode_wav(data: bytes) -> AudioClip:
    """16-bit PCM WAV (mono or multi-channel, averaged to mono) -> float32 AudioClip."""
    if not data:
        raise ValueError("empty request body: send a WAV file")
    try:
        with wave.open(io.BytesIO(data), "rb") as w:
            channels, width, rate, frames = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
            if width != 2:
                raise ValueError("WAV must be 16-bit PCM")
            raw = w.readframes(frames)
    except (wave.Error, EOFError) as e:
        raise ValueError(f"invalid WAV file: {e}") from e
    pcm = np.frombuffer(raw[: len(raw) - len(raw) % (2 * channels)], dtype="<i2")
    if pcm.size == 0 or rate <= 0:
        raise ValueError("WAV file has no audio")
    samples = pcm.reshape(-1, channels).astype(np.float32).mean(axis=1) / 32768.0
    return AudioClip(samples.astype(np.float32), rate)


def encode_wav(clip: AudioClip) -> bytes:
    pcm = (np.clip(clip.samples, -1.0, 1.0) * 32767.0).astype("<i2")
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(clip.sample_rate)
        w.writeframes(pcm.tobytes())
    return buf.getvalue()
