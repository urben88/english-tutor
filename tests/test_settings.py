"""Settings (answer length, context budget) and the bounded LangGraph context."""

import json

import httpx
import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend.adapters.llm.ollama import OllamaLLM
from backend.adapters.store.sqlite import SQLiteStore
from backend.api.app import Services, create_app
from backend.core.context import ContextBudget
from backend.core.models import AudioClip, ChatMessage, Transcript
from backend.core.persona import Persona
from backend.core.settings import Settings
from backend.graph.turn import TurnRunner

PERSONA = Persona("p", "P", "F2", "SYS")


class FakeLLM:
    def __init__(self):
        self.replies = []  # (messages, max_tokens)
        self.summaries = []

    def generate(self, messages, *, json_schema=None, max_tokens=None):
        if "summar" in messages[0].content.lower():
            self.summaries.append(messages)
            return "SUMMARY NEW"
        self.replies.append((messages, max_tokens))
        return "reply here"

    def stream(self, messages):
        yield "x"

    def count_tokens(self, text):
        return len(text.split())


class FakeTTS:
    def synthesize(self, text, *, voice=None, speed=1.0):
        return AudioClip(np.zeros(10, dtype=np.float32), 16000)


class FakeSTT:
    def transcribe(self, audio):
        return Transcript("heard")


@pytest.fixture
def store(tmp_path):
    s = SQLiteStore(path=str(tmp_path / "s.db"))
    yield s
    s.close()


def runner_for(store, llm, budget, settings=None):
    sid = store.create_session("p")
    return TurnRunner(FakeSTT(), llm, FakeTTS(), store, PERSONA, budget, sid,
                      settings=settings), sid


ROOMY = ContextBudget(num_ctx=1000, num_predict=100, margin=100)


# --- Settings model ------------------------------------------------------------------------------

def test_defaults_are_medium_and_automatic_context():
    s = Settings()
    assert (s.answer_length, s.context_tokens, s.max_tokens) == ("medium", 0, None)


def test_settings_round_trip_through_stored_strings_and_ignore_garbage():
    s = Settings(answer_length="long", context_tokens=2000)
    assert Settings.from_stored(s.to_stored()) == s
    assert Settings.from_stored({"answer_length": "huge", "context_tokens": "abc"}) == Settings()


@pytest.mark.parametrize("kw", [{"answer_length": "huge"}, {"context_tokens": 10},
                                {"context_tokens": -1}, {"context_tokens": 10**7}])
def test_invalid_settings_rejected(kw):
    with pytest.raises(ValueError):
        Settings(**kw).validated()


# --- answer length reaches the prompt and the token limit -----------------------------------------

def test_medium_keeps_the_previous_call_exactly(store):
    llm = FakeLLM()
    runner, _ = runner_for(store, llm, ROOMY)
    runner.run_text("hi")
    messages, max_tokens = llm.replies[0]
    assert messages[0].content == "SYS" and max_tokens is None


@pytest.mark.parametrize("length,tokens,phrase", [("short", 128, "one short sentence"),
                                                  ("long", 512, "ignore the limit")])
def test_answer_length_changes_prompt_and_max_tokens(store, length, tokens, phrase):
    llm = FakeLLM()
    runner, _ = runner_for(store, llm, ROOMY, Settings(answer_length=length))
    runner.run_text("hi")
    messages, max_tokens = llm.replies[0]
    assert messages[0].content.startswith("SYS") and phrase in messages[0].content
    assert max_tokens == tokens


def test_longer_answers_shrink_the_prompt_budget_for_that_turn():
    base = ContextBudget(num_ctx=1000, num_predict=100, margin=100)
    long_budget = Settings(answer_length="long").budget(base)
    assert long_budget.num_predict == 512 and long_budget.available == 1000 - 512 - 100
    assert Settings().budget(base) == base


def test_context_tokens_caps_the_prompt_budget():
    base = ContextBudget(num_ctx=4096, num_predict=256, margin=256)
    assert Settings().budget(base).available == base.available
    assert Settings(context_tokens=1000).budget(base).available == 1000
    assert Settings(context_tokens=99999).budget(base).available == base.available


# --- context window control in the graph ---------------------------------------------------------

def test_long_history_stays_within_budget_and_keeps_the_newest_turns(store):
    llm = FakeLLM()
    budget = ContextBudget(num_ctx=400, num_predict=50, margin=50)  # 300 prompt tokens
    runner, sid = runner_for(store, llm, budget)
    for i in range(40):
        runner.run_text(f"turn {i} " + "word " * 20)
    for messages, _ in llm.replies:
        assert sum(len(m.content.split()) for m in messages) <= budget.available
    last = llm.replies[-1][0]
    assert last[-1].content.startswith("turn 39")
    assert any(m.content == "reply here" for m in last[:-1])  # newest assistant turn kept
    assert any(m.content.startswith("turn 38") for m in last)  # newest previous user turn kept
    summary = store.get_summary(sid)
    assert summary.text == "SUMMARY NEW" and summary.summarized_upto > 0


def test_user_context_cap_is_respected_by_the_graph(store):
    llm = FakeLLM()
    capped = Settings(context_tokens=256)
    runner, _ = runner_for(store, llm, ROOMY, capped)  # window allows 800, setting allows 256
    for i in range(30):
        runner.run_text(f"turn {i} " + "word " * 20)
    for messages, _ in llm.replies:
        assert sum(len(m.content.split()) for m in messages) <= 256
    assert llm.replies[-1][0][-1].content.startswith("turn 29")


def test_summary_is_cached_and_reused_not_recomputed(store):
    llm = FakeLLM()
    budget = ContextBudget(num_ctx=400, num_predict=50, margin=50)
    runner, sid = runner_for(store, llm, budget)
    for i in range(25):
        runner.run_text(f"turn {i} " + "word " * 20)
    before = len(llm.summaries)
    assert before > 0
    marker = store.get_summary(sid).summarized_upto
    runner2 = TurnRunner(FakeSTT(), llm, FakeTTS(), store, PERSONA, ROOMY, sid)
    runner2.run_text("hi")  # roomy window: nothing new to fold, the stored summary is reused
    assert len(llm.summaries) == before
    assert store.get_summary(sid).summarized_upto == marker
    assert any("SUMMARY NEW" in m.content for m in llm.replies[-1][0])


def test_summarizer_input_is_chunked_to_fit_the_window(store):
    # a long history that was never summarized (e.g. an old database) must not overflow
    sid = store.create_session("p")
    for i in range(30):
        store.append_message(sid, "user" if i % 2 == 0 else "assistant", "w " * 30)
    llm = FakeLLM()
    budget = ContextBudget(num_ctx=700, num_predict=100, margin=100)  # available 500
    TurnRunner(FakeSTT(), llm, FakeTTS(), store, PERSONA, budget, sid).run_text("hello")
    assert len(llm.summaries) > 1
    for call in llm.summaries:
        assert sum(len(m.content.split()) for m in call) <= budget.available
    assert store.get_summary(sid).summarized_upto > 0


# --- API -------------------------------------------------------------------------------------------

@pytest.fixture
def api(store):
    llm = FakeLLM()
    svc = Services(FakeSTT(), llm, FakeTTS(), store, PERSONA, ROOMY)
    return TestClient(create_app(svc, static_dir=None)), llm, store


def test_get_settings_defaults(api):
    client, _, _ = api
    assert client.get("/api/settings").json() == {"answer_length": "medium", "context_tokens": 0}


def test_put_settings_persists_partially(api):
    client, _, store = api
    r = client.put("/api/settings", json={"answer_length": "long"})
    assert r.json() == {"answer_length": "long", "context_tokens": 0}
    r = client.put("/api/settings", json={"context_tokens": 2048})
    assert r.json() == {"answer_length": "long", "context_tokens": 2048}
    assert client.get("/api/settings").json() == r.json()
    assert store.load_settings() == {"answer_length": "long", "context_tokens": "2048"}


@pytest.mark.parametrize("body", [{"answer_length": "huge"}, {"context_tokens": 5},
                                  {"context_tokens": -3}])
def test_put_invalid_settings_400_and_nothing_saved(api, body):
    client, _, store = api
    assert client.put("/api/settings", json=body).status_code == 400
    assert store.load_settings() == {}


def test_turns_use_the_saved_settings(api):
    client, llm, _ = api
    client.put("/api/settings", json={"answer_length": "short"})
    sid = client.post("/api/sessions").json()["id"]
    client.post(f"/api/sessions/{sid}/turn/text", json={"text": "hi"})
    messages, max_tokens = llm.replies[-1]
    assert "one short sentence" in messages[0].content and max_tokens == 128


# --- Ollama adapter ----------------------------------------------------------------------------------

def _num_predict(**kw):
    sent = []

    def handler(request):
        sent.append(json.loads(request.content))
        return httpx.Response(200, json={"message": {"role": "assistant", "content": "ok"}})

    llm = OllamaLLM(model="m", num_predict=256)
    llm._client = httpx.Client(transport=httpx.MockTransport(handler))
    llm.generate([ChatMessage("user", "hi")], **kw)
    return sent[0]["options"]["num_predict"]


def test_ollama_max_tokens_overrides_num_predict_only_when_given():
    assert _num_predict() == 256
    assert _num_predict(max_tokens=512) == 512
