# Reference Protocol — saved ideas bank

Purpose: turn external references into **reusable, ethical knowledge** the agent can consult and rank, instead of copying screenshots or guessing from memory. Sources are extracted once (curated) and new URLs are extracted on demand; both produce the same card format. The interactive workflow that searches, proposes and captures references with the user lives in `DISCOVERY-LOOP.md`.

## Source registry (weights)

**High — UX evidence (functional, usability, accessibility decisions):** Nielsen Norman Group (heuristics, journey mapping, IA, web UX), GOV.UK Design System (step-by-step, question pages, patterns), USWDS (patterns, complex forms, in-page nav, accessibility, header), Welie interaction patterns, Laws of UX, Interaction Design Foundation (5 elements, UCD), Material Design 3, W3C WCAG.

**Medium — real product flows (how products actually solve it):** Mobbin, Page Flows, Refero, Gummble, UXMaps, TYPENORM, Product Onboarding, SaaS UI, UI Patterns, UX Library, DesignerUp.

**Creative — visual inspiration (direction only, never usability proof):** Awwwards, SiteInspire, CSS Design Awards, Godly/Recent, A1 Gallery, Muzli, Landingfolio, Lapa Ninja, Land-book, One Page Love, SaaS Landing Page, Saaspo, Dribbble.

**Craft & agents (anti-generic, style definitions, extraction):** Superdesign (styles + "when not to use"), StyleKit, Design Binders, Design Lexicon, IndexStyle, neubrutalism.com, Anthropic `frontend-design`, `anti-ai-slop` P0–P6, Vercel Web Interface Guidelines, Taste, Impeccable, design-extractor/designmd.run (URL → DESIGN.md), Figma AI Skills, Design Skills Hub.

**Questions & journey:** Webflow questionnaire, ybug, resourcefuldesigner, Service Design Tools, Justinmind, NN/g Journey Mapping 101.

**Rule:** a beautiful gallery entry is **visual inspiration**, never UX evidence. Evidence for structural decisions comes from high/medium weights.

## Card schema (one file per reference)

`references/reference-<slug>.md`:

```yaml
reference:
  name: ""
  url: ""
  source_type: [ux_pattern | page_gallery | product_flow | case_study | design_system | visual_style | accessibility | ai_skill]
  weight: [evidence | product | inspiration | craft]

  website_context: { industry, product_type, target_audience, device_priority }

  experience:
    site_archetype, page_type, user_goal, business_goal, primary_task,
    user_journey_stage, emotional_intent, trust_strategy

  information_architecture:
    navigation_model, content_hierarchy, section_order, entry_points, exit_points

  interaction:
    main_flow, interaction_patterns, progressive_disclosure,
    search_strategy, filtering_strategy, feedback_strategy,
    error_strategy, empty_states, loading_states

  visual_direction:
    design_philosophy, visual_style, composition, density, rhythm,
    image_role, motion_role, perceived_personality

  rationale:
    what_works, why_it_works, risks, when_to_use, when_not_to_use

  adaptation:
    suitable_for, unsuitable_for, industrial_variant, saas_variant, ecommerce_variant, documentation_variant

  agent_lessons:
    reusable_patterns, creative_ideas, questions_to_ask_user, forbidden_shortcuts
```

Then a short body with the 5–8 most important takeaways and quotes/attribution. Keep cards ≤ ~60 lines.

## Extraction workflow (on demand)

1. Pick the URL (user-provided or chosen from the registry for a specific need).
2. Fetch with the Playwright MCP already configured (`browser_navigate`, snapshot/screenshot, network requests) or the agent's web fetch if the MCP is unavailable.
3. Extract structure and behavior, not pixels: sections, navigation model, states, patterns, copy tone, motion role. Note what you cannot verify (private flows, dynamic states).
4. Write the card with the schema, set `weight`, and add 3–6 tags (`archetype:workflow`, `style:editorial`, `pattern:progressive-disclosure`…): to the kit bank for curated sources, to `ai-frontend-output/ux/references/` for discovery picks (with their screenshots).
5. Update `references/INDEX.md` for kit cards (one line per card: name, weight, tags, one-line why); project cards are cited as `[ref: <slug>]` in `EXPERIENCE-BRIEF.md`.
6. If the page is unreachable, record the limitation in the card and continue; never block the phase.

## Ethical rules

- Patterns and lessons only: never copy visual identity, assets, copy, code or layouts 1:1.
- Do not scrape a whole gallery; store the source as a registry entry plus representative cards.
- Attribute sources in the card; if a source is paywalled, describe the pattern and link, do not reproduce content.
- Respect licenses: no storing of third-party component code (the kit never ships it).

## Two banks (kit vs project)

- **Kit bank — `experience/references/`:** curated evidence from the source registry. It ships with the kit and is **replaced on kit refresh**; never store project work here.
- **Project bank — `ai-frontend-output/ux/references/`:** references chosen with the user during discovery (`DISCOVERY-LOOP.md`), with their notes and screenshots (`<slug>-<section>.png` next to `reference-<slug>.md`). It survives refreshes and is project history.

Both use the same card schema. A project card is promoted to the kit bank only through curation, following the same registry rules.

## Using saved ideas

- Browse `references/INDEX.md` by tag; open only the cards you need. Project cards live in `ai-frontend-output/ux/references/` and are cited in the brief.
- Rank candidate cards for a need with Laya? Use `--dataset components` when the need maps to a component; for direction questions use the experience manifest. Cards are evidence to cite in the brief, not automatic choices.
- In `EXPERIENCE-BRIEF.md`, cite cards as `[ref: <slug>]` next to the direction or pattern they justify.

## Gallery strategy

From infinite galleries (Awwwards, Mobbin, Dribbble…) keep: the registry entry, 2–4 representative cards of *different* patterns, and the method to browse them (filters by industry/flow/style). Extract specific URLs only when a real need exists.
