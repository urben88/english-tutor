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
    def __init__(self, chunks=("x",)):
        self.calls = []
        self.chunks = list(chunks)
        self.stream_calls = []

    def generate(self, messages, *, json_schema=None, max_tokens=None):
        self.calls.append(messages)
        return "SUMMARY NEW" if "summar" in messages[0].content.lower() else "reply here"

    def stream(self, messages, *, max_tokens=None):
        self.stream_calls.append((messages, max_tokens))
        yield from self.chunks

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


def test_stream_emits_user_then_sentences_then_done(tmp_path):
    store = SQLiteStore(path=str(tmp_path / "s.db"))
    sid = store.create_session("p")
    chunks = ["Hi. ", "This is a longer second sentence that goes comfortably past sixty."]
    llm, tts = FakeLLM(chunks), FakeTTS()
    runner = TurnRunner(FakeSTT(), llm, tts, store, PERSONA, ROOMY, sid)

    events = list(runner.stream(text="typed"))

    sentences = ["Hi.", "This is a longer second sentence that goes comfortably past sixty."]
    assert [e["type"] for e in events] == ["user", "sentence", "sentence", "done"]
    assert events[0] == {"type": "user", "text": ""}  # no STT in a text turn
    assert [e["text"] for e in events[1:3]] == sentences
    assert [clip for clip in tts.calls] == [(s, "F2") for s in sentences]
    assert events[-1]["reply_text"] == " ".join(sentences)
    assert [(m.role, m.content) for m in store.load_messages(sid)] == [
        ("user", "typed"), ("assistant", " ".join(sentences))]
    # the reply limit is forwarded only when the settings set one (medium here)
    streamed_messages, max_tokens = llm.stream_calls[0]
    assert max_tokens is None and streamed_messages[0].content == "SYS"


def test_stream_from_audio_yields_stt_text_first(tmp_path):
    runner, store, sid, _, _ = make(tmp_path, ROOMY)
    events = list(runner.stream(audio=CLIP))
    assert events[0] == {"type": "user", "text": "heard text"}
    assert events[-1]["type"] == "done"


def test_stream_summarizes_after_done(tmp_path):
    store = SQLiteStore(path=str(tmp_path / "f.db"))
    sid = store.create_session("p")
    for content in ("one two three four five six seven", "six seven eight nine ten eleven twelve",
                    "eleven twelve thirteen fourteen fifteen sixteen seventeen"):
        store.append_message(sid, "user", content)
    llm, tts = FakeLLM(["Hi. ", "A second sentence that is long enough to be spoken on its own."]), FakeTTS()
    runner = TurnRunner(FakeSTT(), llm, tts, store, PERSONA, TIGHT, sid)

    stream = runner.stream(text="new turn")
    seen = []
    for event in stream:
        seen.append(event)
        if event["type"] == "done":
            break
    assert store.get_summary(sid).text == ""  # summary runs only after `done`
    list(stream)  # resume: summarization happens now
    assert store.get_summary(sid).text == "SUMMARY NEW"


def test_role_is_part_of_the_system_prompt_and_counted_in_the_budget(tmp_path):
    store = SQLiteStore(path=str(tmp_path / "r.db"))
    sid = store.create_session("p", role="job interview")
    llm = FakeLLM()
    runner = TurnRunner(FakeSTT(), llm, FakeTTS(), store, PERSONA, ROOMY, sid, role="job interview")
    runner.run_text("hi")
    system = llm.calls[0][0].content
    assert system.startswith("SYS") and "job interview" in system
