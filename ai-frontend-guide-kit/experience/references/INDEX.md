# References Index

Saved ideas bank. Cards follow `REFERENCE-PROTOCOL.md`; weights: **evidence** (UX/usability/a11y), **product** (real flows), **inspiration** (visual direction), **craft** (anti-generic, styles, agent skills).

## Cards in this folder

| Card | Weight | Tags | Why it matters |
|---|---|---|---|
| `reference-nng-10-heuristics.md` | evidence | audit, usability, feedback | The pass/fail checklist for every direction and screen |
| `reference-nng-journey-mapping.md` | evidence | journey, emotions, friction | Structure of the brief's journey section |
| `reference-govuk-design-system.md` | evidence | wizard, forms, progress | One question per page, review step, accessible errors |
| `reference-uswds-patterns.md` | evidence | long forms, in-page nav, a11y | Split long processes, save and resume, POUR |
| `reference-welie-interaction-patterns.md` | evidence | patterns, rationale | Choose patterns by problem, not looks |
| `reference-laws-of-ux.md` | evidence | principles, layout | Justify structure: Jakob, Hick, Fitts, peak-end |
| `reference-idf-five-elements.md` | evidence | process, planes | Strategy → scope → structure → skeleton → surface |
| `reference-martech-website-archetypes.md` | evidence | archetypes, ia | 8 site archetypes with success metrics |
| `reference-tubik-page-types.md` | product | page types, recovery | One job per page; 404/empty as recovery |
| `reference-webflow-questionnaire.md` | product | discovery, questions | Question grouping and tone |
| `reference-product-flow-libraries.md` | product | flows, onboarding, checkout | Study real recorded flows before inventing |
| `reference-superdesign-styles.md` | craft | styles, limits | Style = definition + recipe + when NOT to use |
| `reference-anti-ai-slop-taxonomy.md` | craft | anti-generic, audit | P0–P6 tells, purpose/convergence tests |
| `reference-anthropic-frontend-design.md` | craft | method, type, copy | Two-pass plan/review; subject-grounded choices |
| `reference-visual-galleries.md` | inspiration | composition, motion | Creative weight only, never UX evidence |
| `reference-scrollytelling.md` | inspiration | storytelling, motion | Sticky scenes, reduced-motion, performance |
| `reference-shape-of-ai.md` | product | ai, streaming, citations, trust | Lifecycle patterns for AI features: start, steer, verify, undo |
| `reference-wcag-22.md` | evidence | a11y, wcag, target size, focus | The five new 2.2 criteria to carry into components and audits |
| `reference-deceptive-patterns.md` | evidence | ethics, dark patterns, consent | Named anti-patterns to audit every conversion flow |
| `reference-core-web-vitals.md` | evidence | performance, lcp, inp, cls | Budgets that cap heavy effects and media |
| `reference-design-systems-catalog.md` | product | tokens, states, platform | Material 3, Carbon, Atlassian, Polaris, HIG, Fluent as behavior references |
| `reference-mobile-touch-guidelines.md` | evidence | mobile, touch, thumb zone | Target sizes, thumb reach, gesture alternatives |
| `reference-style-trends-2026.md` | inspiration | styles, trends | Liquid glass, kinetic type, hand-drawn, anti-design with their costs |

## Source registry (browse on demand)

**Evidence:** Nielsen Norman Group (`nngroup.com/articles`, heuristics, IA study guide, web UX study guide) · GOV.UK Design System (`design-system.service.gov.uk`, patterns incl. step-by-step and question pages) · USWDS (`designsystem.digital.gov/patterns`, accessibility) · Welie (`welie.com/patterns`) · Laws of UX (`lawsofux.com`) · Interaction Design Foundation (`interaction-design.org`, UX, UCD, 5 elements) · Material Design 3 (`m3.material.io`) · W3C WCAG (`w3.org/WAI/standards-guidelines/wcag/`).

**Product:** Mobbin (`mobbin.com`) · Page Flows (`pageflows.com`) · Refero (`refero.design`) · Gummble (`gummble.com`) · UXMaps (`uxmaps.co`) · TYPENORM (`typenorm.com/flows`) · Product Onboarding (`productonboarding.com`) · SaaS UI (`saasui.design`) · UI Patterns (`ui-patterns.com`) · UX Library (`uxlibrary.org`) · DesignerUp (`designerup.co`, pattern collections).

**Inspiration:** Awwwards (`awwwards.com`) · SiteInspire (`siteinspire.com`) · CSS Design Awards (`cssdesignawards.com`) · Godly/Recent (`godly.website`) · A1 Gallery (`a1.gallery`) · Muzli (`muz.li/inspiration`) · Landingfolio (`landingfolio.com`) · Lapa Ninja (`lapa.ninja`) · Land-book (`land-book.com`) · One Page Love (`onepagelove.com`) · SaaS Landing Page (`saaslandingpage.com`) · Saaspo (`saaspo.com`) · Dribbble (`dribbble.com/search/landing-page`).

**Craft & agents:** Superdesign (`superdesign.dev/styles`) · StyleKit (`stylekit.top/en/avoid-ai-slop`) · Design Binders (`designbinders.com`) · Design Lexicon (`freedesignmd.com/lexicon`) · IndexStyle (`indexstyle.org`) · neubrutalism.com · Anti-AI-Slop (`github.com/muris11/anti-ai-slop`) · Anthropic frontend-design (`github.com/anthropics/skills`) · Vercel Web Interface Guidelines (`github.com/vercel-labs/web-interface-guidelines`) · Taste Skill · Impeccable · Design Extractor (`design-extractor.com`) · designmd.run · Figma AI Skills (`figma.com/community/ai-skills`) · Design Skills Hub (`designskills.xyz`).

**AI, a11y, performance & ethics:** The Shape of AI (`shapeof.ai`) · Streaming Patterns (`streamingpatterns.com`) · WCAG 2.2 Quick Reference (`w3.org/WAI/WCAG22/quickref`) · Deceptive Patterns (`deceptive.design`) · Core Web Vitals (`web.dev/articles/vitals`) · Carbon (`carbondesignsystem.com`) · Atlassian (`atlassian.design`) · Polaris (`polaris.shopify.com`) · Apple HIG (`developer.apple.com/design/human-interface-guidelines`) · Fluent 2 (`fluent2.microsoft.design`).

**Questions & journey:** Webflow questionnaire (`webflow.com/blog/questionnaire-for-website-design`) · ybug (`ybug.io/blog/web-design-client-questionnaire`) · resourcefuldesigner (50 questions) · Service Design Tools (`servicedesigntools.org/tools/journey-map`) · Justinmind (`justinmind.com/ux-design/user-journey-map`) · Georgia Digital (personas and journeys).

## Rules

- Cite cards in `EXPERIENCE-BRIEF.md` as `[ref: <slug>]` next to what they justify.
- New cards: extract with Playwright MCP, same schema, add a row here; keep ≤ ~60 lines.
- Galleries stay as registry entries: store method + 2–4 representative cards, never bulk captures.
