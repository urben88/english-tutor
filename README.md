# English Tutor

A fully local English conversation tutor. The backend is hexagonal: speech-to-text, the language model
and text-to-speech are swappable ports, so a local model can later be replaced by an API-backed one
without touching the core.

Phase 1 (this repo state): ports, local adapters, config-driven selection, latency benchmark.

| Port | Local adapter | Engine |
|---|---|---|
| STT | `whisper_cpp` | whisper.cpp via `pywhispercpp` (large-v3-turbo q8_0) |
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
