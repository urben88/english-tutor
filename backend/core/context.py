"""Context policy: decides what goes into the model's window. Pure, no third-party imports.

Prompt = system prompt (always) + running summary (if any) + the most recent unsummarized
turns that fit + the latest user turn (always). Older turns that do not fit are returned in
``ContextPlan.fold`` so the caller can merge them into the running summary.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field, replace
from typing import Any

from backend.core.models import ChatMessage, StoredMessage, Summary

DEFAULT_MARGIN = 256  # tokens kept free for tokenizer error and chat-template overhead
SUMMARY_PREFIX = "Summary of the conversation so far:\n"


@dataclass(frozen=True)
class ContextBudget:
    num_ctx: int
    num_predict: int
    margin: int = DEFAULT_MARGIN

    @property
    def available(self) -> int:
        """Tokens available for the prompt: num_ctx - num_predict - margin."""
        return self.num_ctx - self.num_predict - self.margin

    @classmethod
    def from_params(cls, llm_params: dict[str, Any], margin: int = DEFAULT_MARGIN) -> "ContextBudget":
        """Read num_ctx / num_predict from the llm adapter params in config.yaml."""
        return cls(int(llm_params.get("num_ctx", 4096)),
                   int(llm_params.get("num_predict", 256)), margin)

    @classmethod
    def for_llm(cls, llm: Any, llm_params: dict[str, Any],
                margin: int = DEFAULT_MARGIN) -> "ContextBudget":
        """Like ``from_params``, but follows the adapter's effective context window.

        An adapter that shares a model loaded by another tool may run with a different
        window than configured; it reports it through an optional ``context_size()``.
        """
        budget = cls.from_params(llm_params, margin)
        size = getattr(llm, "context_size", None)
        return replace(budget, num_ctx=int(size())) if callable(size) else budget


@dataclass
class ContextPlan:
    messages: list[ChatMessage]
    fold: list[StoredMessage] = field(default_factory=list)  # oldest turns to summarize


def build_context(system_prompt: str, summary: Summary, history: list[StoredMessage],
                  user_text: str, count_tokens: Callable[[str], int],
                  budget: ContextBudget) -> ContextPlan:
    """``history`` holds only unsummarized messages (id > summary.summarized_upto), oldest first."""
    head = [ChatMessage("system", system_prompt)]
    if summary.text:
        head.append(ChatMessage("system", SUMMARY_PREFIX + summary.text))
    tail = ChatMessage("user", user_text)
    remaining = budget.available - sum(count_tokens(m.content) for m in head + [tail])

    kept = 0  # number of most recent turns that fit
    for msg in reversed(history):
        cost = count_tokens(msg.content)
        if cost > remaining:
            break
        remaining -= cost
        kept += 1
    split = len(history) - kept
    recent = [ChatMessage(m.role, m.content) for m in history[split:]]
    return ContextPlan(head + recent + [tail], list(history[:split]))
