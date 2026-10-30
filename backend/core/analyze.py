"""Break a sentence into words/chunks with translation, grammar and tense, in Spanish.

Depends only on the LanguageModel port; mirrors ``explain`` (JSON schema + strict validation).
"""

from __future__ import annotations

import json
from dataclasses import dataclass

from backend.core.models import ChatMessage
from backend.core.ports import LanguageModel

MAX_TEXT_CHARS = 1000
MAX_TOKENS = 1536  # the JSON is long (one object per word/chunk); the default reply limit cuts it

ANALYZE_SCHEMA = {
    "type": "object",
    "properties": {
        "structure": {"type": "string"},
        "tokens": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "text": {"type": "string"},
                    "translation": {"type": "string"},
                    "explanation": {"type": "string"},
                    "part_of_speech": {"type": "string"},
                    "tense": {"type": "string"},
                    "notes": {"type": "string"},
                },
                "required": ["text", "translation", "explanation", "part_of_speech", "tense",
                             "notes"],
            },
        },
    },
    "required": ["structure", "tokens"],
}

SYSTEM_PROMPT = (
    "You help a Spanish-speaking learner of English understand how a sentence is built. Split "
    "the sentence, in order, into its words or short chunks (keep phrasal verbs, verb groups "
    "and fixed expressions together). Answer as JSON with: structure (one or two short "
    "sentences in Spanish describing the sentence pattern, e.g. subject + verb + object), and "
    "tokens, a list where each item has: text (the word or chunk exactly as written), "
    "translation (its Spanish translation in this context), explanation (one short sentence in "
    "Spanish about what it is and how it is used here), part_of_speech (in English: noun, verb, "
    "adjective, adverb, pronoun, preposition, conjunction, article, determiner, interjection, "
    "phrase...), tense (the verb tense or form in English, such as \"present simple\" or "
    "\"past perfect\", only for verbs; an empty string otherwise) and notes (extra information "
    "in Spanish such as the pattern, irregular forms or common mistakes; empty if none). Write "
    "translation, explanation, structure and notes in Spanish.")

_NO_TENSE = {"", "none", "null", "n/a", "na", "-", "no aplica", "ninguno"}


class AnalyzeError(ValueError):
    """The model did not return a usable analysis."""


@dataclass(frozen=True)
class TokenInfo:
    text: str
    translation: str
    explanation: str
    part_of_speech: str
    tense: str | None
    notes: str


@dataclass(frozen=True)
class Analysis:
    text: str
    structure: str
    tokens: list[TokenInfo]


def _token(raw: object) -> TokenInfo:
    if not isinstance(raw, dict):
        raise AnalyzeError("the model returned a token that is not an object")
    for key in ("text", "translation", "explanation", "part_of_speech"):
        if not isinstance(raw.get(key), str):
            raise AnalyzeError(f"the model returned a token without a text '{key}'")
    if not raw["text"].strip():
        raise AnalyzeError("the model returned a token with empty text")
    tense = raw.get("tense")
    if tense is not None and not isinstance(tense, str):
        raise AnalyzeError("the model returned a token whose tense is not text")
    notes = raw.get("notes")
    if notes is not None and not isinstance(notes, str):
        raise AnalyzeError("the model returned a token whose notes are not text")
    clean_tense = None if tense is None or tense.strip().lower() in _NO_TENSE else tense.strip()
    return TokenInfo(raw["text"].strip(), raw["translation"], raw["explanation"],
                     raw["part_of_speech"], clean_tense, notes or "")


def analyze(llm: LanguageModel, text: str) -> Analysis:
    raw = llm.generate(
        [ChatMessage("system", SYSTEM_PROMPT), ChatMessage("user", f"Sentence: {text}")],
        json_schema=ANALYZE_SCHEMA, max_tokens=MAX_TOKENS)
    try:
        data = json.loads(raw)
    except (TypeError, ValueError) as e:
        raise AnalyzeError("the model returned invalid JSON") from e
    if (not isinstance(data, dict) or not isinstance(data.get("structure"), str)
            or not isinstance(data.get("tokens"), list) or not data["tokens"]):
        raise AnalyzeError("the model returned JSON without a structure and a list of tokens")
    return Analysis(text, data["structure"], [_token(t) for t in data["tokens"]])
