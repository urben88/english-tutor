"""Adapter registry: maps (port, adapter name) to a factory.

Adding a new adapter (for example an API-backed LLM) means: write its module and add one
``_BUILTIN`` line. Imports are lazy so unused adapters never load their heavy libraries.
"""

from __future__ import annotations

from collections.abc import Callable
from importlib import import_module
from typing import Any

from backend.core.config import AdapterSelection, AppConfig
from backend.core.ports import ConversationStore, LanguageModel, SpeechToText, TextToSpeech

Factory = Callable[..., Any]

# port -> adapter name -> "module:attribute" of a class/callable taking **params.
_BUILTIN: dict[str, dict[str, str]] = {
    "stt": {
        "whisper_server": "backend.adapters.stt.whisper_server:WhisperServerSTT",
        "whisper_cpp": "backend.adapters.stt.whisper_cpp:WhisperCppSTT",  # CPU fallback
    },
    "llm": {"ollama": "backend.adapters.llm.ollama:OllamaLLM"},
    "tts": {"supertonic": "backend.adapters.tts.supertonic:SupertonicTTS"},
    "store": {"sqlite": "backend.adapters.store.sqlite:SQLiteStore"},
}

_custom: dict[str, dict[str, Factory]] = {port: {} for port in _BUILTIN}


def _check_port(port: str) -> None:
    if port not in _BUILTIN:
        raise ValueError(f"unknown port '{port}'. Valid ports: {', '.join(_BUILTIN)}")


def register(port: str, name: str, factory: Factory) -> None:
    """Register an extra adapter at runtime (used by tests and plugins)."""
    _check_port(port)
    _custom[port][name] = factory


def unregister(port: str, name: str) -> None:
    _custom.get(port, {}).pop(name, None)


def available(port: str) -> list[str]:
    _check_port(port)
    return sorted(set(_BUILTIN[port]) | set(_custom[port]))


def build(port: str, selection: AdapterSelection) -> Any:
    _check_port(port)
    name = selection.adapter
    if name in _custom[port]:
        factory = _custom[port][name]
    elif name in _BUILTIN[port]:
        module_name, attr = _BUILTIN[port][name].split(":")
        factory = getattr(import_module(module_name), attr)
    else:
        raise ValueError(
            f"unknown {port} adapter '{name}'. Valid options: {', '.join(available(port))}")
    return factory(**selection.params)


def build_stt(config: AppConfig) -> SpeechToText:
    return build("stt", config.stt)


def build_llm(config: AppConfig) -> LanguageModel:
    return build("llm", config.llm)


def build_tts(config: AppConfig) -> TextToSpeech:
    return build("tts", config.tts)


def build_store(config: AppConfig) -> ConversationStore:
    return build("store", config.store)
