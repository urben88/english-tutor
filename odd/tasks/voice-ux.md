# Voice UX — hands-free talking, mute, clearer controls

Objective: talk to the tutor without holding a button (automatic end of turn on silence), mute the mic, and make the controls clearer and nicer to use.
Branch: `feat/voice-ux`, stacked on `feat/shared-models` (unpushed) · Delivery: ask-on-risk · Test runners: frontend `npm test` and `npm run build` in `frontend/`; backend `uv run pytest -m "not integration"` (backend is not expected to change).

## Specs

- **S1 — Hands-free mode (default).** User (L1): "que pueda no mantener el botón, simplemente estar hablando". User choice (L2): "Continuo y automático (Recomendado)": the mic stays open; when the user stops talking (about 1 s of silence) the phrase is sent on its own. While the tutor is thinking and while its reply plays, the mic is paused so it does not hear itself; listening resumes automatically after playback ends.
  - Voice activity detection in the browser with Web Audio (RMS energy over short frames against a threshold, no new heavy dependency). Speech starts after a short run of voiced frames; the utterance ends after ~1000 ms of silence (constant, easy to tune). Utterances shorter than 0.3 s of speech are discarded (same rule as hold-to-talk). Keep ~300 ms of pre-roll audio so the first syllable is not cut.
  - Each utterance is encoded with the existing WAV encoder (`frontend/src/audio/wav.ts`) and sent through the existing turn API / `useTutor` flow — reuse, do not duplicate.
  - The mic stream is requested once when hands-free starts and released when the mode is turned off or the page unloads.
- **S2 — Mute.** User (L1): "silenciar el micro". A mute toggle button: while muted nothing is recorded or sent (audio frames are ignored) and the UI shows it clearly (icon + label "Muted"). Keyboard shortcut `M` toggles mute when focus is not in the text input. Muting in the middle of an utterance discards that utterance.
- **S3 — Mode switch.** Assumption (not asked by the user, keeps the existing feature): a switch between "Hands-free" (default) and "Hold to talk" (the current behavior, Space key and button kept as today). The chosen mode is remembered in `localStorage` (wrapped in try/catch).
- **S4 — Clear status and controls.** User (L1): "mejorar lo que es la interfaz y la usabilidad, es decir, los botones, el cómo hablo". Assumptions for the concrete design:
  - One status indicator always visible: "Listening", "Hearing you…" (speech detected), "Thinking…", "Speaking", "Muted", with distinct color/icon; a live mic level meter while listening.
  - A "Stop" button to cut the tutor's reply playback (then listening resumes in hands-free mode).
  - Buttons: consistent sizes, icons with text labels, visible focus rings, disabled states, `aria-pressed` on toggles, `aria-live` on the status. Works at phone width. Keep the existing atomic design / container-presentational structure and existing components (`Button`, `TalkButton`, `Controls`); add new atoms/molecules where needed.
  - Mic permission denied or no mic → a clear message, and the text input still works.
- **S5 — Tests (Vitest + Testing Library, no real mic).** VAD logic as a pure, testable unit fed with synthetic frames: speech then ≥1 s silence → one utterance emitted; short blip < 0.3 s → nothing; pre-roll included; muted → nothing emitted. Hands-free flow with fakes: listening pauses while thinking/speaking and resumes after playback ends. Mute toggle via button and `M` key (not when typing in the input). Mode switch persists. Existing tests keep passing (hold-to-talk still ignores < 0.3 s). Real mic behavior is a manual check.
- **S6 — Docs.** README: how hands-free, mute (`M`), Stop and the mode switch work.

## Tasks

| ID | Specs | Route | Status | Commit |
|---|---|---|---|---|
| T1 | S1, S2, S5 | delegated (resolutor; context backstop + cost rule) | done | 1b70599 |
| T2 | S3, S4, S5, S6 | delegated (same resolutor, sequential) | done | 739dcfb |

## Log

- **L1 (2026-10-30, user):** "Quiero mejorar lo que es la interfaz y la usabilidad, es decir, los botones, el cómo hablo, que pueda no mantener el botón, simplemente estar hablando, silenciar el micro..."
- **L2 (2026-10-30, user choice):** Voice mode → "Continuo y automático (Recomendado)" — "El micro queda abierto: cuando dejas de hablar (~1 s de silencio) envía la frase sola. Mientras el tutor responde, el micro se pausa para que no se escuche a sí mismo."
- **L3 (2026-10-30, T1):** VAD (`audio/vad.ts`), `audio/mic.ts`, `useHandsFree`, `useMute`, `useTutor.speaking/stopSpeaking`, `Player.play` now resolves at end + `stop()`. RED observed for VAD, hands-free and speaking tests. Frontend `npm test` and `npm run build` pass. Commit 1b70599 (S1, S2, S5).
- **L4 (2026-10-30, T2):** Mode switch (localStorage `voiceMode`), status pill + level meter, Mute/Stop buttons, mic-denied message, README. App tests added (hands-free flow, mute button/M, Stop, mode persistence, mic denied). `npm test` 35 pass, build ok, backend `pytest -m "not integration"` 107 pass. Commit 739dcfb (S3, S4, S5, S6).
