# ai-frontend-guide-kit — README

Self-contained guided kit for building frontend UX/UI with a reuse-first workflow. Copy this folder into any frontend repository and point your AI agent to `AGENTS.md`.

## Copy into a project

1. Copy the whole `ai-frontend-guide-kit/` folder to the target repository root (keep the folder intact).
2. Tell the agent: *"Read `ai-frontend-guide-kit/AGENTS.md` and follow its workflow."*
3. Optional: add a pointer in the project's own `AGENTS.md`:

```markdown
## Frontend UI
Before creating UI components, follow `ai-frontend-guide-kit/AGENTS.md` (reuse-first workflow).
```

Prefer the installer (`npm i -D github:urben88/ai-frontend-guide-kit` + `npx ai-frontend-guide-kit`): it copies this folder, creates `ai-frontend-output/`, patches `AGENTS.md`, installs the 19 skills of the repo cleanly into `.agents/skills/` (plus `.claude/skills/` when a `.claude/` folder exists), installs the 3 external design skills via their CLI (`--no-design-skills` to skip) and configures the Playwright + Excalidraw MCP servers for detected harnesses (`--no-mcp` to skip).

Requirements: none for reading the guides or catalog. The query tools need Node.js ≥ 18; no npm packages are required.

## Structure

```
ai-frontend-guide-kit/
├── AGENTS.md              # awareness layer: scope, golden rule, navigation
├── README.md              # this file (copy + integration instructions)
├── guides/                # 00-START-HERE (router: intake + 3 phases) … 10-ITERATE (small changes), 11-VISUAL-FEEDBACK (Agentation)
├── experience/            # direction layer: manifest, question bank, archetypes, philosophies,
│                          # styles, reference protocol, discovery loop, experience-manifest.json, references/
├── catalog/
│   ├── component-manifest.json   # light index (sources, counts, paths)
│   ├── component-manifest.md     # readable index
│   ├── taxonomy.md               # category definitions + source mappings
│   ├── install-guides.md         # install/code retrieval per source
│   ├── schema.json               # entry schema
│   └── sources/*.json            # 34 source files (4,287 entries), explorer.html, license-report.md
└── tools/
    ├── context.mjs        # repo context for the UX phase (REPO-CONTEXT.md)
    ├── find.mjs           # filtered catalog search (short output)
    ├── get.mjs            # full decision card for one entry
    ├── memory.mjs         # selection memory: history, summary, combinations
    ├── excalidraw-mcp.mjs # local, dependency-free Excalidraw MCP for the UX map
    └── laya_select.py     # local Laya ranking (questions/direction/components; Python >= 3.10)
```

## Experience direction first (`experience/`)

Before flows or visuals, guide `01-EXPERIENCE-DIRECTION` turns the brief into `ai-frontend-output/ux/EXPERIENCE-BRIEF.md`: adaptive questions in rounds (`QUESTION-BANK.md`), archetype (`SITE-ARCHETYPES.md`), philosophy (`UX-PHILOSOPHIES.md`), journey/IA, three creative directions (safe/differentiated/experimental) and a visual brief. `STYLE-DIRECTIONS.md` carries the style limits and the anti-generic list; `references/` stores the extracted idea cards (`REFERENCE-PROTOCOL.md`). Laya can rank the next question and the direction candidates from `experience-manifest.json` (consent once per session).

## Reference discovery (`experience/DISCOVERY-LOOP.md`)

An interactive loop to choose with the user instead of guessing: the agent proposes an *idea deck* of example sites with their structure, asks which the user prefers and what they highlight while browsing (with Playwright MCP when wanted), collects screenshots into `ai-frontend-output/ux/references/` and records the picks in the brief and in memory. Guide `05` closes the component search with **2–3 combinations** with rationale and catalog facts; web-discovered components stay `provisional` until their license is verified. Bounded rounds and non-blocking fallback (registry + user URLs) keep it token-cheap.

## UX flows first (`ai-frontend-output/ux/`)

The kit ships **16 vendored UX skills** (MIT, from `jpoindexter/ux-flow-skills`): the `userflow` dispatcher plus 15 `flow-*` skills (auth, onboarding, checkout, paywall, settings, navigation, app shell, tables, search, forms, errors, empty states, permissions, sharing, AI chat). Guide `02-UX-FLOWS` runs before any UI work, after the experience direction:

- `node tools/context.mjs` → `REPO-CONTEXT.md` (includes whether the repo already has UX).
- **No UX** → design from scratch with `userflow` → `UX-SPEC.md` + `flow-report.html` + `ux-map.excalidraw`.
- **UX exists** → ask the user: *Summarize* (as-is + audit) or *Radical redesign* (baseline + ideal UX + diff, UX only). Never redesign silently.

The `ux-map` skill draws the living map (one node per screen or section with its CTA/key blocks, one labeled arrow per navigating action) as `ux-map.excalidraw` through the local Excalidraw MCP (`tools/excalidraw-mcp.mjs`, offline). Its template comes from the brief's `navigation_model` (`one-page`, `flow`, `hub`, `catalog`, `console`, `tree`), areas/colors from the brief IA, and the legend carries the direction (+ `P(fit)` when Laya ranked). It updates incrementally and snapshots `ux-map-baseline.excalidraw` before a redesign. The UI inventory and `memory.mjs --screen/--block` derive from `UX-SPEC.md`.

## Total polish phase (`frontend-polish` + Playwright MCP)

The kit workflow ends with phase 3, run by the sibling `frontend-polish` skill: external audits when installed (`impeccable`, taste-skill, emilkowalski), an interactive Playwright MCP loop (a11y snapshot, states hover/focus/loading/empty/error, console, keyboard, reduced motion, responsive) and the `@playwright/test` regression of `09-VERIFY`. Without those tools, it falls back to the distilled checklist of `08-PHILOSOPHY`. Browse installs once with `npx playwright install chromium`.

## Selection memory (`ai-frontend-output/`)

Created next to the kit by the installer and **preserved on refreshes**: append-only history (`selections.jsonl`), named reusable combinations (`combinations.json`) and a generated styles/components summary (`SUMMARY.md`).

```bash
node tools/memory.mjs combo list          # check saved combinations before searching
node tools/memory.mjs add --screen landing --block hero --need "..." --decision reuse --id <entry-id> --style gradient,dark
node tools/memory.mjs add --screen experience --block reference --need "..." --decision adapt --ref "reference:<slug>"
node tools/memory.mjs combo save saas-landing-v1 --note "..."
node tools/memory.mjs combo apply saas-landing-v1
```

## Laya (optional local ranking)

`tools/laya_select.py` ranks **questions**, **experience directions** and **components** with calibrated probabilities, running entirely on this PC:

```bash
python tools/laya_select.py --check     # environment status
python tools/laya_select.py --install   # pip install -U laya (first run downloads checkpoints)
# after the user consents once per session:
python tools/laya_select.py --dataset experience --kind question --task next-question \
  --context-file ai-frontend-output/ux/EXPERIENCE-BRIEF.md --confirmed
python tools/laya_select.py --dataset experience --kind archetype --task direction \
  --context-file ai-frontend-output/ux/EXPERIENCE-BRIEF.md --confirmed
python tools/laya_select.py --need "pricing table with monthly toggle" --category pricing --commercial \
  --direction <experience-id> --context-file ai-frontend-output/ux/EXPERIENCE-BRIEF.md --confirmed
```

`--direction <id>` injects the chosen archetype/philosophy/style into the component ranking state so the fit matches the UX direction (`experience/experience-manifest.json`); a wrong id warns and continues.

**Ask before using it:** Laya is optional and never runs by default; ranking requires `--confirmed` as proof of the user's consent (without it the script exits with code 3 and does not load the model). Record the session consent in `EXPERIENCE-BRIEF.md`. Facts (licenses, install commands, manifest fields) always come from the catalog/manifest; Laya only scores semantic fit. Without Python/Laya the kit works the same through the question tree and `find`/`get`.

## Updating the kit

The catalog is generated in the factory repo (`PilaresAplicaciones/Diseño`):

```bash
node tools/refresh.mjs <source_id>   # refresh one source
node tools/build-index.mjs           # rebuild the light index
node tools/build-kit.mjs             # re-sync catalog into ai-frontend-guide-kit/
node tools/validate.mjs              # schema + consistency check
```

Copy the updated folder again into projects when the catalog changes. Each entry records `verified_at` so agents know the data's age.

## Rules of engagement

- Reuse or adapt before creating (see `guides/06-REUSE.md`).
- Polish before closing a screen: `frontend-polish` + `guides/09-VERIFY.md`, never ship an unverified draft.
- Respect `license_type` / `commercial_use` / `limits` (see `AGENTS.md`).
- Keep high-impact animations to 1–2 per view (see `guides/08-PHILOSOPHY.md`).
- Do not paste third-party component source into this kit — the catalog stores metadata and links only; the vendored UX skills keep their own MIT license (see `skills/UX-SKILLS-LICENSE` in the repository).
