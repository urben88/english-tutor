# Shared models — load each model once per machine, plus a double-click launcher

Objective: english-tutor stays independent, but never loads a second copy of a model another tool already serves; whatever it starts, it starts as a shared service others can use.
Branch: `feat/shared-models`, stacked on `feat/phase-3-web-ui` (unpushed) · Delivery: ask-on-risk · Test runners: backend `uv run pytest -m "not integration"`; frontend `npm test` and `npm run build` in `frontend/`.

## Specs

- **S1 — LLM: share Ollama's loaded model and its context window.** User (L3): "compartir la ventana de contexto. Si uso una herramienta, pues la ventana de contexto usará esa herramienta. Y si no, la usará la otra."
  - Before each request, `OllamaLLM` queries `GET <base_url>/api/ps`. If the configured model is already loaded, the request uses that loaded instance's `context_length` as `num_ctx` (so Ollama never reloads it), whatever `config.yaml` says. If it is not loaded, or `/api/ps` fails, it uses the configured `num_ctx` (current behavior).
  - Never shorten the loaded model's lifetime: if it is loaded, the request's `keep_alive` must not make it expire earlier than its current `expires_at` (for example send `-1` when it expires more than a year from now, else the remaining seconds, whichever is longer than the configured keep-alive). If not loaded, use the configured `keep_alive` (new optional adapter param; when absent, do not send the field — current behavior).
  - The prompt budget (`ContextBudget`, `backend/core/context.py`) must follow the effective `num_ctx`, not only the configured one: expose the effective context from the adapter (for example a `context_size()` method or property) and use it where the budget is built (API `build_services` and the CLI). Keep the core free of third-party imports.
- **S2 — STT: reuse a running whisper-server, else start one as a shared service.**
  - If `whisper-server` is reachable at `host:port`, use it (current behavior).
  - If not and the new optional params `exe_path` and `model_path` are set (`autostart` defaults to true when both are set), start it as a detached background process with the same arguments as `START_HINT` (`-m <model_path> --host <host> --port <port> -l <language> -ml 1 -sow`), wait until it answers (bounded timeout, about 60 s), then use it. It is NOT stopped when english-tutor exits (other tools may be using it). If it cannot start or does not answer in time, raise the existing clear `ConnectionError` with the start hint.
  - `config.yaml`: set `exe_path: '%LOCALAPPDATA%\english-tutor\whisper-cuda\Release\whisper-server.exe'` (expand env vars) and `model_path: 'C:\Users\tirol\AppData\Roaming\com.pais.handy\models\ggml-large-v3-turbo-q8_0.bin'`.
- **S3 — TTS: one shared Supertonic server.**
  - New standalone module `backend/services/tts_server.py` (`python -m backend.services.tts_server --model-dir <dir> --host 127.0.0.1 --port 8179`): loads `SupertonicTTS` once and serves `GET /health` and `POST /synthesize` with JSON `{"text", "voice"?, "speed"?}` → `audio/wav` (16-bit PCM, its sample rate in the header). It is a generic local HTTP service; any tool can call it.
  - New adapter `supertonic_server` (registered in `backend/adapters/registry.py`), params `host`, `port`, `model_dir`, `voice`, `steps`, `autostart` (default true): if the server is reachable, use it; if not and autostart, start it detached with the current Python interpreter (`sys.executable -m backend.services.tts_server ...`), wait until healthy (bounded timeout), and use it; never stops it on exit. If it still cannot be reached, fall back to loading `SupertonicTTS` in-process (current behavior) and log a warning once.
  - `config.yaml` switches `tts.adapter` to `supertonic_server` (port 8179); the in-process `supertonic` adapter stays available.
  - Reuse the existing WAV encode/decode helpers (`backend/api/wav.py`) and the process-start/wait helper shared with S2 — one helper, not two copies.
- **S4 — Double-click launcher.** User (L3): "genera un launcher en CMD para darle doble clic y poder arrancarlo directamente."
  - `Iniciar.cmd` at the repo root, runnable by double click from Explorer (it `cd`s to its own folder). Checks `uv` is installed (clear message and pause if not). If `frontend\dist\index.html` is missing, builds the UI (`npm install` if `node_modules` is missing, then `npm run build`; clear message and pause if `npm` is missing). Starts `uv run uvicorn backend.api.app:app --host 127.0.0.1 --port 8765`, opens `http://127.0.0.1:8765` in the default browser once `/health` answers, and keeps the console open showing the server log. If port 8765 is already serving english-tutor, just open the browser.
  - Ollama itself is not started by the launcher (it is the user's shared service); if it is not reachable, the launcher prints a one-line warning.
- **S5 — Tests.** No real models, processes or network: `httpx.MockTransport` (or equivalent fakes) for `/api/ps` adoption (loaded with other `context_length` → that value is sent; not loaded → configured `num_ctx`; `/api/ps` error → configured), keep-alive never shortened, effective context feeds the budget; STT/TTS "reachable → no process started", "unreachable + autostart → starts once with the expected argv, then uses it", "start fails → clear error" (STT) / "→ in-process fallback" (TTS) with the process launcher injected/mocked; TTS server `/synthesize` with a fake TTS through FastAPI `TestClient` (WAV round-trip). Existing tests keep passing; the core forbidden-import test still passes.
- **S6 — Docs.** README: short "Shared models" section (what is reused, what is started and left running, ports 11434/8178/8179, how to stop the shared servers) and how to use `Iniciar.cmd`. Update config comments.

## Tasks

| ID | Specs | Route | Status | Commit |
|---|---|---|---|---|
| T1 | S1, S5, S6 | delegated (resolutor, context backstop + cost rule) | done | 95377ae |
| T2 | S2, S3, S5, S6 | delegated (same resolutor, sequential) | done | df7711a |
| T3 | S4, S6 | delegated (same resolutor, sequential) | done | (T3 commit) |

## Log

- **L1 (2026-10-30, user):** "más a la hora de cargar los modelos quiero que compruebes que ya están cargados si ya están cargados en la parte que lo cargue sino que los utilices si están cargados ya en ram o en uvram porque los suelo usar para otra herramienta"
- **L2 (2026-10-30, user):** "No quiero que dependa de ese proyecto, quiero que el otro sea independiente, pero actualmente como mi ordenador está usando el mismo, está cargando Whisper, pues no quiero reutilizarlo. Que lo usen las dos herramientas a la vez. Ese es mi objetivo, que no cree varias instancias solo por valer aplicación."
- **L3 (2026-10-30, user):** "Exacto, compartir la ventana de contexto. Si uso una herramienta, pues la ventana de contexto usará esa herramienta. Y si no, la usará la otra. Y además quiero que ahora, como has acabado, que generes un launcher en CMD para darle doble clic y poder arrancarlo directamente."
- **L4 (analysis):** Ollama is already shared; it reloads a model when a request's `num_ctx` differs from the loaded one. Handy (asistente-voz-local) loads Whisper in-process and exposes no transcription endpoint (its settings only have `selected_model`, `transcribe_accelerator`, `transcribe_gpu_device`), so english-tutor cannot share Handy's Whisper; it shares any running whisper-server instead. The `lector` loads Supertonic in-process; it can share the new TTS server only if it is changed to call it (out of scope, asistente-voz-local stays independent).
- **L5 (T1 evidence):** RED: 7 new tests failed before the change; GREEN: `uv run pytest -m "not integration" -q` 92 passed. Budget follows `llm.context_size()` via `ContextBudget.for_llm` (API and CLI); it is computed once at startup.
- **L6 (T2 evidence):** RED: test module failed to import before the code; GREEN: 107 passed. One shared helper `backend/adapters/process.py` (`ensure_running`, `spawn_detached`) used by STT and TTS. STT probes in the constructor (autostart) and keeps the clear ConnectionError on failure. `tests/test_registry.py` now expects `supertonic_server` as the repo default TTS.
- **L7 (2026-10-30, user):** "el puerto de 8000 creo que ya lo tengo en uso entonces pongo otro" -> web port 8765 (S4, Iniciar.cmd, Vite proxy, README). 8178 and 8179 unchanged.
- **L8 (T3 evidence):** `Iniciar.cmd` (CRLF) written and read back; branches checked structurally (uv missing -> message+pause, already running -> open browser, UI build, Ollama warning, background browser opener). Not double-clicked or run end to end.
