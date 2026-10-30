# Discovery Loop — find examples with the user, turn likes into decisions

Purpose: the direction phase and the search phase both depend on something the repo cannot infer: **the user's taste**. This protocol turns "show me examples" into a short, bounded, ethical loop — seed searches → idea deck → guided browsing → screenshots → distilled references → component combinations. The user discovers ideas; the agent captures decisions.

Used from `guides/01-EXPERIENCE-DIRECTION.md` (structure) and `guides/05-FIND.md` (components). Read only the phase you need.

## Golden rules

- **Evidence vs inspiration.** A gallery entry is *visual inspiration* (composition, motion, mood), never usability proof. Structural decisions cite high/medium-weight sources (real products, design systems, NN/g). Label every candidate.
- **Patterns, not pixels.** Capture structure, navigation, order and behavior — never copy visual identity, assets, copy or code. Always attribute the source in the card.
- **Bounded rounds.** Idea deck of 3–5; the user browses 1–3; each new round adds 2–3 suggestions max. Stop when the user converges — discovery serves the brief, not the reverse.
- **Written, not in context.** Each round writes to files (cards, notes, screenshots). Never paste whole galleries, whole pages or the catalog into the conversation.
- **Never blocking.** No web search → use the registry in `references/INDEX.md` and user-provided URLs. No Playwright MCP → the user browses and pastes screenshots. Say which limitation applied.

## Phase A — Structure discovery (guide 01, before the three directions)

1. **Seed the search.** From the archetype, industry, audience and constraints build 2–3 query variants mixing structure terms with the product type: `"<industry> <archetype> website structure"`, `"<archetype> examples <audience>"`, `"<sector> landing page sections"`. Search both real products (flow libraries) and inspiration galleries.
2. **Build the idea deck (3–5).** One block per candidate:
   - `name — url · weight · navigation model`
   - `structure read:` section order, entry/exit points, one-line IA
   - `stands out:` the pattern worth stealing as an idea
   - `avoid:` the part that does not fit this product
   - `look for:` one concrete moment to observe while browsing (a transition, an empty state, a pricing block)
3. **Guided browsing round.** Ask the user to open 1–3 and answer: *which one do you prefer, and what do you highlight from each?* If they prefer, navigate with Playwright MCP yourself and narrate what you see section by section.
4. **Capture.** The user can pass screenshots of anything they liked. Also capture sections with Playwright MCP (`browser_take_screenshot`) when a URL exists. Store at `ai-frontend-output/ux/references/<slug>-<section>.png`, next to the reference card. Screenshots pasted in chat without a file path: analyze them visually, record the takeaways in the card, and re-capture from the URL when possible.
5. **Distill.** For every chosen reference: write `reference-<slug>.md` with the card schema of `REFERENCE-PROTOCOL.md`, note likes/dislikes with reasons, and cite it in `EXPERIENCE-BRIEF.md` as `[ref: <slug>]`. Record the decision:
   ```bash
   node ai-frontend-guide-kit/tools/memory.mjs add --screen experience --block reference \
     --need "<what it was chosen for>" --decision adapt --ref "reference:<slug>" \
     --style <tags> --notes "liked: … / avoid: …"
   ```
6. **Close the round.** Ask whether a second round would help; if not, continue to the three directions. Never let browsing replace the archetype and journey work.

## Phase B — Component discovery (guide 05, before closing the selection)

1. **Frame the combo.** Group the inventory row into purposeful sets (nav + hero + background; pricing + toggle + FAQ) that share density, motion budget and personality.
2. **Present 2–3 combos, not loose links.** Each combo states: the rationale (why these pieces fit together), the catalog ids with the facts from `get` (license, install command) and what changes in the other blocks if the user picks it. Combinations are the unit of recommendation.
3. **Web candidates are provisional.** For needs the catalog does not cover, search the web, open the component page and verify its license *before* proposing it as usable. Mark it `provisional — verify license` until confirmed; never add it to the catalog (that needs the extraction pipeline) and never present unverified candidates as safe.
4. **Let the user react.** Offer variants (A/B) when the trade-off is real; ask what to swap. Iterate until the combo fits — do not close the selection silently.
5. **Persist.** Register each decision with `memory.mjs add` (catalog entries with `--id`; provisional web finds with `--ref "web:<url>"` and a note). When the user accepts a set, snapshot it:
   ```bash
   node ai-frontend-guide-kit/tools/memory.mjs combo save <name> --note "<what it solves>"
   ```

## Storage map

| What | Where | Survives kit refresh |
|---|---|---|
| Kit-curated evidence cards | `ai-frontend-guide-kit/experience/references/` | No (ships with the kit) |
| Project references, notes, screenshots | `ai-frontend-output/ux/references/` | Yes |
| Likes, dislikes, decisions | `ai-frontend-output/selections.jsonl` (via `memory.mjs`) | Yes |
| Accepted combos | `ai-frontend-output/combinations.json` (via `combo save`) | Yes |

## Search recipes (starting points)

- **Inspiration (composition, motion):** Awwwards, Land-book, SiteInspire, Godly, One Page Love, Saaspo — filter by industry and style.
- **Real product flows (structure in use):** Mobbin, Refero, Page Flows, UXMaps — look at flows, not single screens.
- **Structural/UX evidence:** NN/g, GOV.UK Design System, USWDS — cite for structure and usability decisions.
- Prefer 2–3 query variants; if a query returns only galleries, add `flow`, `wireframe` or `information architecture` to reach structure.

## Done when

- `EXPERIENCE-BRIEF.md` includes the reference discoveries with `[ref: <slug>]` citations and explicit likes/dislikes.
- Project cards and screenshots exist in `ai-frontend-output/ux/references/` and every chosen reference is recorded in memory.
- Component choices are presented and recorded as combos with rationale and catalog facts (or a justified custom build), ready for `06-REUSE`.
- Any tool limitation (no web, no Playwright, unreachable page) is stated in the brief.

Fallback: with no web access at all, run the same loop over `references/INDEX.md` and anything the user provides; the loop is a conversation protocol, not a tool.
