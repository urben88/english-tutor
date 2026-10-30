import numpy as np
import pytest

from backend import cli
from backend.adapters.store.sqlite import SQLiteStore
from backend.core.context import ContextBudget
from backend.core.models import AudioClip
from backend.core.persona import Persona
from backend.graph.turn import TurnRunner


def test_parse_args_defaults_and_flags():
    a = cli.parse_args([])
    assert (a.new, a.persona, a.text, a.config) == (False, None, False, "config.yaml")
    b = cli.parse_args(["--new", "--persona", "bob", "--text"])
    assert (b.new, b.persona, b.text) == (True, "bob", True)


@pytest.fixture
def store(tmp_path):
    s = SQLiteStore(path=str(tmp_path / "c.db"))
    yield s
    s.close()


def test_no_session_creates_one(store):
    sid = cli.select_session(store, new=False, persona="emma")
    assert store.latest_session() == sid


def test_resumes_latest_by_default(store):
    s1 = store.create_session("emma")
    assert cli.select_session(store, new=False, persona="emma") == s1
    assert len(store.list_sessions()) == 1


def test_new_flag_creates_fresh_session(store):
    s1 = store.create_session("emma")
    s2 = cli.select_session(store, new=True, persona="emma")
    assert s2 != s1 and len(store.list_sessions()) == 2


def test_short_press_filter():
    rate = 16000
    short = AudioClip(np.zeros(int(rate * 0.1), dtype=np.float32), rate)
    ok = AudioClip(np.zeros(int(rate * 0.5), dtype=np.float32), rate)
    assert not cli.long_enough(short, 0.3)
    assert cli.long_enough(ok, 0.3)


def test_hold_settings_defaults_and_override():
    assert cli.hold_settings({}) == ("ctrl_r", 0.3)
    assert cli.hold_settings({"hold_key": "f9", "min_press_seconds": 0.5}) == ("f9", 0.5)


class FakeLLM:
    def generate(self, messages, *, json_schema=None):
        return "reply"

    def stream(self, messages):
        yield "r"

    def count_tokens(self, text):
        return len(text.split())


class FakeTTS:
    def __init__(self):
        self.calls = []

    def synthesize(self, text, *, voice=None, speed=1.0):
        self.calls.append((text, voice))
        return AudioClip(np.zeros(5, dtype=np.float32), 24000)


def test_text_mode_wiring(store):
    sid = store.create_session("p")
    tts = FakeTTS()
    runner = TurnRunner(None, FakeLLM(), tts, store, Persona("p", "Pat", "F2", "SYS"),
                        ContextBudget(1000, 100, 100), sid)
    lines = iter(["hello", "", "how are you"])
    played, out = [], []

    def read(_prompt):
        try:
            return next(lines)
        except StopIteration:
            raise EOFError

    cli.run_text_loop(runner, read, played.append, out.append, "Pat")
    assert tts.calls == [("reply", "F2"), ("reply", "F2")]  # blank line skipped
    assert len(played) == 2 and played[0].sample_rate == 24000
    assert [m.content for m in store.load_messages(sid) if m.role == "user"] == [
        "hello", "how are you"]
    assert out == ["Pat: reply", "Pat: reply"]  # typed input is already echoed by the terminal


@pytest.mark.integration
def test_default_audio_devices_exist():
    sd = pytest.importorskip("sounddevice")
    try:
        sd.query_devices(kind="input")
        sd.query_devices(kind="output")
    except Exception as e:  # no device / no PortAudio
        pytest.skip(f"no audio device: {e}")
