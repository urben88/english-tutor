# 00 — Start Here (router)

You are about to build or change frontend UX/UI. This workflow exists so you **reuse before you create**, and so every design decision is deliberate instead of generic.

## Intake (always first)

Before touching code, ask the user what they want and route explicitly:

1. **What are we doing?** New frontend · direction only · small change · custom addition · polish only · UX only/redesign.
2. **What exists?** Run `node tools/context.mjs` and read `ai-frontend-output/ux/REPO-CONTEXT.md` (stack, screens, `ux_present`) instead of exploring the repo.
3. **Declare the route** in one line (e.g. *"Route: phase 2 only — adapt the hero, then polish"*) before reading any guide.

The phases are **entry points, not a fixed pipeline**: enter where the request points and never run a phase the user did not ask for.

## The three phases

| Phase | Guides | You produce |
|---|---|---|
| **1 · UX & theory** | `01-EXPERIENCE-DIRECTION` (+ `ADAPTERS` if BMAD/spec-driven), `02-UX-FLOWS`, `03-TOKENS` | `EXPERIENCE-BRIEF.md` + context + `PRODUCT.md` + `UX-SPEC.md` + `flow-report.html` + `ux-map.excalidraw` + `DESIGN.md`/theme |
| **2 · Composition** | `04-INVENTORY`, `05-FIND`, `06-REUSE`, `07-ADAPT` (+ `08-PHILOSOPHY` while composing) | component inventory, candidate shortlist, reuse/adapt/build decisions + install, adapted components |
| **3 · Total polish** | `frontend-polish` skill + `08-PHILOSOPHY` + `09-VERIFY` | external audits, Playwright MCP loop green, E2E + visual regression green |

Phase 1 starts with the **experience direction** (`01`): adaptive questions guided by Laya → archetype, philosophy, journey, IA, three creative directions and a visual brief in `EXPERIENCE-BRIEF.md`. During `01` run the **discovery loop** (`experience/DISCOVERY-LOOP.md`): example sites with their structure, the user's likes and screenshots (saved in `ai-frontend-output/ux/references/`). Then `02-UX-FLOWS` has **four paths** depending on the repository: no UX → design from scratch; existing UX → **ask the user once** to summarize (as-is + audit) or radically redesign (UX only); or a spot audit of one surface. Never redesign silently. If the repo runs **BMAD or a spec-driven flow**, read `ADAPTERS.md` first (the PRD becomes the anchor; specs are the behavioral source of truth).

## Casuistics (minimum path)

| Request | Route |
|---|---|
| New frontend / major build | Phase 1 → 2 → 3 |
| Direction only (no UI) | `01-EXPERIENCE-DIRECTION.md` (includes the discovery loop) |
| Small change to an existing UI | `10-ITERATE.md` (do not repeat the UX phase) |
| Custom component / new feature | `10-ITERATE.md`: combinations → `find`/`get` → build with `08` → polish |
| Polish only / visual QA | Phase 3: `frontend-polish` + `09-VERIFY` |
| Specific visual tweaks the user wants to point at in the browser (React) | `11-VISUAL-FEEDBACK.md` (Agentation) |
| UX only / redesign | Phase 1 (`02-UX-FLOWS`); no UI work |
| Backend/logic only | Not this kit — skip it |

A small new project may compress **1 → 2 → 3** (tokens and philosophy can merge), but never build before checking memory + catalog.

## Tools by phase

| Tool / skill | 1 · UX | 2 · Compose | 3 · Polish |
|---|---|---|---|
| `experience/` + Laya tasks (`next-question`, `direction`) | yes | — | — |
| `experience/DISCOVERY-LOOP.md` + web search | example sites, likes, screenshots | component combinations | — |
| `userflow` + `flow-*` skills | yes | — | optional flow audit |
| `ux-map` skill + local Excalidraw MCP | direction-aware screen/navigation map | — | flow audit visual |
| Catalog + `find`/`get` + selection memory + Laya (`fit`) | — | yes | — |
| `emilkowalski` skills (if installed) | — | interactions | review/improve animations |
| `impeccable` / taste-skill (if installed) | — | — | audit + polish |
| Playwright MCP | reference discovery + extraction | render a block in isolation | visual/BUILD loop |
| `@playwright/test` (guide 09) | — | — | regression gate |
| Agentation MCP (guide 11, React, optional) | — | point-and-change on a rendered block | final human round |

Load an external skill only when its description matches what you are doing; if it is not installed, use the distilled rules of `08-PHILOSOPHY.md` and say so.

## Token discipline (mandatory)

- Read `AGENTS.md` once. Then read **only the guide for the current phase/step**.
- Start with `node tools/context.mjs` and read the compact `REPO-CONTEXT.md`.
- Query with `node tools/find.mjs …` and `node tools/get.mjs <id>`. Do not open `catalog/sources/*.json` unless the tools are insufficient.
- Load `experience/` docs on demand; never paste the whole manifest into the conversation.
- Write each step's output to a file (`EXPERIENCE-BRIEF.md`, `PRODUCT.md`, `UX-SPEC.md`, `DESIGN.md`, inventory table…) so later steps don't re-read everything.

## Done when

- `EXPERIENCE-BRIEF.md` exists with archetype, philosophy, journey, IA and a chosen direction (phase 1).
- `UX-SPEC.md` exists with screens, flows and empty/loading/error states (phase 1).
- `ux-map.excalidraw` matches `UX-SPEC.md` (names) and `EXPERIENCE-BRIEF.md` (template/areas/legend) (phase 1).
- Every UI need maps to a catalog entry, an adaptation, or a justified custom build (phase 2).
- Licenses are compatible with the project (commercial/non-commercial).
- Phase 3 closes green (`frontend-polish` + `09-VERIFY`).

Start with the intake, then open the guide of the chosen entry phase.
