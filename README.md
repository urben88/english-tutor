# English Tutor

A fully local English conversation tutor. The backend is hexagonal: speech-to-text, the language model
and text-to-speech are swappable ports, so a local model can later be replaced by an API-backed one
without touching the core.

Phase 1 (this repo state): ports, local adapters, config-driven selection, latency benchmark.

| Port | Local adapter | Engine |
|---|---|---|
| STT | `whisper_server` (GPU, default) | whisper.cpp `whisper-server` over HTTP, CUDA build (large-v3-turbo q8_0) |
| STT | `whisper_cpp` (CPU fallback) | whisper.cpp via `pywhispercpp` |
| LLM | `ollama` | Ollama `/api/chat` (Gemma 4 E2B QAT q4_0) |
| TTS | `supertonic` | Supertonic 3, voice M1, ONNX Runtime CPU |

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

The default STT adapter, `whisper_server`, connects to a running whisper.cpp server; it never starts it.
Install the official CUDA build once: download `whisper-bin-win-cuda-12.4.0-x64.zip` from the
[whisper.cpp release b5454](https://github.com/ggml-org/whisper.cpp/releases/tag/b5454) and extract it to
`%LOCALAPPDATA%\english-tutor\whisper-cuda\` (the exe ends up in `...\whisper-cuda\Release\`).
Start the server before running the app (keep the window open):

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
uv run uvicorn backend.api.app:app             # empty API, GET /health
```

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
backend/core/       models, ports, use cases (no adapter or model-library imports)
backend/adapters/   stt/ llm/ tts/ and registry.py
backend/api/        FastAPI app
personas/           tutor personas (later phases)
tests/
```
