"""Sentence analysis: POST /api/analyze and the core use case."""

import json

import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend.adapters.store.sqlite import SQLiteStore
from backend.api.app import Services, create_app
from backend.core.analyze import ANALYZE_SCHEMA, AnalyzeError, analyze
from backend.core.context import ContextBudget
from backend.core.models import AudioClip
from backend.core.persona import Persona

GOOD = {
    "structure": "Sujeto + present perfect continuous + lugar.",
    "tokens": [
        {"text": "She", "translation": "ella", "explanation": "Pronombre sujeto.",
         "part_of_speech": "pronoun", "tense": None, "notes": ""},
        {"text": "has been living", "translation": "ha estado viviendo",
         "explanation": "Acción que empezó antes y sigue.", "part_of_speech": "verb",
         "tense": "present perfect continuous", "notes": "have/has + been + -ing"},
    ],
}


class FakeLLM:
    def __init__(self, reply=None):
        self.reply = json.dumps(GOOD) if reply is None else reply
        self.calls = []

    def generate(self, messages, *, json_schema=None, max_tokens=None):
        self.calls.append((messages, json_schema, max_tokens))
        return self.reply

    def stream(self, messages):
        yield "x"

    def count_tokens(self, text):
        return len(text.split())


class FakeTTS:
    def synthesize(self, text, *, voice=None, speed=1.0):
        return AudioClip(np.zeros(10, dtype=np.float32), 16000)


@pytest.fixture
def api(tmp_path):
    store = SQLiteStore(path=str(tmp_path / "a.db"))
    llm = FakeLLM()
    svc = Services(None, llm, FakeTTS(), store, Persona("emma", "Emma", "F2", "SYS"),
                   ContextBudget(1000, 100, 100))
    yield TestClient(create_app(svc, static_dir=None)), llm
    store.close()


def test_analyze_returns_structure_and_tokens(api):
    client, llm = api
    r = client.post("/api/analyze", json={"text": " She has been living here. ", "message_id": 7})
    assert r.status_code == 200
    assert r.json() == {"text": "She has been living here.", "message_id": 7, **GOOD}
    messages, schema, max_tokens = llm.calls[0]
    assert schema == ANALYZE_SCHEMA and max_tokens and max_tokens >= 1024
    assert "Spanish" in messages[0].content and "She has been living here." in messages[1].content


def test_analyze_message_id_is_optional(api):
    client, _ = api
    body = client.post("/api/analyze", json={"text": "Hello"}).json()
    assert body["message_id"] is None and body["tokens"][0]["text"] == "She"


def test_analyze_empty_or_huge_text_400(api):
    client, llm = api
    assert client.post("/api/analyze", json={"text": "   "}).status_code == 400
    assert client.post("/api/analyze", json={"text": "a " * 600}).status_code == 400
    assert llm.calls == []


def test_tense_placeholders_become_null_and_notes_default_to_empty():
    reply = {"structure": "s", "tokens": [
        {"text": "a", "translation": "un", "explanation": "e", "part_of_speech": "article",
         "tense": "none"},
        {"text": "b", "translation": "b", "explanation": "e", "part_of_speech": "noun",
         "tense": "", "notes": None},
        {"text": "c", "translation": "c", "explanation": "e", "part_of_speech": "noun",
         "tense": "N/A", "notes": "x"}]}
    result = analyze(FakeLLM(json.dumps(reply)), "a b c")
    assert [t.tense for t in result.tokens] == [None, None, None]
    assert [t.notes for t in result.tokens] == ["", "", "x"]


@pytest.mark.parametrize("bad", [
    "not json",
    json.dumps([]),
    json.dumps({"structure": "s"}),
    json.dumps({"structure": "s", "tokens": []}),
    json.dumps({"structure": 3, "tokens": GOOD["tokens"]}),
    json.dumps({"structure": "s", "tokens": [{"text": "a"}]}),
    json.dumps({"structure": "s", "tokens": [{**GOOD["tokens"][0], "translation": 5}]}),
    json.dumps({"structure": "s", "tokens": [{**GOOD["tokens"][0], "tense": 5}]}),
    json.dumps({"structure": "s", "tokens": [{**GOOD["tokens"][0], "text": " "}]}),
])
def test_unusable_model_output_is_an_error_502(bad, tmp_path):
    with pytest.raises(AnalyzeError):
        analyze(FakeLLM(bad), "x")
    store = SQLiteStore(path=str(tmp_path / "b.db"))
    svc = Services(None, FakeLLM(bad), FakeTTS(), store, Persona("e", "E", "F2", "SYS"),
                   ContextBudget(1000, 100, 100))
    try:
        r = TestClient(create_app(svc, static_dir=None)).post("/api/analyze", json={"text": "x"})
        assert r.status_code == 502
    finally:
        store.close()
