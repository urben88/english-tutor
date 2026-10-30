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
- **S8 — STT on GPU.** User: "Quiero que hagas el cambio a GPU". New STT adapter `whisper_server` that talks HTTP to whisper.cpp `whisper-server.exe` from the prebuilt release asset `whisper-bin-win-cuda-12.4.0-x64.zip` (release tag `b5454`, ggml-org/whisper.cpp; driver supports CUDA 13.3). Binary lives outside the repo at `%LOCALAPPDATA%\english-tutor\whisper-cuda\`. The adapter connects to an already running server (configurable host, port; default 127.0.0.1:8178) and never spawns it; if unreachable it raises a clear error with the exact start command (exe path + model path documented in README) and must return the same `Transcript` shape (per-word start, end, confidence). `config.yaml` switches STT to `whisper_server`; `whisper_cpp` stays registered as CPU fallback. Bench STT row for 5.3 s audio must show it is faster than the CPU 13.48 s, target < 1.5 s.
- **S9 — No reasoning in Gemma.** User: "quites el razonamiento a GEMA. Lo quiero sin razonamiento". Ollama adapter default `think=False` and `config.yaml` `think: false` (already in place); add a unit test asserting the request payload sends `"think": false` by default and that `thinking` content is never returned or stored.

## Tasks

| ID | Specs | Route | Status | Commit |
|---|---|---|---|---|
| T1 | S1, S2, S4, S6 (unit) | delegated (resolutor · Sonnet · medium — user cost rule) | done | f4f15a9 |
| T2 | S3, S6 (integration) | delegated (same worker) | done | 21d7d10 |
| T3 | S5, S7 | delegated (same worker) | done | eb41250 |
| T4 | S9 | inline | done | (see L7) |
| T5 | S8, S6, S7 | delegated (resolutor · Sonnet · medium) | done | fbe3aa5 |

## Log

- L1 (2026-10-30, user, original request): "Quiero empezar a hacer una nueva aplicación. [...] Esta herramienta va a servir para yo tener un asistente local, todo local, en el cual voy a usar modelos de IA para poder simular a una persona que habla y aprende inglés. [...] estaría bien usar alguna librería como langgrap para tener el control total de lo que entra en el modelo local en su ventana de contexto. [...] Whisper large-v3-turbo q8_0 (~0,9 GB)  Gemma 4 E2B QAT q4_0 Supertonic 3, voz M1, en CPU"
- L2 (2026-10-30, user): "Todo esto quiero que también pueda ser reemplazable y que sea una especie de harness, en el cual luego puedo usar por API Key otro modelo para hacer la misma tarea. Pero de momento quiero hacerlo todo en local, pero pensando a futuro que sea un harness y sea desacoplable este modelo. [...] hacer, por ejemplo, clic en una palabra que me explique eso, poder seleccionar la frase entera [...]"
- L3 (2026-10-30, user): "si" — approves starting phase 1 (skeleton, three ports + local adapters, latency measurement).
- L4: Machine: RTX 3070 8 GB, uv 0.12, Node 24, no system Python, Ollama installed with the Gemma 4 E2B QAT model pulled. Word-click / selection UI and LangGraph context control are later phases.
- L5 (2026-10-30): T1-T3 done. Unit 14 passed (parent re-ran), integration 3 passed. Bench: TTS 1.16s synth (RTF 0.22); STT 13.48s for 5.3s clip (CPU, too slow for live turns); LLM TTFT 2.17s, ~147 tok/s. Deviation: Ollama adapter got `think` param (default false) because Gemma 4 thinking consumed num_predict. Next: decide STT speed fix (GPU build of whisper.cpp vs smaller model).
- L6 (2026-10-30, user): "Quiero que hagas el cambio a GPU y además quites el razonamiento a GEMA. Lo quiero sin razonamiento porque al final va a ocupar mucha ventana de contexto, creo yo, y nos podríamos ahorrar." No CUDA toolkit / cmake / MSVC on the machine, so prebuilt CUDA whisper-server via HTTP instead of compiling pywhispercpp.
- L7 (2026-10-30): S9 covered by tests pinning `"think": false` and that thinking content is never returned (generate and stream). Behavior already existed, so tests were green on first run (characterization, no RED). Downloading/running the external whisper.cpp CUDA binary was denied by the permission classifier; T5 waits for user permission.
- L8 (2026-10-30): Auto-mode classifier denies launching whisper-server.exe from the agent ("Code from External") and editing permission settings ("Self-Modification"). Decision: the user starts the server manually; adapter only connects (S8 updated). User started it: log shows CUDA backend on RTX 3070, model 873.6 MB in VRAM, listening on 127.0.0.1:8178 with `-l en -ml 1 -sow`.
- L9 (2026-10-30): T5 done (fbe3aa5). STT on GPU via whisper_server: 0.58 s for the 5.3 s clip (CPU 13.48 s), exact transcript, 14 word items. Parent re-ran full suite (unit + integration) against the live server. Cosmetic: bench column misaligned for the longer adapter name.
