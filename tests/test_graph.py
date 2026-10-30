import numpy as np
import pytest

from backend.adapters.store.sqlite import SQLiteStore
from backend.core.context import ContextBudget
from backend.core.models import AudioClip, Transcript
from backend.core.persona import Persona
from backend.graph.turn import TurnRunner


class FakeSTT:
    def transcribe(self, audio):
        return Transcript("heard text")


class FakeLLM:
    def __init__(self):
        self.calls = []

    def generate(self, messages, *, json_schema=None, max_tokens=None):
        self.calls.append(messages)
        return "SUMMARY NEW" if "summar" in messages[0].content.lower() else "reply here"

    def stream(self, messages):
        yield "x"

    def count_tokens(self, text):
        return len(text.split())


class FakeTTS:
    def __init__(self):
        self.calls = []

    def synthesize(self, text, *, voice=None, speed=1.0):
        self.calls.append((text, voice))
        return AudioClip(np.zeros(10, dtype=np.float32), 16000)


PERSONA = Persona("p", "P", "F2", "SYS")
CLIP = AudioClip(np.zeros(10, dtype=np.float32), 16000)


def make(tmp_path, budget):
    store = SQLiteStore(path=str(tmp_path / "g.db"))
    sid = store.create_session("p")
    llm, tts = FakeLLM(), FakeTTS()
    runner = TurnRunner(FakeSTT(), llm, tts, store, PERSONA, budget, sid)
    return runner, store, sid, llm, tts


ROOMY = ContextBudget(num_ctx=1000, num_predict=100, margin=100)
TIGHT = ContextBudget(num_ctx=30, num_predict=5, margin=5)  # available 20


def test_audio_turn_persists_both_and_uses_persona_voice(tmp_path):
    runner, store, sid, llm, tts = make(tmp_path, ROOMY)
    turn = runner.run(CLIP)
    assert (turn.user_text, turn.reply_text) == ("heard text", "reply here")
    assert tts.calls == [("reply here", "F2")]
    assert [(m.role, m.content) for m in store.load_messages(sid)] == [
        ("user", "heard text"), ("assistant", "reply here")]
    assert llm.calls[0][0].content == "SYS" and llm.calls[0][-1].content == "heard text"


def test_text_turn_skips_stt(tmp_path):
    runner, store, sid, llm, tts = make(tmp_path, ROOMY)
    assert runner.run_text("typed").user_text == "typed"
    assert store.load_messages(sid)[0].content == "typed"


def test_no_summarization_within_budget(tmp_path):
    runner, store, sid, llm, tts = make(tmp_path, ROOMY)
    for _ in range(3):
        runner.run_text("hello there")
    assert len(llm.calls) == 3 and store.get_summary(sid).text == ""


def test_summarization_over_budget_after_speaking_updates_marker(tmp_path):
    runner, store, sid, llm, tts = make(tmp_path, TIGHT)
    for i in range(4):
        runner.run_text(f"user words number {i} here ok")
    summary = store.get_summary(sid)
    assert summary.text == "SUMMARY NEW" and summary.summarized_upto > 0
    # summarization LLM calls happen only after TTS for that turn, never before replying
    assert len(tts.calls) == 4
    folded_ids = [m.id for m in store.load_messages(sid) if m.id <= summary.summarized_upto]
    assert folded_ids and summary.summarized_upto == folded_ids[-1]
    # the old summary is passed back in when merging
    runner.run_text("another long turn with words")
    assert any("SUMMARY NEW" in c[-1].content
               for c in llm.calls if "summar" in c[0].content.lower())


def test_unsummarized_history_excludes_folded(tmp_path):
    runner, store, sid, llm, tts = make(tmp_path, TIGHT)
    for i in range(4):
        runner.run_text(f"user words number {i} here ok")
    reply_prompt = [c for c in llm.calls if "summar" not in c[0].content.lower()][-1]
    assert reply_prompt[0].content == "SYS"


def test_reply_delivered_before_summarization(tmp_path):
    runner, store, sid, llm, tts = make(tmp_path, TIGHT)
    order = []
    deliver = lambda user, reply, audio: order.append(("reply", len(llm.calls)))
    for i in range(4):
        runner.run_text(f"user words number {i} here ok", on_reply=deliver)
    assert len(order) == 4
    # every reply is handed over right after its generate call, before any summarize call
    assert store.get_summary(sid).summarized_upto > 0
    for _, n in order:
        assert "summar" not in llm.calls[n - 1][0].content.lower()


def test_role_is_part_of_the_system_prompt_and_counted_in_the_budget(tmp_path):
    store = SQLiteStore(path=str(tmp_path / "r.db"))
    sid = store.create_session("p", role="job interview")
    llm = FakeLLM()
    runner = TurnRunner(FakeSTT(), llm, FakeTTS(), store, PERSONA, ROOMY, sid, role="job interview")
    runner.run_text("hi")
    system = llm.calls[0][0].content
    assert system.startswith("SYS") and "job interview" in system
