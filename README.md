# English Tutor

A fully local English conversation tutor. The backend is hexagonal: speech-to-text, the language model
and text-to-speech are swappable ports, so a local model can later be replaced by an API-backed one
without touching the core.

Phase 1: ports, local adapters, config-driven selection, latency benchmark.
Phase 2: terminal voice loop with a persona, SQLite history and token-budgeted context.
Phase 3 (this repo state): web API and browser UI with click-to-explain.

| Port | Local adapter | Engine |
|---|---|---|
| STT | `whisper_server` (GPU, default) | whisper.cpp `whisper-server` over HTTP, CUDA build (large-v3-turbo q8_0) |
| STT | `whisper_cpp` (CPU fallback) | whisper.cpp via `pywhispercpp` |
| LLM | `ollama` | Ollama `/api/chat` (Gemma 4 E2B QAT q4_0) |
| TTS | `supertonic_server` (default) | shared Supertonic server (port 8179), falls back to in-process |
| TTS | `supertonic` | Supertonic 3, voice M1, ONNX Runtime CPU, in-process |

## Install

Requires [uv](https://docs.astral.sh/uv/) (it manages Python 3.12) and a running Ollama with the model pulled.

```
uv sync
```

Edit `config.yaml` so the model paths and the Ollama model name match your machine. To fetch the
Supertonic model (about 400 MB, pinned revision, sha256-checked):

```
uv run python -m backend.adapters.tts.supertonic --download <model_dir>
```

## GPU speech-to-text (whisper-server)

The default STT adapter, `whisper_server`, uses a running whisper.cpp server and, when none answers, starts one
itself from `exe_path`/`model_path` in `config.yaml` (see Shared models).
Install the official CUDA build once: download `whisper-bin-win-cuda-12.4.0-x64.zip` from the
[whisper.cpp release b5454](https://github.com/ggml-org/whisper.cpp/releases/tag/b5454) and extract it to
`%LOCALAPPDATA%\english-tutor\whisper-cuda\` (the exe ends up in `...\whisper-cuda\Release\`).
To start it manually instead (keep the window open):

```
"%LOCALAPPDATA%\english-tutor\whisper-cuda\Release\whisper-server.exe" -m "<path to ggml-large-v3-turbo-q8_0.bin>" --host 127.0.0.1 --port 8178 -l en -ml 1 -sow
```

`-ml 1 -sow` is required: it gives one entry per word, which the adapter turns into word timestamps.
If the server is down, the adapter raises an error that contains this command.

CPU fallback: in `config.yaml` set the `stt` block to `adapter: whisper_cpp` (see the commented example there).

## Run

```
uv run python -m backend.bench                 # latency table for TTS, STT and LLM
uv run pytest -m "not integration"             # unit tests, no models needed
uv run pytest -m integration                   # real adapters; skipped if a model/service is missing
uv run uvicorn backend.api.app:app --port 8765  # web API (see Web UI), GET /health
```

## Voice loop (terminal)

Prerequisites: the whisper-server running (see above) and Ollama with the model pulled.

```
uv run python -m backend.cli                   # resume the latest session
uv run python -m backend.cli --new             # start a new session
uv run python -m backend.cli --persona emma    # override the persona from config.yaml
uv run python -m backend.cli --text            # type lines instead of using the mic (reply is still spoken)
```

Hold the talk key (default Right Ctrl), speak, release to send. Presses shorter than 0.3 s are ignored.
Ctrl+C exits. Change the key in `config.yaml` under `cli:` (`hold_key`, `min_press_seconds`).
The key is read with `pynput`, which listens **globally**: it sees the key even when another window has
focus (and may need extra permissions on some systems). The mic and speakers are the system defaults.

**Personas.** One YAML file per persona in `personas/` with `name`, `voice` (TTS voice id) and
`system_prompt`. `persona: <file stem>` in `config.yaml` selects it; an unknown stem lists the available ones.

**History.** Stored in SQLite at `data/history.db` (git-ignored; path set under `store:` in `config.yaml`).

**Context budget.** The prompt budget is `num_ctx - num_predict - context_margin` tokens. Each turn sends the
system prompt, the running summary (if any), the most recent turns that fit, and your new message. Older
turns that no longer fit are folded into the summary by one extra LLM call, made after the reply has been
spoken so normal turns pay no extra latency.

## Shared models

english-tutor stays independent but never loads a second copy of a model another tool already serves.

- **LLM (Ollama, port 11434).** Before each request the adapter asks `GET /api/ps`. If the model is already
  loaded, the request uses that instance's context window (so Ollama does not reload it) and a keep-alive that
  never shortens its lifetime; the prompt budget follows that window. If it is not loaded (or `/api/ps`
  fails), `num_ctx` and the optional `keep_alive` from `config.yaml` apply.
- **STT (whisper-server, port 8178).** If a whisper-server answers there, it is reused. If not, and
  `exe_path` + `model_path` are set in `config.yaml`, it is started detached (about 60 s to load) and left running.
- **TTS (Supertonic server, port 8179).** The `supertonic_server` adapter reuses `python -m backend.services.tts_server`
  if it runs, else starts it detached and leaves it running; if it cannot be reached it loads the model in-process
  and logs a warning. Any local tool can use it: `GET /health`, `POST /synthesize` with JSON
  `{"text": "...", "voice": "M1", "speed": 1.0}` returns `audio/wav`. Set `adapter: supertonic` for in-process only.

Servers started this way are **not** stopped when english-tutor exits, so other tools can keep using them.
To stop them: end `whisper-server.exe` and the `python` process running `backend.services.tts_server` in Task Manager,
or `taskkill /IM whisper-server.exe /F` for the first one. Ollama is never started or stopped by this app.

## Launcher (double click)

`Iniciar.cmd` starts everything for you: it needs `uv` (and Node.js/`npm` the first time, to build the UI),
runs the server on port 8765, opens http://127.0.0.1:8765 in your browser once it answers, and keeps the
console open with the server log (close it or press Ctrl+C to stop). If the app is already running it only
opens the browser. It warns if Ollama is not reachable; it never starts Ollama. Whisper and TTS servers are
started on demand by the app (see Shared models).

## Web UI

Prerequisites as for the voice loop (whisper-server optional: without it text turns and explanations still work).

```
# dev: API on :8765 + Vite dev server (proxies /api and /health to 127.0.0.1:8765)
uv run uvicorn backend.api.app:app --port 8765
cd frontend && npm install && npm run dev

# prod: build once, then uvicorn serves frontend/dist at /
cd frontend && npm run build
uv run uvicorn backend.api.app:app --port 8765 # open http://127.0.0.1:8765
```

**Talking.** Two modes, chosen with the switch under the text box (remembered in the browser):

- **Hands-free** (default): the mic stays open. Just talk; after about 1 s of silence the phrase is sent. Phrases
  shorter than 0.3 s are ignored. The mic is paused while the tutor thinks and speaks, and listens again when the
  reply ends. If the mic is denied or missing, a message is shown and the text box still works.
- **Hold to talk**: hold the on-screen button (or the Space key, outside the text box), release to send.

The status pill is always visible (Listening, Hearing you, Thinking, Speaking, Muted) with a live mic level.
**Mute** (button or the `M` key, outside the text box) stops all recording; muting mid-phrase discards it.
**Stop** cuts the tutor's reply; in hands-free mode listening resumes right away.

Click any word,
or select a phrase and press "Explain", to get a translation, an explanation and examples in a side panel.
Explanations are in Spanish; the examples are English. They are not saved to the conversation history.

| Endpoint | Purpose |
|---|---|
| `GET /api/persona` | active persona `{name, stem}` |
| `GET /api/sessions`, `POST /api/sessions` | list sessions (newest first) / create one |
| `GET /api/sessions/{id}/messages` | conversation `[{id, role, content}]` (404 if unknown) |
| `POST /api/sessions/{id}/turn` | body: WAV (`audio/wav`, 16-bit PCM) -> `{user_text, reply_text, audio (base64 WAV), sample_rate}` |
| `POST /api/sessions/{id}/turn/text` | body `{text}` -> same response |
| `POST /api/explain` | body `{text, context}` -> `{text, translation, explanation, examples}` |

## Swap an adapter

`config.yaml` selects one adapter per port by name and passes its `params` to the constructor:

```yaml
llm:
  adapter: ollama
  params: {model: "...", num_ctx: 4096}
```

To add another (for example an API-key LLM): create a module under `backend/adapters/<port>/` with a
class implementing the port from `backend/core/ports.py`, add one line to `_BUILTIN` in
`backend/adapters/registry.py`, and set `adapter:` in `config.yaml`. The core does not change. An
unknown name fails with the list of valid options.

## Layout

```
backend/core/       models, ports, context policy, persona loader, use cases (no adapter imports)
backend/adapters/   stt/ llm/ tts/ store/ and registry.py
backend/graph/      LangGraph turn graph over the ports
backend/cli.py      terminal hold-to-talk loop
backend/api/        FastAPI app (+ serves frontend/dist)
frontend/           React + Vite + TypeScript browser UI
personas/           tutor personas (YAML)
data/               conversation history (git-ignored)
tests/
```
