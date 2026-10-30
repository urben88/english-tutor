import json

import pytest

from backend.core.explain import EXPLAIN_SCHEMA, ExplainError, explain


class FakeLLM:
    def __init__(self, reply):
        self.reply, self.calls = reply, []

    def generate(self, messages, *, json_schema=None):
        self.calls.append((messages, json_schema))
        return self.reply


GOOD = json.dumps({"translation": "ir a lo seguro", "explanation": "Significa no arriesgarse.",
                   "examples": ["Let's play it safe.", "He plays it safe."]})


def test_parses_spanish_fields_and_passes_schema():
    llm = FakeLLM(GOOD)
    out = explain(llm, "play it safe", "I always play it safe at work.")
    assert out.text == "play it safe"
    assert out.translation == "ir a lo seguro"
    assert out.explanation.startswith("Significa")
    assert out.examples == ["Let's play it safe.", "He plays it safe."]
    messages, schema = llm.calls[0]
    assert schema == EXPLAIN_SCHEMA
    joined = " ".join(m.content for m in messages)
    assert "Spanish" in joined and "play it safe" in joined and "at work" in joined


@pytest.mark.parametrize("reply", ["not json", "[1]", json.dumps({"translation": "x"}),
                                   json.dumps({"translation": "x", "explanation": "y", "examples": "no"})])
def test_invalid_model_output_raises(reply):
    with pytest.raises(ExplainError):
        explain(FakeLLM(reply), "word", "ctx")
