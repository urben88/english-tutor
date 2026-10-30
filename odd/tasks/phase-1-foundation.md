# Phase 1 — Hexagonal foundation and local model adapters

Objective: hexagonal skeleton with swappable STT / LLM / TTS ports, local adapters, config-driven selection and a latency benchmark.
Branch: `feat/phase-1-foundation` · Delivery: ask-on-risk · Test runner: `uv run pytest` (Python 3.12, managed by uv).

## Specs

- **S1 — Hexagonal layout.** Python backend managed with `uv` (`pyproject.toml` at repo root). Layout:
  `backend/core/` (domain models, ports, use cases — no imports from adapters or third-party model libs),
  `backend/adapters/{stt,llm,tts}/`, `backend/api/` (empty FastAPI app with `GET /health` only), `config.yaml`, `personas/`, `tests/`.
  User request: "quiero que también pueda ser reemplazable y que sea una especie de harness, en el cual luego puedo usar por API Key otro modelo para hacer la misma tarea".
- **S2 — Ports (in `backend/core/ports.py`), small contracts:**
  - `SpeechToText.transcribe(audio: AudioClip) -> Transcript` (text + per-word items with start, end, confidence when available).
  - `LanguageModel.generate(messages: list[ChatMessage], *, json_schema: dict | None = None) -> str` and `.stream(messages) -> Iterator[str]`; `.count_tokens(text) -> int` (approximation allowed, documented).
  - `TextToSpeech.synthesize(text: str, *, voice: str | None = None, speed: float = 1.0) -> AudioClip`.
  - `AudioClip` = float32 mono samples + sample rate (domain dataclass, numpy allowed in core only as array type).
- **S3 — Local adapters:**
  - STT `whisper_cpp`: via `pywhispercpp`, model file path from config (current file on this machine: `C:\Users\tirol\AppData\Roaming\com.pais.handy\models\ggml-large-v3-turbo-q8_0.bin`), language `en`, word timestamps on.
  - LLM `ollama`: native Ollama HTTP API (`/api/chat`) so `num_ctx`, `temperature`, `num_predict` are set from config. Default model `MobiusDevelopment/gemma-4-E2B-it-qat-q4_0-gguf:latest` (already pulled). JSON mode via `format` when `json_schema` is given.
  - TTS `supertonic`: Supertonic 3, voice `M1`, ONNX Runtime CPU only. Port the logic of `C:\Users\tirol\Desktop\Proyectos\asistente-voz-local\lector\tts_supertonic.py` (pinned HF revision, sha256 checks, text normalization, download command) into the adapter with English identifiers. Model dir from config (existing copy: `C:\Users\tirol\AppData\Local\asistente-voz-local\lector\modelo\supertonic`).
- **S4 — Config-driven selection.** `config.yaml` picks one adapter per port by name plus its params; a registry/factory in `backend/adapters/registry.py` builds them. Adding an API adapter later must only require a new adapter module + registry entry, no core change. Unknown adapter name → clear error naming the valid options. Paths overridable with env vars is not required.
- **S5 — Benchmark.** `uv run python -m backend.bench` prints a table: TTS synth time + real-time factor for a fixed English sentence; STT time on that synthesized audio + transcript; LLM time-to-first-token, total time, tokens/s for a short prompt. Missing model/service → that row reports the reason, others still run.
- **S6 — Tests.** Unit tests for registry/config (valid selection, unknown name error) and a fake-adapter test proving core depends only on ports. Integration tests per real adapter marked `@pytest.mark.integration`, skipped automatically when the model file/service is unavailable. `uv run pytest -m "not integration"` must pass with no models present.
- **S7 — Docs.** Short `README.md` (Spanish OK for user-facing docs is NOT required; write English): what it is, how to install (`uv sync`), how to run bench and tests, how to swap an adapter.

## Tasks

| ID | Specs | Route | Status | Commit |
|---|---|---|---|---|
| T1 | S1, S2, S4, S6 (unit) | delegated (resolutor · Sonnet · medium — user cost rule) | done | f4f15a9 |
| T2 | S3, S6 (integration) | delegated (same worker) | done | 21d7d10 |
| T3 | S5, S7 | delegated (same worker) | done | eb41250 |

## Log

- L1 (2026-10-30, user, original request): "Quiero empezar a hacer una nueva aplicación. [...] Esta herramienta va a servir para yo tener un asistente local, todo local, en el cual voy a usar modelos de IA para poder simular a una persona que habla y aprende inglés. [...] estaría bien usar alguna librería como langgrap para tener el control total de lo que entra en el modelo local en su ventana de contexto. [...] Whisper large-v3-turbo q8_0 (~0,9 GB)  Gemma 4 E2B QAT q4_0 Supertonic 3, voz M1, en CPU"
- L2 (2026-10-30, user): "Todo esto quiero que también pueda ser reemplazable y que sea una especie de harness, en el cual luego puedo usar por API Key otro modelo para hacer la misma tarea. Pero de momento quiero hacerlo todo en local, pero pensando a futuro que sea un harness y sea desacoplable este modelo. [...] hacer, por ejemplo, clic en una palabra que me explique eso, poder seleccionar la frase entera [...]"
- L3 (2026-10-30, user): "si" — approves starting phase 1 (skeleton, three ports + local adapters, latency measurement).
- L4: Machine: RTX 3070 8 GB, uv 0.12, Node 24, no system Python, Ollama installed with the Gemma 4 E2B QAT model pulled. Word-click / selection UI and LangGraph context control are later phases.
- L5 (2026-10-30): T1-T3 done. Unit 14 passed (parent re-ran), integration 3 passed. Bench: TTS 1.16s synth (RTF 0.22); STT 13.48s for 5.3s clip (CPU, too slow for live turns); LLM TTFT 2.17s, ~147 tok/s. Deviation: Ollama adapter got `think` param (default false) because Gemma 4 thinking consumed num_predict. Next: decide STT speed fix (GPU build of whisper.cpp vs smaller model).
