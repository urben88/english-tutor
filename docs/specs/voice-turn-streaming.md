# Voice turn streaming (latency)

## Problem

A voice turn only plays audio after STT + the **whole** LLM reply + the **whole** TTS
synthesis finish. Measured on the local machine (RTX 3070, Gemma 4 E2B q4, Supertonic):

| Stage | Before |
|---|---|
| STT (whisper-server) | 0.5-1.4 s |
| LLM full reply (~40 tok) | 2.4 s (2.1 s of it was the `localhost` → `::1` fallback, now fixed) |
| TTS of the whole reply (~5-10 s of audio) | 1.3-2.5 s |
| **Until the first sound** | **~4-5 s** |

Target: the first spoken sentence reaches the browser **1-2 s** after the user releases the
mic. Partial win already applied (config `base_url` now `127.0.0.1`): LLM TTFT dropped from
2.1 s to 0.16 s.

## Design

Stream the reply sentence by sentence, synthesize each sentence as soon as it exists and
play it while the rest is still being generated.

```
mic ──wav──▶ STT ──▶ context ──▶ LLM stream ──▶ sentence splitter ──▶ TTS ──▶ NDJSON event
                                                                          │
browser: first event plays immediately, later events queue behind it ◀────┘
```

Latency to first sound becomes `STT + TTFT + TTS(first sentence) ≈ 1.2-1.8 s`.

### Backend

1. **`backend/core/sentences.py`** (new, pure): `iter_sentences(chunks, *, min_chars=60,
   max_chars=240) -> Iterator[str]`
   - Accumulates text chunks; emits a piece when it ends in `.`, `!`, `?` or `…` followed by
     whitespace/end (a following digit does not count, so "3.5" stays whole) or at a newline.
   - The **first** piece is emitted as soon as it is a sentence boundary, even if shorter than
     `min_chars` (fast start). Later pieces wait until they reach `min_chars` so the audio
     pipeline stays ahead of playback.
   - No boundary for `max_chars`: cut at the last space, carry the rest.
   - Flush the remainder at the end of the stream.
2. **`backend/core/ports.py`**: `LanguageModel.stream(messages, *, max_tokens: int | None = None)`.
   `backend/adapters/llm/ollama.py`: `stream(..., max_tokens=None)` passes it to the payload
   exactly like `generate` does. `TurnRunner` passes it only when `settings.max_tokens` is set.
3. **`backend/graph/turn.py`**: `TurnRunner.stream(audio=None, text=None)` yields dict events:
   - `{"type": "user", "text": str}` (after STT; empty when run from text, still yielded)
   - `{"type": "sentence", "text": str, "audio": AudioClip}` per synthesized sentence
   - `{"type": "done", "reply_text": str}` after persisting both messages
   The existing `run()` / `run_text()` keep working unchanged (reuse the same helpers; no
   duplicated context-building logic). Summarization runs after `done` in the stream path,
   exactly like `_summarize` today, so the first audio is never delayed by it.
4. **`backend/api/app.py`**: two new endpoints, NDJSON (`application/x-ndjson`), one JSON
   object per line:
   - `POST /api/sessions/{sid}/turn/stream` (body: WAV, `audio/wav`)
   - `POST /api/sessions/{sid}/turn/text/stream` (body: `{"text": ...}`)
   Events: `user`, `reply` (`{"type":"reply","text","audio","sample_rate"}`, base64 WAV),
   `done`, and `error` (`{"type":"error","message"}`) on a mid-stream failure — the HTTP
   status is already 200 by then. Unknown session and empty text are rejected **before** the
   stream starts (404/400). Keep the global lock for the whole generator and release it on
   close/exception. The non-streaming endpoints stay for the CLI and compatibility.

### Frontend

5. **`frontend/src/api/client.ts`**: `streamTurn(sessionId, body: {wav: Blob} | {text: string},
   onEvent: (e: TurnEvent) => void): Promise<void>` reads `res.body` with a `ReadableStream`
   reader, splits on `\n`, `JSON.parse`s each line and calls `onEvent`. Throws `ApiError` on a
   non-2xx response or on an `error` event.
6. **`frontend/src/audio/player.ts`**: `play(base64, append = false)`. `append=false` keeps the
   current behaviour (stop + play). `append=true` queues the clip behind the current one and
   starts it when the previous ends; the returned promise resolves when **that** clip ends.
   `stop()` clears the queue.
7. **`frontend/src/hooks/useTutor.ts`**: `sendVoice` and `sendText` use `streamTurn`; every
   `reply` event calls `player.play(audio, append)`; `speaking` stays true while clips are
   pending and goes false when the last one resolves; messages are refreshed on `done`.

## Acceptance criteria

- `uv run python -m backend.bench` still passes and LLM TTFT stays under 0.3 s.
- New pytest coverage: sentence splitting (abbreviations/decimal guard, long cut, flush),
  `TurnRunner.stream` order (`user` → sentence(s) → `done`) with fake LLM/TTS, and the two
  NDJSON endpoints (line count, base64 decodes to WAV, 404/400 cases).
- `cd frontend && npm test` passes, including a player queue test and a `useTutor` test where
  playback of the first chunk resolves before the stream ends.
- End-to-end on the running app: the first spoken sentence starts within ~2 s of releasing
  the mic; sentence boundaries are not audible as gaps.

## Out of scope

- Changing the TTS `steps` (8 today). Dropping to 4 halves TTS time (0.65 s → 0.35 s for a
  short line) at a quality cost; leave the knob to the user.
- Touching `3d/` (another session is editing it).
