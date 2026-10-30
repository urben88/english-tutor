import pytest

from backend.adapters import registry
from backend.adapters.store.sqlite import SQLiteStore
from backend.core.config import AdapterSelection
from backend.core.ports import ConversationStore


@pytest.fixture
def store(tmp_path):
    s = SQLiteStore(path=str(tmp_path / "h.db"))
    yield s
    s.close()


def test_satisfies_port(store):
    assert isinstance(store, ConversationStore)


def test_round_trip_messages(store):
    sid = store.create_session("emma")
    a = store.append_message(sid, "user", "hello")
    b = store.append_message(sid, "assistant", "hi there")
    msgs = store.load_messages(sid)
    assert [(m.id, m.role, m.content) for m in msgs] == [
        (a, "user", "hello"), (b, "assistant", "hi there")]
    assert [m.id for m in store.load_messages(sid, after_id=a)] == [b]


def test_resume_latest_and_none_when_empty(store):
    assert store.latest_session() is None
    s1 = store.create_session("emma")
    s2 = store.create_session("emma")
    assert store.latest_session() == s2
    store.append_message(s1, "user", "touch")  # activity makes s1 the latest
    assert store.latest_session() == s1


def test_persists_across_reopen(tmp_path):
    path = str(tmp_path / "h.db")
    s = SQLiteStore(path=path)
    sid = s.create_session("emma")
    s.append_message(sid, "user", "x")
    s.close()
    s2 = SQLiteStore(path=path)
    assert s2.latest_session() == sid and len(s2.load_messages(sid)) == 1
    s2.close()


def test_summary_get_set(store):
    sid = store.create_session("emma")
    first = store.get_summary(sid)
    assert (first.text, first.summarized_upto) == ("", 0)
    m = store.append_message(sid, "user", "x")
    store.set_summary(sid, "we talked", m)
    got = store.get_summary(sid)
    assert (got.text, got.summarized_upto) == ("we talked", m)


def test_sessions_are_isolated_and_listed(store):
    s1 = store.create_session("emma")
    s2 = store.create_session("bob")
    store.append_message(s1, "user", "a")
    store.append_message(s1, "assistant", "b")
    assert store.load_messages(s2) == []
    listed = {i.id: i for i in store.list_sessions()}
    assert listed[s1].message_count == 2 and listed[s2].persona == "bob"
    assert [i.id for i in store.list_sessions()][0] == s1  # most recent first


def test_unknown_session_errors(store):
    with pytest.raises(ValueError):
        store.append_message(999, "user", "x")


def test_registry_builds_store(tmp_path):
    s = registry.build("store", AdapterSelection("sqlite", {"path": str(tmp_path / "r.db")}))
    assert isinstance(s, SQLiteStore)
    s.close()


def test_registry_unknown_store_lists_options():
    with pytest.raises(ValueError) as e:
        registry.build("store", AdapterSelection("nope"))
    assert "nope" in str(e.value) and "sqlite" in str(e.value)


def test_usable_from_another_thread(store):
    import threading
    sid = store.create_session("emma")
    out = {}

    def work():
        try:
            store.append_message(sid, "user", "from thread")
            out["n"] = len(store.load_messages(sid))
        except Exception as e:  # noqa: BLE001
            out["err"] = e

    t = threading.Thread(target=work)
    t.start()
    t.join()
    assert out == {"n": 1}
