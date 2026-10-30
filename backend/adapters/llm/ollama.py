"""Language-model adapter for the native Ollama HTTP API (``/api/chat``).

The adapter shares Ollama's loaded model with other tools: before each request it asks
``/api/ps``; if the model is already loaded, the request reuses that instance's context
window (so Ollama never reloads it) and never shortens its lifetime.
"""

from __future__ import annotations

import json
import math
import re
from collections.abc import Iterator
from datetime import datetime, timezone

import httpx

from backend.core.models import ChatMessage

_FOREVER_SECONDS = 365 * 24 * 3600  # a loaded model expiring later than this counts as pinned
_UNITS = {"ms": 0.001, "s": 1, "m": 60, "h": 3600}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _same_model(a: str, b: str) -> bool:
    def norm(name: str) -> str:
        return name if ":" in name.rsplit("/", 1)[-1] else name + ":latest"
    return norm(a) == norm(b)


def _parse_expiry(value: str) -> datetime:
    """ISO-8601 with up to nanosecond precision (Go's RFC3339Nano) -> aware datetime."""
    value = re.sub(r"(\.\d{6})\d+", r"\1", value.strip().replace("Z", "+00:00"))
    parsed = datetime.fromisoformat(value)
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def keep_alive_seconds(value: int | float | str) -> float:
    """Ollama keep_alive (``300``, ``"5m"``, ``"1h30m"``, ``-1``) -> seconds; negative = forever."""
    if isinstance(value, (int, float)):
        return float(value) if value >= 0 else math.inf
    text = str(value).strip()
    if re.fullmatch(r"-?\d+(\.\d+)?", text):
        return float(text) if float(text) >= 0 else math.inf
    if text.startswith("-"):
        return math.inf
    parts = re.findall(r"(\d+(?:\.\d+)?)(ms|s|m|h)", text)
    if not parts or "".join(n + u for n, u in parts) != text:
        raise ValueError(f"invalid keep_alive: {value!r}")
    return sum(float(n) * _UNITS[u] for n, u in parts)


class OllamaLLM:
    def __init__(self, model: str, base_url: str = "http://localhost:11434",
                 num_ctx: int = 4096, temperature: float = 0.7, num_predict: int = 256,
                 think: bool = False, timeout: float = 120.0,
                 keep_alive: int | float | str | None = None) -> None:
        self._model = model
        self._think = think
        self._base = base_url.rstrip("/")
        self._url = self._base + "/api/chat"
        self._num_ctx = num_ctx
        self._keep_alive = keep_alive
        if keep_alive is not None:
            keep_alive_seconds(keep_alive)  # fail early on a malformed value
        self._options = {"num_ctx": num_ctx, "temperature": temperature,
                         "num_predict": num_predict}
        self._client = httpx.Client(timeout=timeout)

    def _loaded(self) -> dict | None:
        """The ``/api/ps`` entry of the configured model, or None (not loaded / unreachable)."""
        try:
            resp = self._client.get(self._base + "/api/ps")
            resp.raise_for_status()
            for entry in resp.json().get("models", []):
                if _same_model(self._model, entry.get("model") or entry.get("name") or ""):
                    return entry
        except (httpx.HTTPError, ValueError, AttributeError):
            pass
        return None

    @staticmethod
    def _loaded_context(entry: dict | None) -> int | None:
        ctx = (entry or {}).get("context_length")
        return int(ctx) if isinstance(ctx, int) and ctx > 0 else None

    def context_size(self) -> int:
        """Effective context window: the loaded instance's, else the configured ``num_ctx``."""
        return self._loaded_context(self._loaded()) or self._num_ctx

    def _keep_alive_for(self, entry: dict | None) -> int | float | str | None:
        """Configured keep_alive, raised when the loaded instance would otherwise expire later."""
        if entry is None:
            return self._keep_alive
        remaining = 0.0
        try:
            remaining = (_parse_expiry(entry["expires_at"]) - _now()).total_seconds()
        except (KeyError, TypeError, ValueError, OverflowError):
            pass
        if remaining > _FOREVER_SECONDS:
            return -1
        configured = None if self._keep_alive is None else keep_alive_seconds(self._keep_alive)
        if configured is not None and configured >= max(remaining, 0):
            return self._keep_alive
        return max(int(math.ceil(remaining)), 1) if remaining > 0 else self._keep_alive

    def _payload(self, messages: list[ChatMessage], stream: bool, schema: dict | None,
                 max_tokens: int | None = None) -> dict:
        entry = self._loaded()
        options = dict(self._options)
        if max_tokens:
            options["num_predict"] = max_tokens
        if (ctx := self._loaded_context(entry)) is not None:
            options["num_ctx"] = ctx
        payload = {
            "model": self._model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "stream": stream,
            "think": self._think,  # thinking tokens would eat num_predict and add latency
            "options": options,
        }
        keep_alive = self._keep_alive_for(entry)
        if keep_alive is not None:
            payload["keep_alive"] = keep_alive
        if schema is not None:
            payload["format"] = schema  # Ollama accepts a JSON schema here (or "json")
        return payload

    def generate(self, messages: list[ChatMessage], *, json_schema: dict | None = None,
                 max_tokens: int | None = None) -> str:
        resp = self._client.post(
            self._url, json=self._payload(messages, False, json_schema, max_tokens))
        resp.raise_for_status()
        return resp.json()["message"]["content"]

    def stream(self, messages: list[ChatMessage]) -> Iterator[str]:
        with self._client.stream("POST", self._url,
                                 json=self._payload(messages, True, None)) as resp:
            resp.raise_for_status()
            for line in resp.iter_lines():
                if not line:
                    continue
                data = json.loads(line)
                if chunk := data.get("message", {}).get("content"):
                    yield chunk
                if data.get("done"):
                    break

    def count_tokens(self, text: str) -> int:
        """Approximation: about 4 characters per token for English text."""
        return math.ceil(len(text) / 4) if text else 0
