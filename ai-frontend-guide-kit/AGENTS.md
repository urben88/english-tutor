# AI Frontend Guide

This folder is a **guided, self-contained kit** for agents (and humans) that build frontend UX/UI. Its purpose: **reuse what already exists before creating anything from scratch** — and decide the experience direction before choosing visuals.

## What you have here

- A catalog of **4,287 reusable UI entries** from **34 verified sources** (updated 2026-10-04; ranked by a quality score, with Vue/Svelte ports and icon/illustration/kit resources under the `assets` category), organized in 21 categories.
- An **experience direction layer** (`experience/`): archetypes, philosophies, styles with limits, an adaptive question bank, reference cards with saved ideas, an interactive discovery loop (`DISCOVERY-LOOP.md`) and a machine-readable `experience-manifest.json` for Laya.
- Per-entry decision data: what it is, when to use it, where to find it, how to install it and its license constraints.
- A standardized reuse-first workflow in three on-demand phases (router in `guides/00`, guides 00–11).
- Two local query tools (`tools/find.mjs`, `tools/get.mjs`) that answer with minimal output, plus a local Excalidraw MCP server (`tools/excalidraw-mcp.mjs`, no dependencies) for the UX map.
- A generic agent skill (`skills/ai-frontend-guide/SKILL.md`) that teaches this workflow to Codex/OpenAI, Claude Code, OpenCode and other agent harnesses, plus a total-polish skill (`skills/frontend-polish/SKILL.md`) and a visual map skill (`skills/ux-map/SKILL.md`).

## Golden rule

> **Before writing any component, form, section or animation from scratch: search this catalog.**
> **Before choosing colors or components: choose the experience direction.**

Only if nothing fits (or the license blocks you), build custom — and follow `guides/08-PHILOSOPHY.md`.

## How to use (token-efficient layers)

| Layer | Read / run | Cost |
|---|---|---|
| 0 · Awareness | this file | ~1 page |
| 1 · Guide | only the guide for the current phase/step (`guides/00` … `10`) | ≤ ~120 lines |
| 2 · Knowledge | `experience/*.md` and `experience/references/INDEX.md`, on demand | per topic |
| 3 · Query | `node tools/find.mjs ...`, `node tools/get.mjs <id>`, Laya dry-runs | < 1 KB each |
| 4 · Detail | `catalog/sources/<source>.json` or the official docs URL | only when needed |

Never load all `catalog/sources/*.json` files into context. Never read `install-guides.md` end-to-end — jump to the section of the chosen source. Never paste the whole `experience-manifest.json`; query it.

## Route first (intake)

Before touching code, ask the user what they want and declare the route: new frontend (phases 1→2→3), direction only (`guides/01-EXPERIENCE-DIRECTION.md`), small change or custom addition (`guides/10-ITERATE.md`), polish only (phase 3), UX only (`guides/02-UX-FLOWS.md`). **The phases are entry points, not a fixed pipeline** — never run a phase the user did not ask for.

## Workflow map (three phases)

| Phase | Guide | Output |
|---|---|---|
| 0 · Intake | `guides/00-START-HERE.md` | route declared + flow map |
| 1 · UX & theory | `guides/01-EXPERIENCE-DIRECTION.md` | `EXPERIENCE-BRIEF.md` (archetype, philosophy, journey, IA, 3 directions, visual brief) |
| 1 · UX & theory | `guides/02-UX-FLOWS.md` | context + `PRODUCT.md` + `UX-SPEC.md` + `flow-report.html` + `ux-map.excalidraw` (4 paths) |
| 1 · UX & theory | `guides/03-TOKENS.md` | `DESIGN.md` + Tailwind v4 theme from the visual brief (Figma MCP or fallback) |
| 2 · Composition | `guides/04-INVENTORY.md` … `guides/07-ADAPT.md` (+ `08` while composing) | inventory, shortlist, reuse/adapt/build + install, adapted components |
| 3 · Total polish | `frontend-polish` skill + `guides/08-PHILOSOPHY.md` + `guides/09-VERIFY.md` | external audits + Playwright MCP loop + E2E/visual checks green |
| Iterate | `guides/10-ITERATE.md` | small changes and custom additions without repeating the UX phase |
| Visual feedback (optional) | `guides/11-VISUAL-FEEDBACK.md` | the user points at elements in the browser (Agentation MCP) and the agent changes exactly those |

## Query examples

```bash
node tools/find.mjs --category hero --stack react --commercial
node tools/find.mjs --text marquee --limit 8
node tools/get.mjs magicui-micro-interactions-marquee
```

Before closing a selection, present 2–3 **combinations** with their rationale and the facts from `get`; web-discovered components stay `provisional` until their license is verified on the origin page (`experience/DISCOVERY-LOOP.md`, phase B).

## Laya (local decision engine — optional accelerator)

Laya is a fast decision model with **calibrated probabilities** that runs entirely on this PC (no server). It ranks three things: **questions** of the direction phase, **direction** candidates (archetypes, philosophies, styles) and **components** of the catalog. For components, `--direction <id>` injects the chosen direction into the ranking state so the fit matches the UX.

```bash
python tools/laya_select.py --check       # ready? (exit 0 = usable on this PC)
python tools/laya_select.py --install     # only if missing (first run downloads checkpoints, ~0.1-1.7 GB)
# questions (state = the brief in progress)
python tools/laya_select.py --dataset experience --kind question --task next-question \
  --context-file ai-frontend-output/ux/EXPERIENCE-BRIEF.md --confirmed
# direction (archetype/philosophy/style)
python tools/laya_select.py --dataset experience --kind archetype --task direction \
  --context-file ai-frontend-output/ux/EXPERIENCE-BRIEF.md --confirmed
# components (default dataset) — pass the chosen direction so fit matches the UX direction
python tools/laya_select.py --need "pricing table with monthly/anual toggle" --category pricing --commercial \
  --direction <experience-id> --context-file ai-frontend-output/ux/EXPERIENCE-BRIEF.md --confirmed
```

Rules:

- **Consent once per session:** ask the user at the start of the phase, record `laya_consent` in `EXPERIENCE-BRIEF.md`, then use `--confirmed` per call; a revocation returns to the deterministic fallback. Never run the model without consent.
- **Facts vs opinion:** licenses, compatibility, install commands and manifest fields always come from the catalog/manifest; Laya only scores semantic fit.
- Treat probabilities as **relative** between candidates; if the top score is low the script says so — compare alternatives or broaden filters.
- If Python/Laya is unavailable, continue with the question tree, the heuristic tables in `experience/` and `find`/`get`. Never block the workflow on Laya.
- Pre-filter is deterministic and mandatory: non-commercial entries never reach the model for commercial projects.

## UX phase first (`ai-frontend-output/ux/`)

Before any UI work, run the direction phase (`01`) and the UX phase (`02`) with the bundled UX flow skills (`userflow` + 15 `flow-*`, proven patterns for auth, onboarding, checkout, paywall, settings, navigation, tables, forms, errors, empty states, AI chat…):

```bash
node tools/context.mjs        # scans the repo → ai-frontend-output/ux/REPO-CONTEXT.md (incl. ux_present)
```

Then:

1. Follow `guides/01-EXPERIENCE-DIRECTION.md`: adaptive questions (rounds of 3–5, `experience/QUESTION-BANK.md`) → archetype/philosophy/journey/IA → three directions (safe/differentiated/experimental) → `EXPERIENCE-BRIEF.md`. Gate before the flows. (Recommended) run the discovery loop first: `experience/DISCOVERY-LOOP.md` phase A proposes example sites with their structure, asks which the user likes, saves screenshots in `ai-frontend-output/ux/references/` and records picks with `--ref "reference:<slug>"`.
2. Follow `guides/02-UX-FLOWS.md`:
   - **No UX detected** → design from scratch with the `userflow` dispatcher (load 1–4 `flow-*` skills, never from memory) → `UX-SPEC.md` + `flow-report.html` + `ux-map.excalidraw`.
   - **UX exists** → **ask the user once**: *Summarize* (as-is documentation + anti-pattern audit, no changes) or *Radical redesign* (baseline → ideal UX → diff). Never redesign silently. Redesign is UX-only: `PRODUCT.md` stays.
   - **Single surface** → spot audit via `/userflow audit …` (findings only).
   - **BMAD / spec-driven repos** → read `guides/ADAPTERS.md`. Detection is automatic (`Framework:` in `REPO-CONTEXT.md`): with a BMAD PRD, use it as the business anchor and cite stories with `--ref "story:<id>"`; with OpenSpec, specs are the behavioral source of truth and decisions cite `--ref "spec:<capability>"`.

Either path ends with the **visual screen map** (skill `ux-map` + local Excalidraw MCP): `ai-frontend-output/ux/ux-map.excalidraw`, template chosen by the brief's `navigation_model` (`one-page`, `flow`, `hub`, `catalog`, `console`, `tree`), areas/colors from the brief IA and a legend with the direction (+ `P(fit)` when Laya ranked). Redesign snapshots `ux-map-baseline.excalidraw` first and updates the map incrementally.

Gate: do not start the UI steps until `EXPERIENCE-BRIEF.md` has the chosen direction and `UX-SPEC.md` lists screens with empty/loading/error states and flows, and `ux-map.excalidraw` matches both. The UI inventory and `memory.mjs --screen/--block` come from it.

## Total polish phase (`frontend-polish` + Playwright MCP)

Before closing any screen, run the `frontend-polish` skill: external audits when installed (impeccable, taste-skill, emilkowalski), the Playwright MCP loop (a11y snapshot, states, console, keyboard, reduced motion, responsive) and the `@playwright/test` regression of `guides/09-VERIFY.md`. The installer configures Playwright MCP for detected harnesses; the browser installs once with `npx playwright install chromium`. Fallback: the checklist in `guides/08-PHILOSOPHY.md`.

Optional human round (React projects): the user can click the elements to change with Agentation; the agent processes the annotations through its MCP (`guides/11-VISUAL-FEEDBACK.md`, which also holds the install message: `npm install agentation -D` + `claude mcp add agentation -- npx -y agentation-mcp server`). Offer it during composition for fine adjustments and at the end of polish; never require it.

## Selection memory (`ai-frontend-output/`)

Every decision is recorded and reusable. The folder lives next to the kit and **survives kit refreshes** — never store memory inside `ai-frontend-guide-kit/`.

```bash
node tools/memory.mjs combo list        # check saved combinations BEFORE searching
node tools/memory.mjs add --screen landing --block hero --need "..." --decision reuse --id <entry-id> --style gradient,dark
node tools/memory.mjs add --screen experience --block direction --need "..." --decision adapt --ref "direction:<id>"
node tools/memory.mjs list              # recent decisions
node tools/memory.mjs combo save saas-landing-v1 --note "..."   # snapshot for reuse
node tools/memory.mjs combo apply saas-landing-v1                # reuse in this project
```

Rules:

- Check `combo list` before searching the catalog; reuse existing combinations when they fit.
- Record every decision with `add` right after choosing (facts come from the catalog).
- References, likes and directions can be recorded without `--id` using `--ref` (e.g. `--ref "reference:<slug>"`).
- `ai-frontend-output/SUMMARY.md` is the generated summary of styles and components extracted.

## License discipline

- `license_type: non-commercial` → **do not use in commercial work** (permission required).
- `license_type: unknown` → verify on the component page before production.
- `commercial_use: conditional` → read `limits` in `get` output first.
- This kit never ships third-party component code; it only stores metadata and links.
