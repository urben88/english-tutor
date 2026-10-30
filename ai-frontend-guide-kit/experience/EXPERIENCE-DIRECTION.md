# Experience Direction Manifest

Purpose: decide **what experience we are building and why** before any visual or component choice. This is the layer above `02-UX-FLOWS` (screens and flows) and `03-TOKENS` (visual system): it turns a vague brief into an `EXPERIENCE-BRIEF.md` with an archetype, a philosophy, a journey, an information architecture and three creative directions.

## Golden rule

Do not start from colors, fonts, cards, gradients or a landing template. Start from the user, the problem, the task, the context, the journey and the feeling at the end. If you can swap the logo and the design fits any competitor, the direction is missing.

## Mandatory process

1. Read `REPO-CONTEXT.md` and `PRODUCT.md`/PRD if they exist; never ask what the repo already answers.
2. Ask adaptive questions in rounds (see `QUESTION-BANK.md`), not a giant form.
3. Classify the experience: site archetype + experience archetype + page types (`SITE-ARCHETYPES.md`).
4. Pick a philosophy and explain why (`UX-PHILOSOPHIES.md`).
5. Describe the user journey: actor, scenario, phases, actions, thoughts, emotions, friction, opportunities.
6. Design the information architecture: priority content, global/contextual navigation, section order, entry/exit points, search/filter needs.
7. (Recommended) Discover references with the user (`DISCOVERY-LOOP.md`, phase A): idea deck of 3–5 example sites with their structure read, guided browsing, screenshots in `ai-frontend-output/ux/references/` and `[ref: <slug>]` citations.
8. Choose interaction patterns per screen type (progressive disclosure, wizard, comparison, in-page nav…).
9. Propose **three** directions: safe, differentiated, experimental (see below).
10. Explain each direction: why it fits, what it sacrifices, its main risk, the safer alternative.
11. Recommend one and let the user choose or combine.
12. Write the visual brief (style, palette intent, typography personality, composition, motion, anti-generic list).
13. Write `EXPERIENCE-BRIEF.md` with the chosen direction and open questions.
14. Hand off to `02-UX-FLOWS` (flows and screens must respect the archetype).
15. Hand the visual brief to `03-TOKENS` (tokens derive from it, not from defaults).
16. Record the direction (`memory.mjs add --ref "direction:<id>" --notes …`) so future projects can avoid repeating it.

## Experience archetypes

Choose one (or combine at most two) from `SITE-ARCHETYPES.md`: explainer, converter, explorer, operator, configurator, comparator, educator, reference, storyteller, community, marketplace, monitor, workflow, portfolio, editorial. Explain the choice and the trade-off; do not default to "modern SaaS landing".

## Three directions (mandatory)

Generate three proposals that differ in **structure**, not just color:

- **Safe** — familiar patterns, low confusion risk, fastest to build.
- **Differentiated** — recognizable structure plus a distinctive composition, narration or navigation.
- **Experimental** — unusual interaction, composition or storytelling, keeping affordances, accessibility and comprehension intact.

Each direction states: archetype + navigation model + composition idea + key patterns + what it sacrifices + main risk + when not to use it (see `STYLE-DIRECTIONS.md`).

## Journey and information architecture

For every relevant flow, answer: What does the person want? What do they know before arriving? What decision must they make? What information do they need first? What can go wrong? What should they feel at the end? What action proves the page worked?

Organize content by user tasks, not by org chart. Prefer:

- One primary action per screen; secondary actions quieter.
- Visible state, honest empty/loading/error states.
- Progressive disclosure instead of long walls (see `REFERENCE-PROTOCOL.md` for proven patterns).
- Search/filter only when the entity count justifies it.
- In-page navigation for long reference pages.

## Use of references

Use the reference bank (`references/INDEX.md`) as **evidence, not decoration**. For each reference used: state the problem it solves, the pattern, why it works, its risks and how you adapt it. Never copy visual identity, assets or copy; patterns and lessons only. New URLs are extracted with the protocol (Playwright MCP when available). Project picks from the discovery loop (`DISCOVERY-LOOP.md`) live in `ai-frontend-output/ux/references/` with their screenshots; the kit bank stays curated evidence.

## Decision explanation

For every important decision answer: which user need it serves, which principle justifies it (heuristics, Laws of UX, accessibility), what alternative was discarded, what risk it adds, and how it would be validated. This is what makes the result deliberate instead of generic.

## Anti-generic guardrails

Read the anti-generic list and P0/P1 tells in `STYLE-DIRECTIONS.md`. Apply the **purpose test** ("can I write one honest sentence explaining why this technique serves this product?") and the **convergence test** ("does the same technique appear across unrelated screens for no reason?").

## Output: `ai-frontend-output/ux/EXPERIENCE-BRIEF.md`

```markdown
# Experience brief
## Context        — product, audience, context of use
## Goal           — primary conversion / success action
## Laya consent   — granted|declined|revoked (session consent for rankings)
## Archetype      — site archetype · experience archetype · page types · why
## Philosophy     — chosen philosophy · why · discarded alternative
## Journey        — actor, phases, actions, thoughts, emotions, friction, opportunities
## Information architecture — priority content, navigation, section order, entry/exit, search/filter
## Reference discoveries — examples chosen with the user, likes/dislikes, [ref: <slug>] citations
## Three directions — safe · differentiated · experimental (each: structure, patterns, risks, when not to use)
## Recommended direction — id + rationale + risks (+ Laya P(fit) if ranked)
## Interaction patterns — per screen type, with the problem each solves
## Visual brief   — style, palette intent, typography personality, composition, motion, anti-generic list
## Accessibility  — keyboard, contrast, motion, language, low connectivity
## Open questions — pending decisions to resolve with the user
```

## Gate

Do not start `02-UX-FLOWS` until `EXPERIENCE-BRIEF.md` exists with: archetype, philosophy, journey, IA, three directions and a recommended direction. Do not start `03-TOKENS` until the visual brief section exists. Never block on Laya: without it, use the deterministic question tree and the heuristic tables.
