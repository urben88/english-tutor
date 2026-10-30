# Phase 3 — Web API and browser UI with click-to-explain

Objective: talk to the tutor from the browser (hold-to-talk), see the conversation, and click a word or select a phrase to get an explanation.
Branch: `feat/phase-3-web-ui`, stacked on `feat/phase-2-voice-loop` (unpushed) · Delivery: ask-on-risk · Test runners: backend `uv run pytest -m "not integration"`; frontend `npm test` and `npm run build` in `frontend/`.

## Specs

- **S1 — Web API over the existing ports and graph.** FastAPI in `backend/api/app.py` (keep `GET /health`). Turns go through the existing `TurnRunner` (`backend/graph/turn.py`) and `registry.build_*`; no re-implementation of the turn. Endpoints under `/api`:
  - `GET /api/persona` → `{"name", "stem"}` of the active persona (config `persona`).
  - `GET /api/sessions` → list (`id`, `persona`, `created_at`, `updated_at`, `message_count`), most recent first.
  - `POST /api/sessions` → creates a session for the active persona → `{"id"}`.
  - `GET /api/sessions/{id}/messages` → `[{"id","role","content"}]` in order. Unknown session → 404.
  - `POST /api/sessions/{id}/turn` — body is a WAV file (`Content-Type: audio/wav`, read from the raw request body, no `python-multipart`), decoded with stdlib `wave` (16-bit PCM, mono or stereo downmixed) into `AudioClip`. Response `{"user_text","reply_text","audio":"<base64 WAV 16-bit PCM>","sample_rate"}`. Empty/invalid WAV → 400 with a clear message.
  - `POST /api/sessions/{id}/turn/text` — `{"text"}` → same response shape (uses `TurnRunner.run_text`).
  - `POST /api/explain` — `{"text","context"}` (`text` = clicked word or selected phrase; `context` = the full message it came from) → `{"text","translation","explanation","examples":[...]}`. Explanation language: Spanish (`translation`, `explanation` in Spanish; `examples` are short English sentences). Uses `LanguageModel.generate(..., json_schema=...)`. The explain logic lives in core (`backend/core/explain.py`, no third-party imports) and depends only on the `LanguageModel` port. Does not write to the conversation history. Invalid JSON from the model → 502 with a clear message.
  - Model and store access is serialized with one lock (single local user); the SQLite adapter must be usable from FastAPI's worker threads.
  - If `frontend/dist/` exists, the app serves it at `/` (static, SPA fallback to `index.html`), so `uvicorn backend.api.app:app` alone serves the built UI.
- **S2 — Browser UI (React + Vite + TypeScript) in `frontend/`.** User (L2): "React + Vite + TS (Recommended)". Atomic design with container/presentational split. Dev: Vite proxies `/api` and `/health` to `http://127.0.0.1:8000`.
  - Conversation view: message list (user / tutor), loads the latest session on start (creates one if none), "New session" button.
  - Hold-to-talk: hold the on-screen button (pointer down/up) or the Space key while the page has focus (not inside the text input). Records mic audio with Web Audio, encodes 16 kHz mono 16-bit WAV in the browser, POSTs it to `/turn`. Presses shorter than 0.3 s are ignored. Shows a "listening" / "thinking" state. Plays the reply audio when it arrives.
  - Text fallback: an input that sends to `/turn/text`.
  - Click-to-explain: every word in every message is clickable; clicking calls `/api/explain` with the word (punctuation stripped) and the message as `context`. Selecting text with the mouse inside one message shows an "Explain" action that sends the selected phrase. The explanation shows in a side panel (translation, explanation, examples) with a loading and an error state.
  - UI copy in English.
- **S3 — Tests.** Backend: FastAPI `TestClient` with fake ports (no models, no network): each endpoint's success path and its error path (404 unknown session, 400 bad WAV, 502 bad explain JSON); WAV decode/encode round-trip; explain core with a fake LLM (schema passed, Spanish fields parsed); `/health` still OK; core forbidden-import test still passes. Frontend (Vitest + Testing Library): WAV encoder (header, sample rate, length); word tokenization + click calls the explain API with word and context; selection "Explain" sends the phrase; hold-to-talk ignores presses < 0.3 s. Real mic/browser audio is a manual check.
- **S4 — Docs.** README: how to run the web UI (dev: uvicorn + `npm run dev`; prod: `npm run build` then uvicorn serves it), endpoints in one short table, hold-to-talk keys, explanations in Spanish.

## Tasks

| ID | Specs | Route | Status | Commit |
|---|---|---|---|---|
| T1 | S1, S3 (backend), S4 | delegated (resolutor · Sonnet · medium) — parallel unit, surface `backend/`, `tests/`, `README.md`, `pyproject.toml`/`uv.lock` | done | see L4 |
| T2 | S2, S3 (frontend) | delegated (resolutor · Sonnet · medium) — parallel unit, surface `frontend/` only | done | see L5 |
| T3 | verify S1–S4 | analista · Haiku · medium (Risk item 5: new frontend dependencies) | pending | |

Route evidence: two independent units with disjoint edit surfaces, each several files of work, launched together (Writer trigger a); the API contract in S1 is the seam.

## Log

- L1 (2026-10-30, user): "Continúa con la siguiente fase." — next step from phase 2: "fase 3 (API web + UI con clic en palabras)". Phase 1 L2 (user): "hacer, por ejemplo, clic en una palabra que me explique eso, poder seleccionar la frase entera".
- L2 (2026-10-30, user): stack choice "React + Vite + TS (Recommended)".
- L3 (2026-10-30): Defaults stated to the user and not objected: explanations in Spanish with English examples; browser hold-to-talk; same API for voice and text. Browser encodes WAV so the backend needs no ffmpeg; raw-body upload avoids a `python-multipart` dependency.
- L4 (2026-10-30): T1 done. 81 unit passed (parent re-ran). Added `uvicorn` 0.54.0 (was not a dependency; Risk item 5). SQLite `check_same_thread=False` + one RLock in the API; one TurnRunner per request; services built lazily on first request (STT unavailable -> voice 503, text still works). Extras beyond S1: empty text 400, unknown /api/* 404 even with dist, explain `context` optional; empty explain text gives 422 (pydantic). Commit 0d93d28.
- L5 (2026-10-30): T2 done. frontend/ React 19.3.1, Vite 8.3.5, TS 7.0.2, Vitest 5.0.5 (pinned). 11 tests passed (parent re-ran), build OK. Notes: messages reloaded from /messages after each turn; words are span role=button so selection spans words; ScriptProcessor recorder. Real mic/playback: manual check.
