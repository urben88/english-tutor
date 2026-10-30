# 01 — Experience direction (before flows)

Purpose: decide **what experience we are building** — archetype, philosophy, journey, IA and three creative directions — and write `EXPERIENCE-BRIEF.md` before any flow, token or component. Full detail lives in `experience/` (load only what you need).

> **Read first:** `ai-frontend-guide-kit/experience/EXPERIENCE-DIRECTION.md` (process, rules, output format). Supporting docs: `QUESTION-BANK.md`, `SITE-ARCHETYPES.md`, `UX-PHILOSOPHIES.md`, `STYLE-DIRECTIONS.md`, `REFERENCE-PROTOCOL.md`, `DISCOVERY-LOOP.md`.

## When to use

New frontend or a redesign (route: phase 1). Skip for small changes (`10-ITERATE`) — but if a change alters the **type of experience**, stop and come back here.

## Step 0 — Context first

Run `node ai-frontend-guide-kit/tools/context.mjs` and read `ai-frontend-output/ux/REPO-CONTEXT.md`; read `PRODUCT.md`/PRD if present. Never ask what these already answer.

## Step 1 — Adaptive questions (rounds of 3–5)

Follow `experience/QUESTION-BANK.md`:

- Compute eligible questions (`depends_on` satisfied, not answered, not deducible).
- If more than 3 are eligible **and the user consented to Laya this session**, rank the next one:
  ```bash
  python ai-frontend-guide-kit/tools/laya_select.py --dataset experience --kind question \
    --task next-question --context-file ai-frontend-output/ux/EXPERIENCE-BRIEF.md --confirmed
  ```
  Otherwise follow phase order. Ask 1 question with 2–4 options + free text; record the answer in the brief (in progress) and continue. 10–18 answered questions is normally enough.
- **Laya consent:** ask once per project/session; record `laya_consent: granted` (or `declined/revoked`) in the brief and use `--confirmed` afterwards. No Python/Laya → keep going deterministically.

## Step 2 — Classify the experience

With the answers, choose:

- **Site archetype** and **experience archetype** (1, max 2) from `experience/SITE-ARCHETYPES.md`, plus the page list with each page's job.
- **Philosophy** from `experience/UX-PHILOSOPHIES.md`; state the discarded alternative and why.
- **`navigation_model`** (drives the Excalidraw map template later): `single-page-anchors`, `linear-wizard`, `hub`, `catalog`, `console` or `tree`.

Optionally rank candidates with Laya (`--dataset experience --kind archetype|philosophy --task direction`, with the brief as `--context-file`). Probabilities are **relative evidence**, not truth: explain your pick and treat low confidence as "compare alternatives".

## Step 3 — Journey and information architecture

Write the journey (actor, scenario, phases, actions, thoughts, emotions, friction, opportunities) and the IA (priority content, navigation, section order, entry/exit points, search/filter needs). Organize by user tasks, never by org chart. Use patterns from `experience/references/INDEX.md`; cite as `[ref: <slug>]`.

## Step 4 — Discover references with the user (recommended)

Follow `experience/DISCOVERY-LOOP.md` (phase A) between the IA and the three directions:

- Build an **idea deck** of 3–5 example sites from internet search (structure queries + real product flows), each with its weight, navigation model, structural read (section order, entry/exit) and one moment to observe.
- Ask the user to browse 1–3 and say **which they prefer and what they highlight**; navigate with them using Playwright MCP when they want.
- Collect screenshots into `ai-frontend-output/ux/references/`, write a card per chosen reference with the protocol schema, cite it as `[ref: <slug>]` in the brief and record the pick:
  `memory.mjs add --screen experience --block reference --need "…" --decision adapt --ref "reference:<slug>"`.
- Bounded rounds (2–3 new candidates per round). If web search or Playwright is unavailable, use the `references/INDEX.md` registry and user URLs, state the limitation and continue — the loop never blocks the phase.

## Step 5 — Three directions

Generate **safe**, **differentiated** and **experimental**, differing in structure (archetype, navigation, journey, composition or narrative) — never three recolors. For each: what it changes, key patterns, what it sacrifices, main risk, when not to use. Apply the purpose and convergence tests and the anti-generic list of `experience/STYLE-DIRECTIONS.md`.

## Step 6 — Write `ai-frontend-output/ux/EXPERIENCE-BRIEF.md`

Use the format in `experience/EXPERIENCE-DIRECTION.md` (Context, Goal, Laya consent, Archetype, Philosophy, Journey, Information architecture, Three directions, Recommended direction, Interaction patterns, Visual brief, Accessibility, Open questions). The **visual brief** section (style, palette intent, typography personality, composition, motion, anti-generic list) is what `03-TOKENS.md` consumes.

## Step 7 — Choose and hand off

Present the three directions; the user chooses or combines. Record the decision:

```bash
node ai-frontend-guide-kit/tools/memory.mjs add --screen experience --block direction \
  --need "<one line>" --decision adapt --notes "direction:<id>; risk:<...>" --ref "direction:<id>"
```

## Gate

Do **not** continue to `02-UX-FLOWS.md` until `EXPERIENCE-BRIEF.md` has archetype, philosophy, journey, IA and a chosen direction. Without Laya the brief is identical; only the probabilities are missing. If a reference page is unreachable, note it and continue — the phase never blocks on tools.

Next: `02-UX-FLOWS.md` turns the direction into screens and flows.
