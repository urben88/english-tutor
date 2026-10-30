"""User settings that shape the tutor's replies. Pure, no adapters.

``answer_length`` changes the tutor prompt and the reply token limit; ``context_tokens`` caps
the prompt (system + role + summary + recent turns + the new message). ``medium`` and ``0``
(automatic) are the defaults and change nothing compared with the plain persona.
"""

from __future__ import annotations

from dataclasses import dataclass, replace

from backend.core.context import ContextBudget

ANSWER_LENGTHS = ("short", "medium", "long")
# Reply token limit per length; None keeps the adapter's configured limit (config.yaml).
MAX_TOKENS = {"short": 128, "medium": None, "long": 512}
CONTEXT_MIN, CONTEXT_MAX = 256, 131072  # context_tokens range (0 = automatic)


@dataclass(frozen=True)
class Settings:
    answer_length: str = "medium"
    context_tokens: int = 0  # 0 = automatic: the model window minus the reply and a margin

    @property
    def max_tokens(self) -> int | None:
        return MAX_TOKENS.get(self.answer_length)

    def validated(self) -> "Settings":
        if self.answer_length not in ANSWER_LENGTHS:
            raise ValueError(f"answer_length must be one of: {', '.join(ANSWER_LENGTHS)}")
        if self.context_tokens != 0 and not CONTEXT_MIN <= self.context_tokens <= CONTEXT_MAX:
            raise ValueError(
                f"context_tokens must be 0 (automatic) or between {CONTEXT_MIN} and {CONTEXT_MAX}")
        return self

    def budget(self, base: ContextBudget) -> ContextBudget:
        """The prompt budget for one turn: the reply limit of this answer length, then the cap."""
        out = replace(base, num_predict=self.max_tokens) if self.max_tokens else base
        if self.context_tokens:
            out = replace(out, max_prompt=self.context_tokens)
        return out

    def to_stored(self) -> dict[str, str]:
        return {"answer_length": self.answer_length, "context_tokens": str(self.context_tokens)}

    @classmethod
    def from_stored(cls, values: dict[str, str]) -> "Settings":
        """Lenient: a missing or damaged stored value falls back to its default."""
        default = cls()

        def field(name: str, parse):
            try:
                return getattr(cls(**{name: parse(values[name])}).validated(), name)
            except (KeyError, TypeError, ValueError):
                return getattr(default, name)

        return cls(field("answer_length", str), field("context_tokens", int))
