"""Sentence splitting for streaming replies (pure, no third-party imports).

The LLM streams text in small chunks. This module turns that stream into speech-sized
pieces: the first piece is released at the first sentence boundary (so the first audio
starts as early as possible), later pieces wait until they hold ``min_chars`` characters
(so the speech pipeline never runs dry while playback is behind), and an overly long
piece without a boundary is cut at the last space.
"""

from __future__ import annotations

from collections.abc import Iterable, Iterator

_TERMINATORS = ".!?\u2026"


def _boundary_end(text: str, start: int = 0) -> int | None:
    """Index just past the first boundary at or after ``start``, or None.

    A boundary is a sentence terminator followed by whitespace/end of text or a newline.
    A terminator followed by a digit is not a boundary, so "3.5" stays whole. A terminator
    at the very end of the buffer after a digit ("3.") is held back: the next chunk may
    still be the decimal part.
    """
    for i in range(start, len(text)):
        char = text[i]
        if char == "\n":
            return i
        if char not in _TERMINATORS:
            continue
        nxt = text[i + 1] if i + 1 < len(text) else ""
        prev = text[i - 1] if i > 0 else ""
        if not nxt:
            if not prev.isdigit():
                return i + 1
        elif nxt.isspace():
            return i + 1
    return None


def _rest(text: str) -> str:
    return text.lstrip()


def _take(buffer: str, first: bool, min_chars: int, max_chars: int) -> tuple[str, str] | None:
    """Split one piece off ``buffer``: ``(piece, rest)`` or None when it must grow."""
    end = _boundary_end(buffer)
    if end is not None and not first:
        # Later pieces group whole sentences until the piece is worth synthesizing alone.
        while end is not None and len(buffer[:end].strip()) < min_chars:
            end = _boundary_end(buffer, end)
    if end is not None and len(buffer[:end].strip()) <= max_chars:
        return buffer[:end].strip(), _rest(buffer[end:])
    if len(buffer) > max_chars:
        cut = buffer.rfind(" ", 0, max_chars + 1)
        if cut <= 0:
            cut = max_chars
        return buffer[:cut].strip(), _rest(buffer[cut:])
    return None


def iter_sentences(chunks: Iterable[str], *, min_chars: int = 60,
                   max_chars: int = 240) -> Iterator[str]:
    """Yield speech-ready pieces from a stream of text chunks, in order."""
    buffer = ""
    first = True
    for chunk in chunks:
        if not chunk:
            continue
        buffer += chunk
        while True:
            piece = _take(buffer, first, min_chars, max_chars)
            if piece is None:
                break
            text, buffer = piece
            if text:
                yield text
                first = False
    remainder = buffer.strip()
    if remainder:
        yield remainder
