"""Terminal voice loop: hold a key to talk, release to send, the tutor answers aloud.

    uv run python -m backend.cli [--new] [--persona STEM] [--text] [--config PATH]

Device libraries (sounddevice, pynput) are imported lazily so the logic here stays testable.
The pynput listener runs on its own thread and only posts events to a queue; recording, the
turn and every store access happen on the main thread (SQLite is single-thread).
"""

from __future__ import annotations

import argparse
import queue
from collections.abc import Callable
from typing import Any

import numpy as np

from backend.adapters import registry
from backend.core.config import AppConfig, load_config
from backend.core.context import ContextBudget
from backend.core.models import AudioClip
from backend.core.persona import load_persona
from backend.core.ports import ConversationStore
from backend.graph.turn import TurnRunner

DEFAULT_HOLD_KEY = "ctrl_r"
DEFAULT_MIN_PRESS = 0.3  # seconds; shorter recordings are ignored
REC_RATE = 16000  # mono float32; whisper_server resamples anyway


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="python -m backend.cli",
                                description="Talk to the English tutor from the terminal.")
    p.add_argument("--new", action="store_true", help="start a new session instead of resuming")
    p.add_argument("--persona", metavar="STEM", help="persona file stem (overrides config.yaml)")
    p.add_argument("--text", action="store_true",
                   help="type lines instead of using the microphone (the reply is still spoken)")
    p.add_argument("--config", default="config.yaml", help="config file (default: config.yaml)")
    return p.parse_args(argv)


def select_session(store: ConversationStore, new: bool, persona: str) -> int:
    """Resume the latest session unless ``new`` or there is none."""
    if not new:
        latest = store.latest_session()
        if latest is not None:
            return latest
    return store.create_session(persona)


def long_enough(clip: AudioClip, min_seconds: float) -> bool:
    return clip.duration >= min_seconds


def hold_settings(cli_cfg: dict[str, Any]) -> tuple[str, float]:
    """(key name, minimum press seconds) from the ``cli:`` section of config.yaml."""
    return (str(cli_cfg.get("hold_key", DEFAULT_HOLD_KEY)),
            float(cli_cfg.get("min_press_seconds", DEFAULT_MIN_PRESS)))


def build_runner(config: AppConfig, args: argparse.Namespace) -> tuple[TurnRunner, Any, str]:
    persona = load_persona(args.persona or config.persona)
    store = registry.build_store(config)
    llm = registry.build_llm(config)
    runner = TurnRunner(
        None if args.text else registry.build_stt(config), llm,
        registry.build_tts(config), store, persona,
        ContextBudget.for_llm(llm, config.llm.params, config.context_margin),
        select_session(store, args.new, persona.stem))
    return runner, store, persona.name


def run_text_loop(runner: TurnRunner, read: Callable[[str], str],
                  play: Callable[[AudioClip], None], out: Callable[[str], None],
                  tutor_name: str) -> None:
    while True:
        try:
            line = read("you> ").strip()
        except EOFError:
            return
        if not line:
            continue
        def deliver(user_text: str, reply_text: str, audio: AudioClip) -> None:
            out(f"{tutor_name}: {reply_text}")
            play(audio)

        runner.run_text(line, on_reply=deliver)


def play_clip(clip: AudioClip, wait: bool = True) -> None:
    import sounddevice as sd
    sd.play(clip.samples, clip.sample_rate)  # the clip's own sample rate
    if wait:
        sd.wait()


def _next_event(events: queue.Queue[str]) -> str:
    # Poll with a timeout: a bare blocking get() may not let Ctrl+C through on Windows.
    while True:
        try:
            return events.get(timeout=0.2)
        except queue.Empty:
            pass


def _resolve_key(name: str):
    from pynput import keyboard
    if hasattr(keyboard.Key, name):
        return getattr(keyboard.Key, name)
    if len(name) == 1:
        return keyboard.KeyCode.from_char(name)
    raise ValueError(f"unknown hold_key '{name}' (use a pynput Key name such as ctrl_r, f9, or one character)")


def run_voice_loop(runner: TurnRunner, key_name: str, min_seconds: float,
                   out: Callable[[str], None], tutor_name: str) -> None:
    import sounddevice as sd
    from pynput import keyboard

    target = _resolve_key(key_name)
    events: queue.Queue[str] = queue.Queue()
    held = {"down": False}

    def on_press(key):
        if key == target and not held["down"]:  # ignore OS key auto-repeat
            held["down"] = True
            events.put("down")

    def on_release(key):
        if key == target:
            held["down"] = False
            events.put("up")

    chunks: list[np.ndarray] = []
    with keyboard.Listener(on_press=on_press, on_release=on_release):
        out(f"Hold {key_name} to talk, release to send. Ctrl+C to quit.")
        while True:
            if _next_event(events) != "down":
                continue
            chunks.clear()
            stream = sd.InputStream(samplerate=REC_RATE, channels=1, dtype="float32",
                                    callback=lambda data, *_: chunks.append(data[:, 0].copy()))
            stream.start()
            while _next_event(events) != "up":
                pass
            stream.stop()
            stream.close()
            if not chunks:
                continue
            clip = AudioClip(np.concatenate(chunks), REC_RATE)
            if not long_enough(clip, min_seconds):
                out("(too short, ignored)")
                continue
            def deliver(user_text: str, reply_text: str, audio: AudioClip) -> None:
                out(f"you: {user_text}")
                out(f"{tutor_name}: {reply_text}")
                play_clip(audio, wait=False)  # summarizing (if due) overlaps playback

            runner.run(clip, on_reply=deliver)
            sd.wait()
            while not events.empty():  # drop presses made while the tutor was busy
                events.get_nowait()


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    config = load_config(args.config)
    try:
        runner, store, name = build_runner(config, args)
    except ValueError as e:  # unknown persona / adapter
        print(f"error: {e}")
        return 2
    try:
        if args.text:
            run_text_loop(runner, input, play_clip, print, name)
        else:
            key, min_s = hold_settings(config.cli)
            run_voice_loop(runner, key, min_s, print, name)
    except KeyboardInterrupt:
        print("\nbye")
    finally:
        store.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
