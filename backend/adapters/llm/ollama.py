"""Language-model adapter for the native Ollama HTTP API (``/api/chat``)."""

from __future__ import annotations

import json
import math
from collections.abc import Iterator

import httpx

from backend.core.models import ChatMessage


class OllamaLLM:
    def __init__(self, model: str, base_url: str = "http://localhost:11434",
                 num_ctx: int = 4096, temperature: float = 0.7, num_predict: int = 256,
                 think: bool = False, timeout: float = 120.0) -> None:
        self._model = model
        self._think = think
        self._url = base_url.rstrip("/") + "/api/chat"
        self._options = {"num_ctx": num_ctx, "temperature": temperature,
                         "num_predict": num_predict}
        self._client = httpx.Client(timeout=timeout)

    def _payload(self, messages: list[ChatMessage], stream: bool, schema: dict | None) -> dict:
        payload = {
            "model": self._model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "stream": stream,
            "think": self._think,  # thinking tokens would eat num_predict and add latency
            "options": self._options,
        }
        if schema is not None:
            payload["format"] = schema  # Ollama accepts a JSON schema here (or "json")
        return payload

    def generate(self, messages: list[ChatMessage], *, json_schema: dict | None = None) -> str:
        resp = self._client.post(self._url, json=self._payload(messages, False, json_schema))
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
