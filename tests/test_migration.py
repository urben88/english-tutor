"""An existing user database (created before roles/settings existed) must keep working."""

import sqlite3

from backend.adapters.store.sqlite import SQLiteStore

# Literal copy of the schema that shipped before study sessions (do not import: it changes).
OLD_SCHEMA = """
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    persona TEXT,
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    summarized_upto INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id),
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at REAL NOT NULL
);
CREATE INDEX idx_messages_session ON messages(session_id, id);
CREATE TABLE study_items (
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
CREATE UNIQUE INDEX idx_study_key ON study_items(text_key, message_id, source_text);
"""


def old_db(path) -> None:
    db = sqlite3.connect(path)
    db.executescript(OLD_SCHEMA)
    db.execute("INSERT INTO sessions (id, persona, created_at, updated_at, summary, summarized_upto)"
               " VALUES (1, 'emma', 1.0, 2.0, 'old summary', 1)")
    db.execute("INSERT INTO messages (id, session_id, role, content, created_at)"
               " VALUES (1, 1, 'user', 'hello', 1.5)")
    db.execute("INSERT INTO messages (id, session_id, role, content, created_at)"
               " VALUES (2, 1, 'assistant', 'hi there', 1.6)")
    db.execute("INSERT INTO study_items (id, text, text_key, source_text, session_id, message_id,"
               " translation, explanation, examples, listen_count, created_at, updated_at)"
               " VALUES (1, 'Hi', 'hi', 'hi there', 1, 2, 'hola', 'saludo', '[\"Hi!\"]', 3, 1.0, 2.0)")
    db.commit()
    db.close()


def test_old_database_keeps_its_data_and_gains_the_new_features(tmp_path):
    path = str(tmp_path / "old.db")
    old_db(path)
    store = SQLiteStore(path=path)
    try:
        # old data survives untouched
        [info] = store.list_sessions()
        assert (info.id, info.persona, info.message_count, info.role) == (1, "emma", 2, None)
        assert [m.content for m in store.load_messages(1)] == ["hello", "hi there"]
        assert store.get_summary(1).text == "old summary"
        item = store.get_study_item(1)
        assert (item.text, item.listen_count, item.message_id, item.examples) == ("Hi", 3, 2, ["Hi!"])
        # new features work on the migrated database
        sid = store.create_session("emma", role="waiter")
        assert {s.id: s.role for s in store.list_sessions()} == {1: None, sid: "waiter"}
        assert store.load_settings() == {}
        store.save_settings({"answer_length": "long"})
        assert store.load_settings() == {"answer_length": "long"}
        store.delete_session(1)
        assert [s.id for s in store.list_sessions()] == [sid]
        kept = store.get_study_item(1)  # the study item outlives its session, detached
        assert kept.text == "Hi" and kept.session_id is None and kept.message_id is None
    finally:
        store.close()


def test_migration_is_idempotent_and_keeps_new_data(tmp_path):
    path = str(tmp_path / "old.db")
    old_db(path)
    SQLiteStore(path=path).close()
    store = SQLiteStore(path=path)  # second open: columns already there, nothing breaks
    sid = store.create_session("emma", role="interview")
    store.close()
    again = SQLiteStore(path=path)
    try:
        assert {s.id: s.role for s in again.list_sessions()}[sid] == "interview"
        assert len(again.load_messages(1)) == 2
    finally:
        again.close()
