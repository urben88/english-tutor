"""Core works with fake adapters only, and never imports adapters or model libraries."""

import ast
from collections.abc import Iterator
from pathlib import Path

import numpy as np

from backend.core.models import AudioClip, ChatMessage, Transcript
from backend.core.ports import LanguageModel, SpeechToText, TextToSpeech
from backend.core.usecases import ConversationTurn


class FakeSTT:
    def transcribe(self, audio: AudioClip) -> Transcript:
        return Transcript("hello there")


class FakeLLM:
    def __init__(self):
        self.seen: list[ChatMessage] = []

    def generate(self, messages, *, json_schema=None) -> str:
        self.seen = messages
        return "Hi! How are you?"

    def stream(self, messages) -> Iterator[str]:
        yield from ["Hi!", " How are you?"]

    def count_tokens(self, text: str) -> int:
        return len(text.split())


class FakeTTS:
    def synthesize(self, text, *, voice=None, speed=1.0) -> AudioClip:
        return AudioClip(np.zeros(100, dtype=np.float32), 24000)


def test_fakes_satisfy_ports():
    assert isinstance(FakeSTT(), SpeechToText)
    assert isinstance(FakeLLM(), LanguageModel)
    assert isinstance(FakeTTS(), TextToSpeech)


def test_conversation_turn_uses_only_ports():
    llm = FakeLLM()
    turn = ConversationTurn(FakeSTT(), llm, FakeTTS(), system_prompt="Be a tutor.")
    out = turn.run(AudioClip(np.zeros(10, dtype=np.float32), 16000))
    assert out.user_text == "hello there" and out.reply_text == "Hi! How are you?"
    assert [m.role for m in llm.seen] == ["system", "user"]
    assert out.reply_audio.sample_rate == 24000


def test_core_has_no_forbidden_imports():
    forbidden = {"backend.adapters", "onnxruntime", "pywhispercpp", "httpx", "requests", "ollama"}
    for path in Path("backend/core").glob("*.py"):
        for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
            names = []
            if isinstance(node, ast.Import):
                names = [a.name for a in node.names]
            elif isinstance(node, ast.ImportFrom):
                names = [node.module or ""]
            for n in names:
                assert not any(n == f or n.startswith(f + ".") for f in forbidden), (path, n)
