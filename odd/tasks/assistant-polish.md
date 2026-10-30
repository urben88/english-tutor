# Assistant polish — 3D gestures and arms, visible mouth, textured design, faster page, mute fix

Objective: a more expressive 3D tutor, a prettier textured UI and a faster page; mute only silences speaking.
Branch: `feat/assistant-polish`, stacked on `feat/study-ui` (unpushed) · Delivery: ask-on-risk · Test runners: frontend `npm test` and `npm run build` in `frontend/`; backend `uv run pytest -m "not integration"`; 3D `3d/conversational-assistant/tools/validate_model.py`.

## Specs

- **S1 — Gestures per expression.** User (L1): "quiero que las expresiones tengan gestos el muñeco". Each character state/expression (idle / listening / thinking / speaking, plus existing expressions) plays a matching body gesture, not only a face change.
- **S2 — Arms.** User (L1): "además pueda tener brazos para moverlos". The model gets rigged arms that the gestures animate.
- **S3 — Mouth opens more.** User (L1): "que la boca se le abra más, es decir, que se note más que está hablando". Lip-sync amplitude visibly larger while speaking.
- **S4 — Polished, textured design.** User (L1, L2): "quiero que bonifiques todo"; "quiero que pulas el diseño, es decir que le pongas alguna textura que pongas texturas y que sea más bonito". Polish pass over the UI following the kit (`frontend-polish`), adding textures (UI surfaces and the 3D model materials), keeping the T1 direction (warm, video call + subtitles, light/dark).
- **S5 — Faster page.** User (L1, L2): "la página vaya más optimizada"; "optimizar para que vaya más rápido la página". Measurable: smaller initial JS (the build currently warns about a large chunk; lazy-load the 3D/three code), lighter assets, no needless re-renders in the render loop. Report before/after build sizes.
- **S6 — Mute only mutes speaking.** User (L1): "quiero que pongas el botón de un mute no hace que deje de pensar, simplemente muteo el poder hablar." Mute silences the microphone input only; a tutor turn already in progress (thinking / speaking) continues.
- **S7 — Commit everything.** User (L1): "y que comites". Work-unit commits on the feature branch; tests and docs with the behavior.

## Tasks

| ID | Specs | Route | Status | Commit |
|---|---|---|---|---|
| T0 | S7 | inline | done | c2ba798 (user's 3D work committed as-is; tests 68/68, build ok) |
| T1 | S1, S2, S3, S4 (model textures) | delegated (resolutor), parallel with T2, disjoint surface `3d/` | pending | |
| T2 | S4 (UI), S5, S6 | delegated (resolutor), parallel with T1, surface `frontend/` | pending | |
| T3 | S7 | inline: seam check (full suites) + integrate new GLB | pending | |

## Log

- **L1 (2026-10-30, user):** "Vale, quiero que bonifiques todo y que comites. Además que quiero que las expresiones tengan gestos el muñeco, además pueda tener brazos para moverlos, la página vaya más optimizada y que la boca se le abra más, es decir, que se note más que está hablando. Y quiero que pongas el botón de un mute no hace que deje de pensar, simplemente muteo el poder hablar."
- **L2 (2026-10-30, user):** "si exacto, quiero que pulas el diseño, es decir que le pongas alguna textura que pongas texturas y que sea más bonito además de optimizar para que vaya más rápido la página"
- **L3 (2026-10-30):** Branch `feat/assistant-polish` created from `feat/study-ui`; the user's uncommitted 3D work committed as T0. Writer reason for T1/T2: parallel independent units with disjoint surfaces, each several files.
