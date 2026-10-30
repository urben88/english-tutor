# Site & Experience Archetypes

Two layers, chosen separately: the **site archetype** (the job the whole site does) and the **experience archetype** (how a page/section behaves). Do not confuse them with business type: a SaaS can host a landing, a dashboard, docs and onboarding with different archetypes.

## 1 · Site archetypes (whole site)

| Archetype | Job | IA / navigation | Success signal | Watch out |
|---|---|---|---|---|
| Signpost / presence | Confirm legitimacy and route to contact | 1 shallow page, minimal nav | User finds what they need and acts | Too thin to build trust if the offer is complex |
| Marketing / conversion | Persuade through a controlled narrative | Constrained nav, problem → solution → proof → CTA | Conversion rate and quality | Over-optimized funnel hurts exploration and SEO depth |
| Destination / application | Be used repeatedly to accomplish tasks | Task-based nav, roles, shells | Retention, task completion | Marketing tone inside the product irritates users |
| Knowledge / reference / media | Inform, teach and build authority | Taxonomy, search, internal links | Return visits, authority | Weak structure turns into a content dump |
| Community | Create value through participation | Feeds, groups, profiles, moderation | Active contribution | Empty community looks dead; needs seeding |
| Commerce / transactional | Evaluate and buy with confidence | Catalog, filters, comparison, checkout | Conversion, AOV, repeat | Trust friction at checkout kills revenue |
| Narrative / experiential | Make the brand memorable | Guided scroll, motion, pacing | Recall, emotional resonance | Spectacle without message; poor on slow devices |
| Internal / operational | Support employees with accuracy | Roles, permissions, integrations | Time saved, fewer errors | Consumer aesthetics over efficiency |

## 2 · Experience archetypes (per page / section)

Pick one, at most two. `navigation_model` drives the Excalidraw map template.

| Archetype | Main objective | Feel | Typical patterns | navigation_model |
|---|---|---|---|---|
| Explainer | Explain something complex | Clarity | storytelling, diagrams, progressive reveal | `single-page-anchors` or `tree` |
| Converter | Reach one action | Confidence | CTA focus, social proof, friction removal | `single-page-anchors` |
| Explorer | Discover content | Curiosity | categories, search, filters | `hub` or `catalog` |
| Operator | Frequent task execution | Control | dashboard, shortcuts, states | `console` |
| Configurator | Choose and personalize | Participation | wizard, preview, options | `flow` |
| Comparator | Compare alternatives | Confidence | comparison table, filters, differences | `catalog` |
| Educator | Teach step by step | Progress | lessons, steps, examples | `flow` |
| Reference | Consult information | Precision | index, search, breadcrumbs, in-page nav | `hub` or `tree` |
| Storyteller | Memorable experience | Emotion | scroll narrative, rhythm, imagery | `single-page-anchors` |
| Community | Participate and share | Belonging | profiles, feed, comments | `hub` |
| Marketplace | Find and choose | Variety | listings, ranking, filters | `catalog` |
| Monitor | Watch state and changes | Control | metrics, alerts, history | `console` |
| Workflow | Complete a process | Calm | wizard, progress, validation, save/resume | `flow` |
| Portfolio | Prove capability | Admiration | cases, work, visual narrative | `one-page`/`hub` |
| Editorial | Read and explore ideas | Immersion | typography, columns, rhythm | `tree` or `single-page-anchors` |
| Assistant | Converse with or delegate to AI | Trust | streaming, citations, confirm-before-action, history | `console` |
| Activator | Reach first success | Momentum | checklist, empty states, sample data, skip/resume | `flow` |
| Scheduler | Pick a time or resource | Certainty | calendar, slots, timezone, confirmation | `flow` |

Example: the same product can be a console (operations), an architecture explainer (presales), a configurator (quotes) or a monitor (support). Different archetypes → different pages, navigation and map.

## 3 · Page types (tubik taxonomy, applied)

Home · feed · menu/index · search results · about · registration/auth · 404/error · blog · article · portfolio · services · product detail · cart/checkout · stats/dashboard · contact · landing.

For each page type, define: purpose, primary action, empty/loading/error states (owned by `UX-SPEC.md`) and which archetype it serves. Never assume a home page is hero + features + testimonials; its structure comes from the archetype.

## Heuristic mapping (when there is no Laya)

| If the answers say… | Suggest |
|---|---|
| convert/sell + fast/direct + occasional users | Converter (`single-page-anchors`), philosophy: conversion without friction |
| explain/inform + trust + progressive | Explainer (`tree`), philosophy: clarity / technical depth |
| complete a task + daily + dominant task | Operator (`console`), philosophy: operational efficiency |
| teach + steps + progress | Educator / Workflow (`flow`), philosophy: progressive simplicity |
| explore + many areas + search/compare | Explorer / Marketplace (`catalog`), philosophy: discovery |
| emotion + memorable + rich motion | Storyteller (`single-page-anchors`), philosophy: narrative and emotion |
| reference + many entities + precision | Reference (`hub`), philosophy: functional clarity |
| monitor + real-time + control | Monitor (`console`), philosophy: professional control |

When Laya ranks (`--task direction`), treat these heuristics as the prior and the probabilities as relative evidence, not as truth.
