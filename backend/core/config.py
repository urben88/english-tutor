"""Config loading. Pure data: no knowledge of concrete adapters."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

PORT_NAMES = ("stt", "llm", "tts")


@dataclass(frozen=True)
class AdapterSelection:
    adapter: str
    params: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class AppConfig:
    stt: AdapterSelection
    llm: AdapterSelection
    tts: AdapterSelection


def parse_config(data: dict[str, Any]) -> AppConfig:
    selections = {}
    for port in PORT_NAMES:
        section = data.get(port)
        if not isinstance(section, dict) or "adapter" not in section:
            raise ValueError(f"config: section '{port}' must define an 'adapter' name")
        selections[port] = AdapterSelection(section["adapter"], dict(section.get("params") or {}))
    return AppConfig(**selections)


def load_config(path: str | Path = "config.yaml") -> AppConfig:
    with open(path, "r", encoding="utf-8") as f:
        return parse_config(yaml.safe_load(f) or {})
