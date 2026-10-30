"""Ports: the only contracts the core depends on. Adapters implement them."""

from __future__ import annotations

from collections.abc import Iterator
from typing import Protocol, runtime_checkable

from backend.core.models import (
    AudioClip, ChatMessage, SessionInfo, StoredMessage, StudyItem, Summary, Transcript)


@runtime_checkable
class SpeechToText(Protocol):
    def transcribe(self, audio: AudioClip) -> Transcript:
        """Transcribe speech; per-word items are filled when the engine supports it."""
        ...


@runtime_checkable
class LanguageModel(Protocol):
    def generate(self, messages: list[ChatMessage], *, json_schema: dict | None = None,
                 max_tokens: int | None = None) -> str:
        """Return the full reply. With ``json_schema`` the reply must be JSON matching it.
        ``max_tokens`` overrides the adapter's configured reply limit for this call."""
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
    def create_session(self, persona: str | None = None, role: str | None = None) -> int:
        """Start a new session and return its id. ``role`` is an optional free-text topic or
        role-play for the tutor (blank means none)."""
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


@runtime_checkable
class SessionAdmin(Protocol):
    def delete_session(self, session_id: int) -> None:
        """Delete a session and its messages. Study items linked to it are kept but detached
        (session and message link cleared). Unknown session -> ValueError."""
        ...


@runtime_checkable
class SettingsStore(Protocol):
    def load_settings(self) -> dict[str, str]:
        """Stored settings (only keys that were saved)."""
        ...

    def save_settings(self, values: dict[str, str]) -> None:
        """Insert or replace the given settings."""
        ...


@runtime_checkable
class StudyStore(Protocol):
    def save_study_item(self, text: str, source_text: str, session_id: int | None,
                        message_id: int | None, *, translation: str | None = None,
                        explanation: str | None = None,
                        examples: list[str] | None = None) -> StudyItem:
        """Add a word/phrase, or touch the existing one (same text ignoring case, same message
        and sentence): its ``listen_count`` grows. Explanation fields that are not None replace
        the stored ones."""
        ...

    def update_study_item(self, item_id: int, translation: str, explanation: str,
                          examples: list[str]) -> StudyItem:
        """Replace the explanation of an item. Unknown id -> ValueError."""
        ...

    def get_study_item(self, item_id: int) -> StudyItem:
        """Unknown id -> ValueError."""
        ...

    def delete_study_item(self, item_id: int) -> None:
        """Remove an item. Unknown id -> ValueError."""
        ...

    def list_study_items(self) -> list[StudyItem]:
        """All items, most recently touched first."""
        ...
