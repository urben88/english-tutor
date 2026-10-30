"""Ports: the only contracts the core depends on. Adapters implement them."""

from __future__ import annotations

from collections.abc import Iterator
from typing import Protocol, runtime_checkable

from backend.core.models import AudioClip, ChatMessage, Transcript


@runtime_checkable
class SpeechToText(Protocol):
    def transcribe(self, audio: AudioClip) -> Transcript:
        """Transcribe speech; per-word items are filled when the engine supports it."""
        ...


@runtime_checkable
class LanguageModel(Protocol):
    def generate(self, messages: list[ChatMessage], *, json_schema: dict | None = None) -> str:
        """Return the full reply. With ``json_schema`` the reply must be JSON matching it."""
        ...

    def stream(self, messages: list[ChatMessage]) -> Iterator[str]:
        """Yield the reply in text chunks as they are produced."""
        ...

    def count_tokens(self, text: str) -> int:
        """Token count. An approximation is allowed (adapters document how it is computed)."""
        ...


@runtime_checkable
class TextToSpeech(Protocol):
    def synthesize(self, text: str, *, voice: str | None = None, speed: float = 1.0) -> AudioClip:
        """Speak ``text``; ``voice=None`` uses the adapter's configured default."""
        ...
