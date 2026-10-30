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


# --- study items (words and phrases the user listens to or explains) ---------------------------


def test_store_satisfies_study_port(store):
    from backend.core.ports import StudyStore
    assert isinstance(store, StudyStore)


def test_study_item_round_trip(store):
    sid = store.create_session("emma")
    mid = store.append_message(sid, "assistant", "Hello, world!")
    item = store.save_study_item("world", "Hello, world!", sid, mid)
    assert (item.text, item.source_text, item.session_id, item.message_id) == (
        "world", "Hello, world!", sid, mid)
    assert item.listen_count == 1 and item.examples == [] and item.explanation == ""
    assert store.list_study_items() == [item]
    assert store.get_study_item(item.id) == item


def test_study_save_again_counts_and_keeps_explanation(store):
    sid = store.create_session("emma")
    mid = store.append_message(sid, "assistant", "Hello, world!")
    first = store.save_study_item("world", "Hello, world!", sid, mid,
                                  translation="mundo", explanation="Planeta.", examples=["Hi."])
    again = store.save_study_item("World", "Hello, world!", sid, mid)  # same word, other case
    assert again.id == first.id and again.listen_count == 2
    assert (again.translation, again.explanation, again.examples) == ("mundo", "Planeta.", ["Hi."])
    other = store.save_study_item("world", "A new world.", sid, None)  # other source = other item
    assert other.id != first.id
    assert len(store.list_study_items()) == 2


def test_study_update_and_unknown(store):
    item = store.save_study_item("hello", "Hello there", None, None)
    out = store.update_study_item(item.id, "hola", "Un saludo.", ["Hello!", "Hello again."])
    assert (out.translation, out.explanation, out.examples) == (
        "hola", "Un saludo.", ["Hello!", "Hello again."])
    with pytest.raises(ValueError):
        store.update_study_item(999, "x", "y", [])
    with pytest.raises(ValueError):
        store.get_study_item(999)


def test_study_list_newest_first_and_persists(tmp_path):
    path = str(tmp_path / "s.db")
    s = SQLiteStore(path=path)
    a = s.save_study_item("one", "one two", None, None)
    b = s.save_study_item("two", "one two", None, None)
    s.save_study_item("one", "one two", None, None)  # touching moves it to the top
    assert [i.id for i in s.list_study_items()] == [a.id, b.id]
    s.close()
    s2 = SQLiteStore(path=path)
    assert [i.text for i in s2.list_study_items()] == ["one", "two"]
    s2.close()


# --- roles, deleting sessions and study items --------------------------------------------------

def test_session_role_is_stored_trimmed_and_blank_means_none(store):
    a = store.create_session("emma", role="  waiter at a restaurant ")
    b = store.create_session("emma", role="   ")
    c = store.create_session("emma")
    roles = {s.id: s.role for s in store.list_sessions()}
    assert roles == {a: "waiter at a restaurant", b: None, c: None}


def test_delete_session_removes_messages_and_detaches_study_items(store):
    sid = store.create_session("emma")
    other = store.create_session("emma")
    mid = store.append_message(sid, "assistant", "hello there")
    store.append_message(other, "user", "keep me")
    item = store.save_study_item("hello", "hello there", sid, mid)
    store.delete_session(sid)
    assert [s.id for s in store.list_sessions()] == [other]
    assert store.load_messages(sid) == [] and len(store.load_messages(other)) == 1
    kept = store.get_study_item(item.id)
    assert kept.text == "hello" and kept.session_id is None and kept.message_id is None


def test_delete_session_merges_study_items_that_collide_once_detached(store):
    s1, s2 = store.create_session("emma"), store.create_session("emma")
    m1 = store.append_message(s1, "assistant", "good morning")
    m2 = store.append_message(s2, "assistant", "good morning")
    a = store.save_study_item("morning", "good morning", s1, m1)
    b = store.save_study_item("morning", "good morning", s2, m2)
    store.delete_session(s1)
    store.delete_session(s2)  # both detach to the same (word, no message, sentence) key
    items = store.list_study_items()
    assert [(i.text, i.listen_count) for i in items] == [("morning", 2)]
    assert {a.id, b.id} >= {items[0].id}


def test_delete_unknown_session_raises(store):
    import pytest
    with pytest.raises(ValueError):
        store.delete_session(99)


def test_delete_study_item(store):
    item = store.save_study_item("hello", "hello there", None, None)
    store.delete_study_item(item.id)
    assert store.list_study_items() == []
    import pytest
    with pytest.raises(ValueError):
        store.delete_study_item(item.id)
