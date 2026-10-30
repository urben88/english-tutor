"""Ports: the only contracts the core depends on. Adapters implement them."""

from __future__ import annotations

from collections.abc import Iterator
from typing import Protocol, runtime_checkable

from backend.core.models import (
    AudioClip, ChatMessage, SessionInfo, StoredMessage, Summary, Transcript)


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


@runtime_checkable
class ConversationStore(Protocol):
    def create_session(self, persona: str | None = None) -> int:
        """Start a new session and return its id."""
        ...

    def latest_session(self) -> int | None:
        """Id of the most recently active session, or None when there is none (resume)."""
        ...

    def append_message(self, session_id: int, role: str, content: str) -> int:
        """Persist a message and return its id. Unknown session -> ValueError."""
        ...

    def load_messages(self, session_id: int, after_id: int = 0) -> list[StoredMessage]:
        """Messages of the session in order; only those with ``id > after_id``."""
        ...

    def get_summary(self, session_id: int) -> Summary:
        """Running summary; messages with ``id <= summarized_upto`` are already folded in."""
        ...

    def set_summary(self, session_id: int, text: str, summarized_upto: int) -> None:
        """Replace the running summary and the id of the last message it covers."""
        ...

    def list_sessions(self) -> list[SessionInfo]:
        """All sessions, most recently active first."""
        ...
