"""Domain models shared by ports, adapters and use cases."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

import numpy as np


@dataclass(frozen=True)
class AudioClip:
    """Mono float32 samples in [-1, 1] plus the sample rate in Hz."""

    samples: np.ndarray
    sample_rate: int

    def __post_init__(self) -> None:
        if self.samples.ndim != 1:
            raise ValueError("AudioClip samples must be a 1-D (mono) array")

    @property
    def duration(self) -> float:
        """Length in seconds."""
        return len(self.samples) / self.sample_rate if self.sample_rate else 0.0


@dataclass(frozen=True)
class WordItem:
    text: str
    start: float  # seconds
    end: float  # seconds
    confidence: float | None = None


@dataclass(frozen=True)
class Transcript:
    text: str
    words: list[WordItem] = field(default_factory=list)


@dataclass(frozen=True)
class ChatMessage:
    role: Literal["system", "user", "assistant"]
    content: str
