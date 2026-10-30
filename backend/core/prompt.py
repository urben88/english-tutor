"""Builds the tutor's system prompt for one session. Pure, no adapters."""

from __future__ import annotations

ROLE_TEMPLATE = (
    "\n\nFor this session the learner chose this role or topic to practice: \"{role}\". "
    "Stay in that role or on that topic for the whole conversation, while still keeping the "
    "replies natural and spoken.")


def compose_system_prompt(base: str, role: str | None = None) -> str:
    """Persona prompt, plus the session's role/topic when there is one."""
    role = (role or "").strip()
    return base + ROLE_TEMPLATE.format(role=role) if role else base
