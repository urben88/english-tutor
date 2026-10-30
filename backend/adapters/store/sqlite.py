"""SQLite conversation store (stdlib ``sqlite3``).

Schema: ``sessions`` holds the running summary and ``summarized_upto`` (id of the last
message folded into it); ``messages`` ids are global and monotonic, so a context policy can
select unsummarized turns with ``load_messages(sid, after_id=summarized_upto)``.
"""

from __future__ import annotations

import sqlite3
import time
from pathlib import Path

from backend.core.models import SessionInfo, StoredMessage, Summary

_SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    persona TEXT,
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    summarized_upto INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id),
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, id);
"""


class SQLiteStore:
    def __init__(self, path: str = "data/history.db") -> None:
        if path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        # check_same_thread=False: the web API calls from worker threads (it holds one lock)
        self._db = sqlite3.connect(path, check_same_thread=False)
        self._db.executescript(_SCHEMA)

    def close(self) -> None:
        self._db.close()

    def _require_session(self, session_id: int) -> None:
        row = self._db.execute("SELECT 1 FROM sessions WHERE id = ?", (session_id,)).fetchone()
        if row is None:
            raise ValueError(f"unknown session id {session_id}")

    def create_session(self, persona: str | None = None) -> int:
        now = time.time()
        with self._db:
            cur = self._db.execute(
                "INSERT INTO sessions (persona, created_at, updated_at) VALUES (?, ?, ?)",
                (persona, now, now))
        return int(cur.lastrowid)

    def latest_session(self) -> int | None:
        row = self._db.execute(
            "SELECT id FROM sessions ORDER BY updated_at DESC, id DESC LIMIT 1").fetchone()
        return None if row is None else int(row[0])

    def append_message(self, session_id: int, role: str, content: str) -> int:
        self._require_session(session_id)
        now = time.time()
        with self._db:
            cur = self._db.execute(
                "INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
                (session_id, role, content, now))
            self._db.execute("UPDATE sessions SET updated_at = ? WHERE id = ?", (now, session_id))
        return int(cur.lastrowid)

    def load_messages(self, session_id: int, after_id: int = 0) -> list[StoredMessage]:
        rows = self._db.execute(
            "SELECT id, session_id, role, content FROM messages "
            "WHERE session_id = ? AND id > ? ORDER BY id", (session_id, after_id)).fetchall()
        return [StoredMessage(*r) for r in rows]

    def get_summary(self, session_id: int) -> Summary:
        row = self._db.execute(
            "SELECT summary, summarized_upto FROM sessions WHERE id = ?", (session_id,)).fetchone()
        if row is None:
            raise ValueError(f"unknown session id {session_id}")
        return Summary(row[0], int(row[1]))

    def set_summary(self, session_id: int, text: str, summarized_upto: int) -> None:
        self._require_session(session_id)
        with self._db:
            self._db.execute(
                "UPDATE sessions SET summary = ?, summarized_upto = ? WHERE id = ?",
                (text, summarized_upto, session_id))

    def list_sessions(self) -> list[SessionInfo]:
        rows = self._db.execute(
            "SELECT s.id, s.persona, s.created_at, s.updated_at, COUNT(m.id) "
            "FROM sessions s LEFT JOIN messages m ON m.session_id = s.id "
            "GROUP BY s.id ORDER BY s.updated_at DESC, s.id DESC").fetchall()
        return [SessionInfo(*r) for r in rows]
