# Phase 2 — Voice loop with persona, SQLite history and LangGraph context control

Objective: talk to the tutor from the terminal (hold-to-talk), with a persona, persistent history per session and a token-budgeted context window controlled by a LangGraph graph over the existing ports.
Branch: `feat/phase-2-voice-loop`, stacked on `feat/phase-1-foundation` (both unpushed) · Delivery: ask-on-risk · Test runner: `uv run pytest` (Python 3.12, uv).

## Specs

- **S1 — Persona.** One YAML file per persona in `personas/` with `name`, `voice` (TTS voice id, e.g. `M1`) and `system_prompt`. `config.yaml` key `persona: <file stem>` selects it; unknown persona → clear error listing the available ones. Ship one default persona: a friendly English conversation partner who keeps replies short and spoken-style (1–3 sentences), gently corrects mistakes, and never uses markdown, lists or emoji (TTS reads them aloud). The persona voice is passed to `TextToSpeech.synthesize(voice=...)`.
- **S2 — History port + SQLite adapter.** New port `ConversationStore` in `backend/core/ports.py` (create/resume session, append message, load messages, get/set running summary, list sessions). Adapter `sqlite` in `backend/adapters/store/sqlite.py` (stdlib `sqlite3`), registered in `registry.py` under a new port `store` and selected by `config.yaml` (`store: {adapter: sqlite, params: {path: ...}}`), same pattern as phase 1. Default DB path outside the repo or git-ignored. Restarting the CLI resumes the last session by default; `--new` starts a new one.
- **S3 — Context policy (pure, in core).** `backend/core/context.py`, no third-party imports. Budget = `num_ctx` − `num_predict` − safety margin, all read from config (not from adapter internals). Token counts via `LanguageModel.count_tokens`. The built prompt is: system prompt (always) + running summary (if any) + the most recent turns that fit + the latest user turn (always). When unsummarized history exceeds the budget, the oldest turns are marked to be folded into the summary.
- **S4 — LangGraph turn graph over the ports.** User (L1): "estaría bien usar alguna librería como langgrap para tener el control total de lo que entra en el modelo local en su ventana de contexto". Graph in its own package `backend/graph/` (NOT in `backend/core/`). Nodes call only the existing ports (`SpeechToText`, `LanguageModel`, `TextToSpeech`, `ConversationStore`) — no LangChain model wrappers (`ChatOllama` etc.), so adapters stay swappable by config. Flow: transcribe → build context (S3) → generate → speak → persist → summarize-if-needed. Summarization (LLM call that folds old turns into the running summary) runs only when S3 says the budget is exceeded, and after the reply audio is produced, so normal turns pay no extra latency. Summary persisted via the store.
- **S5 — Terminal hold-to-talk.** User chose option 1: "Terminal con push-to-talk: mantienes pulsada una tecla, hablas y el tutor responde por los altavoces". `uv run python -m backend.cli` (flags `--new`, `--persona`). Hold a key (default Right Ctrl, configurable) to record from the default mic via `sounddevice`, release to send; the reply is played on the default speakers at the clip's own sample rate. Key detection via `pynput` (global listener — documented in README). Prints the user transcript and tutor reply per turn. Ctrl+C exits cleanly. Mic capture in mono float32 at a rate the STT path accepts (whisper_server resamples).
- **S6 — Tests.** Unit (no models, no audio devices): persona loading + unknown error; SQLite store round-trip and resume in a `tmp_path` DB; context policy (system prompt always present, latest user turn always present, trimming to budget, summary included, fold triggered only over budget); graph turn with fake ports (persists both messages, summarization only when over budget, persona voice passed to TTS). Audio-device code behind `@pytest.mark.integration`. `uv run pytest -m "not integration"` passes.
- **S7 — Docs.** README: how to run the voice loop, the hold key (global listener caveat), persona files, where history lives, how the context budget works.

## Tasks

| ID | Specs | Route | Status | Commit |
|---|---|---|---|---|
| T1 | S1, S2, S6 (persona/store) | delegated (resolutor · Sonnet · medium — user cost rule) | pending | |
| T2 | S3, S4, S6 (policy/graph) | delegated (same worker, SendMessage) | pending | |
| T3 | S5, S6, S7 | delegated (same worker) | pending | |
| T4 | verify S1–S7 | analista · Haiku · medium (Risk item 5: new deps langgraph, sounddevice, pynput) | pending | |

## Log

- L1 (2026-10-30, user): "Continúa con el desarrollo." — next step from phase 1: "fase 2: bucle de voz con persona e historial (SQLite) y control de contexto con LangGraph". Phase 1 L1 (user): "estaría bien usar alguna librería como langgrap para tener el control total de lo que entra en el modelo local en su ventana de contexto".
- L2 (2026-10-30, user): "la 1" — terminal push-to-talk; web API/UI deferred to phase 3.
- L3 (2026-10-30): Decisions: LangGraph orchestrates over existing ports (keeps the swap-by-config harness); langgraph stays out of `backend/core/`; hold-to-talk needs `pynput` on Windows (msvcrt can't see key release). Live mic loop is a manual check the user must run.
