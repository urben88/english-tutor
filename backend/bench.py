"""Latency benchmark: ``uv run python -m backend.bench``.

Each row is measured independently; a missing model or service is reported in its row
and the other rows still run.
"""

from __future__ import annotations

import sys
import time

from backend.adapters import registry
from backend.core.config import load_config
from backend.core.models import ChatMessage

SENTENCE = "Hello, my name is Anna and I would like to practice my English today."
PROMPT = "Explain in two short sentences why practicing speaking helps language learning."


def bench_tts(config):
    tts = registry.build_tts(config)
    tts.synthesize("Warm up.")  # exclude first-run overhead
    t0 = time.perf_counter()
    clip = tts.synthesize(SENTENCE)
    elapsed = time.perf_counter() - t0
    rtf = elapsed / clip.duration
    return clip, f"synth {elapsed:.2f}s | audio {clip.duration:.2f}s | RTF {rtf:.3f}"


def bench_stt(config, clip):
    stt = registry.build_stt(config)
    t0 = time.perf_counter()
    out = stt.transcribe(clip)
    elapsed = time.perf_counter() - t0
    return f"{elapsed:.2f}s | words {len(out.words)} | \"{out.text}\""


def bench_llm(config):
    llm = registry.build_llm(config)
    msgs = [ChatMessage("user", PROMPT)]
    list(llm.stream([ChatMessage("user", "Say hi.")]))  # warm up / load model
    t0 = time.perf_counter()
    first = None
    parts = []
    for chunk in llm.stream(msgs):
        if first is None:
            first = time.perf_counter() - t0
        parts.append(chunk)
    total = time.perf_counter() - t0
    tokens = llm.count_tokens("".join(parts))
    rate = tokens / (total - first) if first is not None and total > first else 0.0
    return f"TTFT {first or 0:.2f}s | total {total:.2f}s | ~{tokens} tok | ~{rate:.1f} tok/s"


def main() -> int:
    config = load_config("config.yaml")
    rows: list[tuple[str, str, str]] = []
    clip = None

    try:
        clip, result = bench_tts(config)
        rows.append(("TTS", config.tts.adapter, result))
    except Exception as e:  # noqa: BLE001 - report any failure per row
        rows.append(("TTS", config.tts.adapter, f"unavailable: {type(e).__name__}: {e}"))

    if clip is None:
        rows.append(("STT", config.stt.adapter, "skipped: no TTS audio to transcribe"))
    else:
        try:
            rows.append(("STT", config.stt.adapter, bench_stt(config, clip)))
        except Exception as e:  # noqa: BLE001
            rows.append(("STT", config.stt.adapter, f"unavailable: {type(e).__name__}: {e}"))

    try:
        rows.append(("LLM", config.llm.adapter, bench_llm(config)))
    except Exception as e:  # noqa: BLE001
        rows.append(("LLM", config.llm.adapter, f"unavailable: {type(e).__name__}: {e}"))

    print(f"{'Port':<5} {'Adapter':<12} Result")
    print("-" * 100)
    for port, adapter, result in rows:
        print(f"{port:<5} {adapter:<12} {result}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
