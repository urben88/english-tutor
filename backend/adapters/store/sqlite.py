"""SQLite conversation store (stdlib ``sqlite3``).

Schema: ``sessions`` holds the running summary and ``summarized_upto`` (id of the last
message folded into it); ``messages`` ids are global and monotonic, so a context policy can
select unsummarized turns with ``load_messages(sid, after_id=summarized_upto)``.
"""

from __future__ import annotations

import json
import sqlite3
import time
from pathlib import Path

from backend.core.models import SessionInfo, StoredMessage, StudyItem, Summary

_SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    persona TEXT,
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    summarized_upto INTEGER NOT NULL DEFAULT 0,
    role TEXT
);
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id),
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, id);
CREATE TABLE IF NOT EXISTS study_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    text_key TEXT NOT NULL,
    source_text TEXT NOT NULL DEFAULT '',
    session_id INTEGER,
    message_id INTEGER NOT NULL DEFAULT 0,
    translation TEXT NOT NULL DEFAULT '',
    explanation TEXT NOT NULL DEFAULT '',
    examples TEXT NOT NULL DEFAULT '[]',
    listen_count INTEGER NOT NULL DEFAULT 1,
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_study_key ON study_items(text_key, message_id, source_text);
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""

# Columns added after the first release. Existing databases get them with a guarded
# ALTER TABLE ADD COLUMN (nothing is dropped or rewritten): (table, column, definition).
_ADDED_COLUMNS = (("sessions", "role", "TEXT"),)

_STUDY_COLS = ("id, text, source_text, session_id, message_id, translation, explanation, "
               "examples, listen_count, created_at, updated_at")


def _study_item(r) -> StudyItem:
    return StudyItem(r[0], r[1], r[2], r[3], r[4] or None, r[5], r[6], json.loads(r[7]),
                     r[8], r[9], r[10])


class SQLiteStore:
    def __init__(self, path: str = "data/history.db") -> None:
        if path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        # check_same_thread=False: the web API calls from worker threads (it holds one lock)
        self._db = sqlite3.connect(path, check_same_thread=False)
        self._db.executescript(_SCHEMA)
        self._migrate()

    def _migrate(self) -> None:
        """Non-destructive upgrade of a database created by an older version."""
        for table, column, definition in _ADDED_COLUMNS:
            have = {row[1] for row in self._db.execute(f"PRAGMA table_info({table})")}
            if column not in have:
                with self._db:
                    self._db.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")

    def close(self) -> None:
        self._db.close()

    def _require_session(self, session_id: int) -> None:
        row = self._db.execute("SELECT 1 FROM sessions WHERE id = ?", (session_id,)).fetchone()
        if row is None:
            raise ValueError(f"unknown session id {session_id}")

    def create_session(self, persona: str | None = None, role: str | None = None) -> int:
        now = time.time()
        with self._db:
            cur = self._db.execute(
                "INSERT INTO sessions (persona, created_at, updated_at, role) VALUES (?, ?, ?, ?)",
                (persona, now, now, (role or "").strip() or None))
        return int(cur.lastrowid)

    def delete_session(self, session_id: int) -> None:
        """Delete the session and its messages. Study items stay, detached from it: their
        session and message link are cleared. An item that would then duplicate an existing
        detached one (same word and sentence) is merged into it."""
        self._require_session(session_id)
        with self._db:
            rows = self._db.execute(
                "SELECT id, text_key, source_text, listen_count FROM study_items "
                "WHERE session_id = ? OR message_id IN "
                "(SELECT id FROM messages WHERE session_id = ?)",
                (session_id, session_id)).fetchall()
            for item_id, key, source, count in rows:
                twin = self._db.execute(
                    "SELECT id FROM study_items WHERE text_key = ? AND message_id = 0 "
                    "AND source_text = ? AND id != ?", (key, source, item_id)).fetchone()
                if twin is None:
                    self._db.execute(
                        "UPDATE study_items SET session_id = NULL, message_id = 0 WHERE id = ?",
                        (item_id,))
                else:
                    self._db.execute(
                        "UPDATE study_items SET listen_count = listen_count + ? WHERE id = ?",
                        (count, twin[0]))
                    self._db.execute("DELETE FROM study_items WHERE id = ?", (item_id,))
            self._db.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
            self._db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))

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
            "SELECT s.id, s.persona, s.created_at, s.updated_at, COUNT(m.id), s.role "
            "FROM sessions s LEFT JOIN messages m ON m.session_id = s.id "
            "GROUP BY s.id ORDER BY s.updated_at DESC, s.id DESC").fetchall()
        return [SessionInfo(*r) for r in rows]

    # --- study items ---------------------------------------------------------------------------

    def save_study_item(self, text: str, source_text: str, session_id: int | None,
                        message_id: int | None, *, translation: str | None = None,
                        explanation: str | None = None,
                        examples: list[str] | None = None) -> StudyItem:
        key, mid, now = text.strip().lower(), message_id or 0, time.time()
        row = self._db.execute(
            "SELECT id FROM study_items WHERE text_key = ? AND message_id = ? AND source_text = ?",
            (key, mid, source_text)).fetchone()
        with self._db:
            if row is None:
                cur = self._db.execute(
                    "INSERT INTO study_items (text, text_key, source_text, session_id, message_id, "
                    "translation, explanation, examples, created_at, updated_at) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (text.strip(), key, source_text, session_id, mid, translation or "",
                     explanation or "", json.dumps(examples or []), now, now))
                item_id = int(cur.lastrowid)
            else:
                item_id = int(row[0])
                self._db.execute(
                    "UPDATE study_items SET listen_count = listen_count + 1, updated_at = ?, "
                    "translation = COALESCE(?, translation), explanation = COALESCE(?, explanation), "
                    "examples = COALESCE(?, examples) WHERE id = ?",
                    (now, translation, explanation,
                     None if examples is None else json.dumps(examples), item_id))
        return self.get_study_item(item_id)

    def update_study_item(self, item_id: int, translation: str, explanation: str,
                          examples: list[str]) -> StudyItem:
        self.get_study_item(item_id)
        with self._db:
            self._db.execute(
                "UPDATE study_items SET translation = ?, explanation = ?, examples = ?, "
                "updated_at = ? WHERE id = ?",
                (translation, explanation, json.dumps(examples), time.time(), item_id))
        return self.get_study_item(item_id)

    def get_study_item(self, item_id: int) -> StudyItem:
        row = self._db.execute(
            f"SELECT {_STUDY_COLS} FROM study_items WHERE id = ?", (item_id,)).fetchone()
        if row is None:
            raise ValueError(f"unknown study item id {item_id}")
        return _study_item(row)

    def delete_study_item(self, item_id: int) -> None:
        self.get_study_item(item_id)
        with self._db:
            self._db.execute("DELETE FROM study_items WHERE id = ?", (item_id,))

    def list_study_items(self) -> list[StudyItem]:
        rows = self._db.execute(
            f"SELECT {_STUDY_COLS} FROM study_items ORDER BY updated_at DESC, id DESC").fetchall()
        return [_study_item(r) for r in rows]

    # --- settings ------------------------------------------------------------------------------

    def load_settings(self) -> dict[str, str]:
        return {k: v for k, v in self._db.execute("SELECT key, value FROM settings")}

    def save_settings(self, values: dict[str, str]) -> None:
        with self._db:
            self._db.executemany(
                "INSERT INTO settings (key, value) VALUES (?, ?) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value", list(values.items()))
