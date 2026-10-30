"""Builds the tutor's system prompt for one session. Pure, no adapters."""

from __future__ import annotations

ROLE_TEMPLATE = (
    "\n\nFor this session the learner chose this role or topic to practice: \"{role}\". "
    "Stay in that role or on that topic for the whole conversation, while still keeping the "
    "replies natural and spoken.")

# Appended after the persona prompt; "medium" adds nothing (the persona's own length rules).
LENGTH_NOTES = {
    "short": ("\n\nThe learner prefers very short replies: one short sentence, two at most, "
              "and no follow-up question unless it is really needed."),
    "long": ("\n\nThe learner prefers fuller replies: ignore the limit on reply length above. "
             "Answer in a short paragraph of about four to six spoken sentences, with a concrete "
             "example or explanation when useful, still in plain spoken English with no lists "
             "or markdown."),
}


def compose_system_prompt(base: str, role: str | None = None,
                          answer_length: str = "medium") -> str:
    """Persona prompt, plus the session's role/topic and the answer length when they apply."""
    role = (role or "").strip()
    out = base + ROLE_TEMPLATE.format(role=role) if role else base
    return out + LENGTH_NOTES.get(answer_length, "")
