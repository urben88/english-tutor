"""Config loading. Pure data: no knowledge of concrete adapters."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

PORT_NAMES = ("stt", "llm", "tts", "store")
# Ports that may be omitted from config.yaml (older configs): name -> (adapter, params).
OPTIONAL_PORTS = {"store": ("sqlite", {})}
DEFAULT_PERSONA = "emma"  # used when config.yaml has no `persona` key
DEFAULT_CONTEXT_MARGIN = 256  # tokens reserved on top of num_predict (config: context_margin)


@dataclass(frozen=True)
class AdapterSelection:
    adapter: str
    params: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class AppConfig:
    stt: AdapterSelection
    llm: AdapterSelection
    tts: AdapterSelection
    store: AdapterSelection
    persona: str = DEFAULT_PERSONA  # stem of personas/<stem>.yaml
    context_margin: int = DEFAULT_CONTEXT_MARGIN


def parse_config(data: dict[str, Any]) -> AppConfig:
    selections = {}
    for port in PORT_NAMES:
        section = data.get(port)
        if section is None and port in OPTIONAL_PORTS:
            name, params = OPTIONAL_PORTS[port]
            selections[port] = AdapterSelection(name, dict(params))
            continue
        if not isinstance(section, dict) or "adapter" not in section:
            raise ValueError(f"config: section '{port}' must define an 'adapter' name")
        selections[port] = AdapterSelection(section["adapter"], dict(section.get("params") or {}))
    persona = data.get("persona", DEFAULT_PERSONA)
    if not isinstance(persona, str) or not persona:
        raise ValueError("config: 'persona' must be a persona file stem (e.g. emma)")
    margin = data.get("context_margin", DEFAULT_CONTEXT_MARGIN)
    if not isinstance(margin, int) or margin < 0:
        raise ValueError("config: 'context_margin' must be a non-negative integer")
    return AppConfig(**selections, persona=persona, context_margin=margin)


def load_config(path: str | Path = "config.yaml") -> AppConfig:
    with open(path, "r", encoding="utf-8") as f:
        return parse_config(yaml.safe_load(f) or {})
