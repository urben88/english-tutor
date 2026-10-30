# Adapters — BMAD and spec-driven repositories

This kit plugs into projects that already run **BMAD** (product/UX/story artifacts) or a **spec-driven flow** (OpenSpec). `tools/context.mjs` detects the framework and writes it to `REPO-CONTEXT.md`; this guide says how to adapt. The vendored UX skills stay untouched — adaptation lives in this layer.

## Detection (automatic)

```bash
node tools/context.mjs        # → REPO-CONTEXT.md: "Framework: bmad | spec-driven | bmad + spec-driven | none"
```

| Marker found in the repo | Framework |
|---|---|
| `.bmad-core/`, `_bmad/`, `bmad/`; `prd.md`/`PRD.md`, `project-brief.md`, `product-brief.md`, `architecture.md`, `front-end-spec.md`, `ux-spec.md`, `EXPERIENCE.md`; `docs/stories/`; `bmad-*` agent skills | BMAD |
| `openspec/` (specs and/or changes) | spec-driven |

## In a BMAD repository

| BMAD artifact | Role in this kit |
|---|---|
| `prd.md` / `project-brief.md` / `product-brief.md` | **Business anchor.** Use it instead of writing `PRODUCT.md`; if you create `PRODUCT.md`, make it a thin pointer (audience, conversion, flows come from the PRD — do not duplicate). |
| UX docs (`front-end-spec`, `ux-spec`, or the `bmad-ux` outputs `DESIGN.md` + `EXPERIENCE.md`) | **As-is UX** for guide 02: summarize mode documents them; redesign mode uses them as `UX-BASELINE.md` and must not touch the PRD. |
| `architecture.md` | Stack/constraints: feed `03-TOKENS` and keep component choices compatible. |
| `docs/stories/**` | Inventory mapping: map each `UX-SPEC` screen/block to its story and cite it in memory: `--ref "story:<id>"`. |

Rules:

- No duplicated sources of truth: with a PRD, the kit's UX-SPEC **complements** BMAD's UX docs — it never replaces them.
- The UX skills are the proven-flows engine inside BMAD's UX phase; BMAD agents stay in charge of planning.
- Radical redesign is UX-only (PRD untouched); product-level ideas go to `OPEN-QUESTIONS.md`.
- Every component decision should trace to a story via `--ref`.

## In a spec-driven repository (OpenSpec)

- `openspec/specs/<capability>/spec.md` is the **behavioral contract**. Read the relevant capabilities before designing flows; the UX-SPEC must reference them, and no UI decision may contradict them.
- If the work belongs to an active change (`openspec/changes/<name>`), note it: `memory.mjs add … --ref "change:<name>"`.
- If the UX work implies a **behavior change**, that belongs in an OpenSpec change — never change behavior silently.
- Cite capabilities with `--ref "spec:<capability>"`.

## Combined (PRD + specs)

Order: BMAD PRD anchors the product → specs anchor behavior → experience direction (guide 01) → UX-SPEC (guide 02) → inventory → decisions with `--ref` citing both (`story:` and `spec:`).

## Commands

```bash
node ai-frontend-guide-kit/tools/context.mjs                       # detect framework + UX presence
node ai-frontend-guide-kit/tools/memory.mjs add --screen landing --block hero \
  --need "..." --decision reuse --id <entry-id> --ref "story:3.2"
node ai-frontend-guide-kit/tools/memory.mjs add ... --ref "spec:component-catalog"
```

## Checklist

- [ ] `REPO-CONTEXT.md` reports the framework (and evidence).
- [ ] BMAD: anchor is the PRD (no duplicated `PRODUCT.md`); stories are mapped to screens/blocks.
- [ ] Spec-driven: relevant capabilities were read and referenced; no behavior changed outside a spec change.
- [ ] Decisions carry `--ref` traces; `SUMMARY.md` shows them.
