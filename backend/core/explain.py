"""Explain a word or phrase in context, in Spanish. Depends only on the LanguageModel port."""

from __future__ import annotations

import json
from dataclasses import dataclass

from backend.core.models import ChatMessage
from backend.core.ports import LanguageModel

EXPLAIN_SCHEMA = {
    "type": "object",
    "properties": {
        "translation": {"type": "string"},
        "explanation": {"type": "string"},
        "examples": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["translation", "explanation", "examples"],
}

SYSTEM_PROMPT = (
    "You help a Spanish-speaking learner of English. Given a word or phrase and the message it "
    "appeared in, answer as JSON with: translation (the Spanish translation for this context), "
    "explanation (1-2 short sentences in Spanish about its meaning and use here), and examples "
    "(2 short English sentences using it). Write translation and explanation in Spanish.")


class ExplainError(ValueError):
    """The model did not return a usable explanation."""


@dataclass(frozen=True)
class Explanation:
    text: str
    translation: str
    explanation: str
    examples: list[str]


def explain(llm: LanguageModel, text: str, context: str) -> Explanation:
    raw = llm.generate(
        [ChatMessage("system", SYSTEM_PROMPT),
         ChatMessage("user", f"Word or phrase: {text}\nMessage: {context}")],
        json_schema=EXPLAIN_SCHEMA)
    try:
        data = json.loads(raw)
    except (TypeError, ValueError) as e:
        raise ExplainError("the model returned invalid JSON") from e
    if (not isinstance(data, dict) or not isinstance(data.get("translation"), str)
            or not isinstance(data.get("explanation"), str)
            or not isinstance(data.get("examples"), list)
            or not all(isinstance(x, str) for x in data["examples"])):
        raise ExplainError("the model returned JSON without translation, explanation and examples")
    return Explanation(text, data["translation"], data["explanation"], list(data["examples"]))
