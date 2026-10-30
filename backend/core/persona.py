"""Persona loading: one YAML file per persona in ``personas/``. Pure, no adapters."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import yaml

DEFAULT_DIR = Path("personas")


@dataclass(frozen=True)
class Persona:
    stem: str  # file name without extension; the value used in config.yaml
    name: str
    voice: str  # TTS voice id passed to TextToSpeech.synthesize(voice=...)
    system_prompt: str


def available_personas(directory: str | Path = DEFAULT_DIR) -> list[str]:
    return sorted(p.stem for p in Path(directory).glob("*.yaml"))


def load_persona(stem: str, directory: str | Path = DEFAULT_DIR) -> Persona:
    path = Path(directory) / f"{stem}.yaml"
    if not path.is_file():
        options = ", ".join(available_personas(directory)) or "(none)"
        raise ValueError(f"unknown persona '{stem}'. Available personas: {options}")
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    for key in ("name", "voice", "system_prompt"):
        if not isinstance(data.get(key), str) or not data[key].strip():
            raise ValueError(f"persona '{stem}': missing or empty '{key}' in {path}")
    return Persona(stem, data["name"], data["voice"], data["system_prompt"].strip())
