# Kit verification (2026-10-02)

Evidence recorded by the factory repo (`PilaresAplicaciones/Diseño`) when this kit was generated.

## Catalog

- 16 source files, 2,470 entries, unique IDs, index consistent — `node tools/validate.mjs` → OK.
- Link check: 10 URLs sampled, 0 broken, 1 blocked (Uiverse returns 403 to non-browser clients — documented in `catalog/install-guides.md`).
- Light index size: **7,773 bytes** (budget ≤ 10 KB).

## Token budget

| Layer | Asset | Measured | Budget |
|---|---|---|---|
| 0 · Awareness | `AGENTS.md` | 117 lines | ~1 page |
| 1 · Guides | `guides/*.md` | 28–74 lines each | ≤ 120 lines |
| 2 · Query | `find.mjs` example output | 945 bytes | < 1 KB |
| 2 · Query | `get.mjs` example output | 715 bytes | < 2 KB |
| Index | `catalog/component-manifest.json` | 7.6 KB | ≤ 10 KB |

## Sandbox build (Next.js + Tailwind v4)

Fresh `create-next-app` (Next.js 16.3.8, Tailwind v4, `--src-dir`) with shadcn/ui init, then:

- `npx shadcn@latest add "https://magicui.design/r/marquee.json"` (Magic UI) ✔
- `npx motion-primitives@latest add text-effect` (installed to project root — moved to `src/components/motion-primitives/` for the `@/*` alias) ✔
- `npm i -D daisyui@latest` + `@plugin "daisyui";` (daisyUI 5.7.47 detected) ✔
- Page importing all four sources → `npm run build` compiled, type-checked and pre-rendered successfully ✔

## Clean copy test

`ai-frontend-guide-kit/` was copied to an empty directory and used from there: `find.mjs` and `get.mjs` resolved the catalog with relative paths and returned results; guides are plain Markdown. No build step, no npm install, no network required to query the catalog. ✔

## License checks (practical)

- Aceternity: free registry item → HTTP 200; premium item → HTTP 401 (excluded by the extractor). ✔
- 21st.dev: registry URL without API key → HTTP 403; the documented free quota (2 copies/installs per day) applies with an API key. ✔
- Agents Kit: repository `LICENSE.md` is a Non-Commercial License; 40 entries are flagged `commercial_use: false` in the catalog. ✔

## Refresh behavior

`node tools/refresh.mjs aicss` rewrote only `sources/aicss.json` plus the index files (verified by file hashes and modification times); the other 15 source files were untouched. Regeneration is deterministic (same input → identical bytes). ✔

## Laya integration (2026-10-02)

- `python tools/laya_select.py --check` → exit 0: Python 3.14.6, pip OK, laya 0.3.20 installed, Hugging Face cache present (~1.45 GB after first real run). ✔
- `--dry-run` with the need *"marketing hero section with animated gradient background for a SaaS landing page"* (`--category hero --commercial --top 5`) preselected 5 relevant candidates and printed the exact payload: one `noul` fit question per candidate plus one `choice` best-overall. No model import. ✔
- Real run (same need): model `english`, 5 candidates, **111.5 s** first run (includes checkpoint fetch); top result `floatui-hero-hero-section-with-gradient-background` with P(fit)=0.74, and the same candidate won the `choice` question. Lower fits went to generic heroes (Tailblocks A 0.49, DevTool Landing 0.48), matching intuition. Exit 0. ✔
- Laya emitted a runtime warning that some checkpoint temperatures are out of range and were clamped, so confidence values on those entries are uncalibrated; the script treats probabilities as **relative** rankings and shows the disclaimer. ✔
- `--install` path: verified logic (`python -m pip install -U laya` + import check); on this PC `laya` was already installed, so the command is documented rather than re-executed. ✔
- Installer `node install.mjs`: full run into a temp project installed the 16 design skills (impeccable 1 + taste-skill 1 + emilkowalski 14) into `.agents/skills/`, copied the kit, created the `AGENTS.md` pointer and ran the Laya check. Re-running refreshed the kit and skipped the existing pointer (idempotent). Windows note: `npx` needs `shell: true` in `spawnSync` (npx.cmd resolution), fixed in `install.mjs`. ✔
- `--no-skills` offline path verified: kit + pointer + Laya check only. ✔
- Clean copy test of the updated kit: `find.mjs`, `laya_select.py --check --json` and `--dry-run` ran from a copied folder in an empty directory (script-relative paths). ✔

## Laya consent gate (2026-10-02)

- Ranking without `--confirmed` → exit **3**, prints the consent instruction (ask the user, then repeat with `--confirmed`) and does **not** import Laya. ✔
- `--check` and `--dry-run` still exit **0** without consent (they do not execute the model). ✔
- Ranking with `--confirmed` (same test need as before) → exit **0**, model `english`, 5 candidates, **9.4 s** with the checkpoint cached; top result unchanged (`floatui-hero-hero-section-with-gradient-background`, P(fit)=0.76, also the `choice` pick). ✔
- Rule documented in `AGENTS.md` (first Laya rule), `guides/04-FIND.md`, both `README.md` files and the installer's closing message; the flag is also documented in the script docstring with its exit codes. ✔

## Selection memory (2026-10-02)

- `memory.mjs add` recorded a real decision enriched from the catalog (Float UI hero → license `custom`, commercial `conditional`, install command copied from the entry) plus a `build` decision without id; an unknown id exited 1 with a clear message pointing to `find.mjs`. ✔
- `SUMMARY.md` regenerated on every mutation with totals, latest decision per screen/block, style counts, sources used, saved combinations and recent decisions. ✔
- Combinations: `combo save saas-landing-v1 --note …` stored both decisions with aggregated styles; `combo list` printed one line per combination; `combo show` listed entries with install commands re-read from the catalog; `combo apply` appended the decisions to the history with the "from combination …" note. ✔
- Installer provisioning: first install created `ai-frontend-output/` with its README; after recording a decision, a second install reported "ai-frontend-output/ found: preserved" and the history was intact. ✔
- Docs and skill updated: `AGENTS.md`, `guides/00`, `guides/04` (check combinations first), `guides/05` (record every decision), `SKILL.md` generic skill, kit and root READMEs. ✔

## UX flow layer (2026-10-02)

- 16 UX skills vendored from `jpoindexter/ux-flow-skills` at commit `fc7f4a4b91` (MIT license copied verbatim; every SKILL.md validated: frontmatter `name` matches the directory and `description` present). `sync-ux-skills.mjs --check` reports "up to date". ✔
- `tools/sync-ux-skills.mjs` re-vendors from the pinned source, aborts if the origin license is not MIT, removes upstream-deleted skills and refreshes `UX-SKILLS-ORIGIN.md` + `UX-SKILLS-LICENSE`. ✔
- `tools/context.mjs` on a real Next.js repo: detected Next.js + Tailwind v4 + motion/shadcn/daisyui, 1 route, 4 docs, `ux_present=true` and the summarize-vs-redesign suggestion; on an empty repo: `ux_present=false` → from scratch. Output ≤ ~150 lines in `ai-frontend-output/ux/REPO-CONTEXT.md`. ✔
- Guide `01-UX-FLOWS.md` replaces `01-ANCHOR.md`: four paths (A from scratch, B as-is summary, C radical redesign with mandatory baseline + diff, UX-only respecting PRODUCT.md, D spot audit) and the gate that blocks the UI phase without `UX-SPEC.md` (screens + empty/loading/error states + flows). ✔

## Framework adapters (BMAD / spec-driven)

- Detection verified: a simulated BMAD repo (`.bmad-core/`, `docs/prd.md`, 2 story files) → `framework: bmad` with evidence; this repository (`openspec/`) → `framework: spec-driven`. Feature detection is tolerant and does not false-positive on a plain product repo. ✔
- `guides/ADAPTERS.md` documents the artifact mapping (PRD/brief as anchor, UX docs as the as-is state, stories → screens, OpenSpec specs as the behavioral contract) and the no-duplicate-sources rule; it is linked from `AGENTS.md`, `SKILL.md`, `00-START-HERE` and `01-UX-FLOWS`. ✔
- `memory.mjs add --ref "story:3.2"` stores the trace and `SUMMARY.md` shows it in the new Ref column (verified with a real record). ✔

## Package install mode and clean skills (2026-10-02)

- `package.json` `files` now includes `skills/`; `npm pack` produces `ai-frontend-guide-kit-1.1.0.tgz` (0.27 MB) containing installer + kit + skills + README. ✔
- Dependency install: `npm i -D file:<tarball>` in a temp project + `npx --no-install ai-frontend-guide-kit` → kit copied, `ai-frontend-output/` created, `AGENTS.md` pointer added, 17 skills in `.agents/skills/`, no `skills-lock.json`; second run idempotent. ✔
- Copy mode respects foreign skills: a pre-existing `.agents/skills/my-own` survived a re-run (18 total). ✔
- Claude linking: project with `.claude/skills/other-skill` → 17 junctions created (`LinkType: Junction → .agents/skills/<name>`), foreign skill untouched, zero fallback copies. Project without `.claude/` → the folder is not created. ✔
- CLI regression: `--skills-mode cli` → 39 skills via the skills CLI (userflow + ai-frontend-guide + impeccable present) and `skills-lock.json` created, i.e. previous behavior preserved. ✔
- No `postinstall`: plain `npm install` never mutates the project; setup is the explicit `npx ai-frontend-guide-kit`. npm registry publish deferred by the user. ✔

## Three phases, external skills by default and Playwright MCP (2026-10-02)

- **Default run** (`node install.mjs --target <temp>`) on a project with `.claude/`: 18 kit skills copied clean to `.agents/skills/` (workflow + 16 UX + `frontend-polish`), the 3 external repos installed via the skills CLI (impeccable 1 + design-taste-frontend 1 + emilkowalski 14 = 16), 34 skills total in `.agents/skills/` and linked in `.claude/skills/`, `.mcp.json` created with `mcpServers.playwright`, `AGENTS.md` preserved with the pointer appended, `ai-frontend-output/` created, Laya check OK and the closing message shows the three phases. ✔
- **OpenCode merge**: `opencode.json` with an existing `mcp.other` server and `theme` key → `mcp.playwright` (local, enabled) added, other keys/servers preserved verbatim; a UTF-8 BOM (written by Windows editors) is tolerated by the parser (`readJsonConfig` strips it). ✔
- **Idempotency**: second run reports `AGENTS.md already points`, `already configured in opencode.json` and refreshes the 18 skills without rewriting configs. ✔
- **Invalid JSON**: `.mcp.json` with broken JSON → warning, file left unchanged, static instructions printed. ✔
- **Opt-outs**: `--no-skills --no-mcp` installs no skills and writes no MCP config (`.agents/` absent); `--no-design-skills` copies the 18 kit skills and skips the CLI. ✔
- **Offline / no npx**: PATH without npm → the 3 `npx skills add` calls fail with a warning each and the install continues (18 kit skills present, kit functional); Python/Laya not found is reported with the fallback message. ✔
- **CLI regression** (`--skills-mode cli`): all repo skills + the 3 external repos installed via the skills CLI with lockfile, and Playwright MCP configured. Previous behavior preserved. ✔
- **Packaging**: `node tools/build-kit.mjs` verifies 18 repo skills (adds `skills/frontend-polish/SKILL.md` and `guides/09-ITERATE.md` to the required assets); `node tools/validate.mjs` OK (2,470 entries). `npm pack --dry-run` (v1.2.0) includes the new skill and guide (64 files, 295 kB). ✔

## UX visual map + local Excalidraw MCP (2026-10-02)

- **Server decision (E2E)**: `@cmd8/excalidraw-mcp@1.2.0` (first candidate, only npm package with write tools) does not start on Node 24: its published `dist/index.js` imports `./tools/index` without extension (`ERR_MODULE_NOT_FOUND`); 1.1.x ships read-only `getFullDiagramState`; `mcp-excalidraw-server@2.0.0` works but runs an in-memory browser canvas needing import/export round-trips. Decision: ship a local, dependency-free MCP server `ai-frontend-guide-kit/tools/excalidraw-mcp.mjs` (Node built-ins, stdio) with `getFullDiagramState`, `createNode`, `createEdge`, `deleteElement`; it creates the file if missing and tolerates a UTF-8 BOM. ✔
- **Installer**: fresh temp project with `.claude/` + `opencode.json` (pre-existing servers and keys) → `.mcp.json` gained `mcpServers.playwright` (npx) and `mcpServers.excalidraw` (`node ai-frontend-guide-kit/tools/excalidraw-mcp.mjs --diagram ai-frontend-output/ux/ux-map.excalidraw`); `opencode.json` gained `mcp.playwright` + `mcp.excalidraw` (local, enabled) preserving `theme` and `other`. Re-run: `already configured`, scaffold preserved, 19 skills refreshed. `--no-mcp` writes no config and creates no `.mcp.json` while still provisioning the scaffold; invalid `.mcp.json` → warning and file untouched. ✔
- **MCP flow E2E** (installed copy, cwd = project root): `initialize` + `tools/list` (4 tools) → `createNode` (INICIO ellipse; Landing/Login rectangles with name + CTA + blocks) → `createEdge` referencing screens by first line (`INICIO→Landing "Entrar"`, `Landing→Login "Empezar"`) → `getFullDiagramState` reports 3 nodes + 2 labeled edges → `deleteElement("Login")` cascades to its text, arrow and arrow label → final `.excalidraw`: 10 elements (6 active), arrows with `startBinding`/`endBinding` and bound labels, opens in excalidraw.com. ✔
- **Scaffold with BOM**: the server loads a scaffold saved by Windows PowerShell (UTF-8 BOM) without error (loader strips `\uFEFF`). ✔
- **Packaging**: `tools/build-kit.mjs` requires `tools/excalidraw-mcp.mjs` (23 kit assets) and verifies 19 repo skills; `node tools/validate.mjs` OK; `npx openspec validate add-ux-visual-map --strict` OK. ✔

## UX visual map — local Excalidraw MCP (2026-10-02)

- **Dependency finding**: `@cmd8/excalidraw-mcp` (the server initially planned) is unusable — 1.2.0 publishes ESM with `@/` path aliases and extensionless relative imports (`ERR_MODULE_NOT_FOUND`, does not start on Node 24) and 1.1.x/1.0.0 only expose `getFullDiagramState` (read-only). The kit now ships its own **dependency-free local server** `tools/excalidraw-mcp.mjs` (Node built-ins only, offline, ~370 lines) with the same four tools, creates the `.excalidraw` if missing, and needs no network at first use. ✔
- **Install E2E** (project with `.claude/` + `opencode.json` with `theme` + `mcp.otro`): 19 skills copied to `.agents/skills/` (incl. `ux-map`), `.mcp.json` created with `mcpServers.playwright` + `mcpServers.excalidraw` = `node ai-frontend-guide-kit/tools/excalidraw-mcp.mjs --diagram …`, `opencode.json` merged with `mcp.playwright` + `mcp.excalidraw` preserving other keys/servers, scaffold `ai-frontend-output/ux/ux-map.excalidraw` created. ✔
- **Idempotency**: second run reports `playwright + excalidraw already configured`, `ux-map.excalidraw found: preserved` and `AGENTS.md already points`; SHA-256 of `.mcp.json`, `opencode.json`, the map and `AGENTS.md` unchanged. ✔
- **`--no-mcp`**: no `.mcp.json` created, no `mcp` key added to `opencode.json`, scaffold still created. ✔
- **Server E2E over the scaffold**: `initialize` → `tools/list` returns `getFullDiagramState, createNode, createEdge, deleteElement`; created two labeled screen nodes (light-purple/light-green) and a labeled arrow, read the state, then deleted a node and its bound text + attached edge in one call. Final file: 10 active elements (3 rectangles, 5 texts, 2 arrows), all bindings (`boundElements`, `startBinding/endBinding`, `containerId`) resolve and every element carries the required Excalidraw v2 fields (structural check: 0 problems). ✔
- **Packaging**: `tools/build-kit.mjs` now requires `tools/excalidraw-mcp.mjs` (24 kit assets, 19 repo skills) and stays coherent with `manifest/`; `node tools/validate.mjs` OK (2,470 entries); `openspec validate add-ux-visual-map --strict` → valid. ✔

## Experience direction + Laya datasets + renumbered guides (2026-10-02)

- **New layer**: `experience/` ships `EXPERIENCE-DIRECTION.md`, `QUESTION-BANK.md` (36 questions, 6 phases), `SITE-ARCHETYPES.md` (8 site × 15 experience × 16 page types), `UX-PHILOSOPHIES.md` (15), `STYLE-DIRECTIONS.md` (18 styles + anti-generic P0/P1), `REFERENCE-PROTOCOL.md`, `experience-manifest.json` (106 entries) and `references/` (16 cards + weighted `INDEX.md`). Extraction curated from the provided sources (NN/g, GOV.UK, USWDS, Welie, Laws of UX, IDF, Martech archetypes, Tubik page types, Superdesign, StyleKit, anti-ai-slop, Anthropic frontend-design, product-flow libraries, galleries, scrollytelling). ✔
- **Renumbered guides**: `01-EXPERIENCE-DIRECTION` (new) + `02-UX-FLOWS` … `10-ITERATE` via `git mv`; every guide ≤ ~120 lines (min 19, max 56, router 52); internal `Next:` links, headers, `ADAPTERS`, `context.mjs` next-step block and the `05→06`/`07→08`/`08→09` references updated. Grep of old names outside `openspec/changes/archive/` → only the active change artifacts and the main specs that its deltas update on archive. ✔
- **Laya generalized**: `--dataset components|experience`, `--kind`, `--phase`, `--task fit|direction|next-question|options` with per-task typed instructions; small manifests keep deterministic order; `options` resolves a question by `--text <id|name>`. Dry-runs verified: experience direction (exit 0), next-question (exit 0), options (exit 0), components regression (exit 0), no-consent ranking (exit 3). Real ranking on the experience dataset: archetype/monitor top P(fit)=0.48 with the low-confidence warning and the `choice` pick different from the top row — probabilities are relative, as documented. ✔
- **Direction-aware map**: `ux-map` skill now selects the template from the brief's `navigation_model` (`one-page`, `flow`, `hub`, `catalog`, `console`, `tree`), takes areas/colors from the brief IA, orders rows by journey stages and requires the `Dirección · Navegación · P(fit)` legend; guide `02-UX-FLOWS` gate checks both `UX-SPEC.md` (names) and `EXPERIENCE-BRIEF.md` (structure). The local Excalidraw MCP is unchanged (its create/edge/delete E2E from the previous section still applies). ✔
- **Packaging**: `build-kit` verifies the new required assets and validates `experience-manifest.json` (106 entries, unique ids, required fields); `build-index` regenerates the catalog index with the `06-REUSE` pointer; `node tools/validate.mjs` OK; `python -m py_compile` and `node --check` clean on all touched scripts. ✔
- **Install E2E** (temp project with `.claude/` + `opencode.json`, `--no-design-skills`): `experience/`, `guides/01-EXPERIENCE-DIRECTION.md`, `10-ITERATE.md` and `tools/excalidraw-mcp.mjs` copied; MCP config merged as before; `context.mjs` prints the new direction → flows next step with the four UX outputs; installed-kit Laya experience dry-run exits 0; re-run is idempotent (`.mcp.json`, `opencode.json`, map and `AGENTS.md` hashes unchanged). ✔

## Laya direction context for component ranking (2026-10-02)

- **Flag**: `--direction <id>` resolves the entry in `experience/experience-manifest.json` and composes the ranking state as `need` → `Chosen experience direction (<id>): <profile>` → `Project context`; dry-run JSON and the output header expose the id. Wrong ids warn and continue (fail-soft). ✔
- **Dry-runs**: components with `--direction exp-archetype-monitor` (exit 0, state contains the direction profile, header shows the id), unknown id (exit 0 with warning, ranking continues), regression without `--direction` (exit 0). ✔
- **Real run**: `--dataset components --category hero --commercial --need "industrial gateway hero: precise, technical, operation-focused" --direction exp-archetype-monitor --top 5 --confirmed` → model `english`, 19.0 s, header `direction: exp-archetype-monitor`, low-confidence warning (top P(fit)=0.32) and facts (license/install) merged from the catalog. ✔
- **Docs**: `guides/05-FIND.md` now makes direction-aware ranking the recommended step after `find`/`get` (with the brief as context and the session consent from guide 01); `AGENTS.md`, the generic skill and both READMEs show the `--direction` example. ✔
- **Packaging**: `node tools/build-kit.mjs` and `node tools/validate.mjs` OK; `openspec validate add-laya-component-direction --strict` valid. ✔

## Discovery loop + ref-only memory (2026-10-02)

- **New protocol**: `experience/DISCOVERY-LOOP.md` (two phases: structure discovery from guide 01 and component combinations from guide 05, with idea deck, guided browsing, bounded rounds, screenshot intake, persistence map and fallback). `REFERENCE-PROTOCOL.md` now separates the kit bank (`experience/references/`, replaced on refresh) from the project bank (`ai-frontend-output/ux/references/`, survives) and documents the screenshot naming next to each card. Guide 01 gained "Step 4 — Discover references with the user" (steps 5–6 renumbered), guide 05 gained the combination round and a new working-method step, guide 00 updated its tools table and casuistics; `AGENTS.md`, `skills/ai-frontend-guide/SKILL.md` and both READMEs point to the loop. ✔
- **Ref-only memory E2E**: `memory.mjs add --screen experience --block reference --decision adapt --ref "reference:stripe-dashboard"` and the documented `--decision adapt --ref "direction:exp-archetype-monitor"` both recorded without `--id` in a temp output dir; `SUMMARY.md` shows the ref in its column; `memory.mjs add --decision reuse` without id/ref still exits 1 with the updated message; `combo save discovery-test` snapshotted the 2 ref-only decisions. ✔
- **Packaging**: `tools/build-kit.mjs` verifies **33 required assets** (adds `experience/DISCOVERY-LOOP.md`), experience manifest OK (106 entries, unique ids, required fields) and catalog coherent with `manifest/`; `node tools/validate.mjs` OK (16 sources, 2,470 entries); `openspec validate add-discovery-loop --strict` valid; `openspec validate --all` 8 passed / 0 failed. ✔

## 2026-10-04 · Catalog growth, quality ranking, tests and CI

- **Sources**: 25 files, 3,731 entries (adds Kibo UI, Animate UI, cult/ui, React Bits, shadcn-vue, shadcn-svelte, Mantine, Base UI, React Aria Components); demo/icon noise removed (Animate UI demos, cult/ui `-demo` items) after a link check found 404 docs pages. `node tools/validate.mjs` → OK.
- **Licenses**: `tools/check-licenses.mjs` cross-checks each repo LICENSE; Kibo UI resolved to MIT; coss is an accepted divergence (components MIT, repo root AGPL). Report: `catalog/license-report.md`.
- **Ranking**: every entry has `quality` (0-100); `find` ranks by quality/relevance, collapses cross-source duplicates and hides icons; `--source` bug fixed.
- **Audits**: `audit-honesty`, `audit-a11y`, `audit-perf` added to the kit; `09-VERIFY` sections 4-6.
- **Tests**: `npm test` → 23 passing (find/get/quality, installer idempotency, memory, audits, license classifier, experience manifest, walkthrough example). CI: `.github/workflows/ci.yml`; monthly `refresh.yml` (PR) and `links.yml`.
- **Links**: stratified check (`validate --urls 176`) → 0 broken in new sources after fixes; remaining broken: 1 HyperUI page and 2 external DSR pages (upstream); 403s are bot protection (Uiverse, DSR).

## 2026-10-04 · Second batch from the user's list

- **New sources (34 total, 4,287 entries)**: Arc UI, Material UI, Chakra UI, Ant Design, Radix Primitives, Headless UI, Flowbite, Mantine UI (per category), shadcn/ui official blocks (97), plus `resources` (icons, illustrations, design-tool libraries, paid kits). Docs URLs of library sources are verified at extraction time (404s dropped).
- **License evidence**: repo LICENSE files cross-checked for all new library sources (all match). `resources` entries link their evidence page; Lucide is ISC (+ MIT portions), unDraw and Storyset have custom terms, Tailwind Plus and Flowbite Pro are paid and indexed as reference only.
- **New category** `assets` (icon sets, illustrations, design kits) and entry type `asset`; `find --source` now accepts source ids exactly (`mui`, `shadcn`).
- `npm test` → 25 passing; `validate --urls 150`: 2 broken (older sources: Aceternity label page, coss origin calendar), 7 blocked by bot protection.
