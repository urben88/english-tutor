# Question Bank — adaptive discovery

The agent asks these questions **in rounds of 3–5**, never as a single form. Each answer updates the state of `EXPERIENCE-BRIEF.md`, unlocks or discards later questions, and is never asked again. Questions already answered by `REPO-CONTEXT.md`, `PRODUCT.md`/PRD, the code or a previous answer are **deduced, not asked**.

## Rules

1. Compute eligible questions: dependencies satisfied, not answered, not deducible.
2. If more than 3 are eligible and the user consented to Laya, rank them with `--dataset experience --kind question --task next-question` and ask the winner; otherwise follow phase order.
3. Ask one question at a time in conversation, with 2–4 options plus free text ("otra").
4. Record the answer in the brief; if the answer is ambiguous, rank the options with `--task options` or ask a short clarification.
5. Stop when the brief has: context, goal, audience, archetype inputs, philosophy inputs and constraints. Do not interrogate: 10–18 answered questions is usually enough.

## Phase 1 · Context

| ID | Question | Options |
|---|---|---|
| q01-what | What are we building? | marketing site · web app · tool/dashboard · commerce · docs/content · hybrid |
| q02-who | Who uses it? | daily professionals · occasional customers · general public · internal team |
| q03-goal | Main goal of the site? | convert/sell · explain/inform · complete a task · community/grow · teach · monitor/operate |
| q04-success | What action proves success? | sign up · buy · contact/lead · finish a task · return/learn |
| q05-frequency | How often will they use it? | once · occasionally · weekly · daily |
| q06-existing | Starting point? | from scratch · redesign · add a new area |
| q42-content-ready | Do real content and brand assets exist? | yes · partly · placeholders needed · AI-generated allowed |

## Phase 2 · Experience philosophy

| ID | Question | Options |
|---|---|---|
| q07-pace | Fast and direct, or exploratory and memorable? | fast/direct · balanced · exploratory |
| q08-priority | What should the experience prioritize? | efficiency · trust · emotion · discovery · conversion |
| q09-feel | What should it feel like? | tool · magazine · catalog · laboratory · story |
| q10-understand | Understand in seconds, or discover gradually? | seconds · progressive discovery |
| q11-familiarity | Conventional or experimental? | familiar · distinctive · experimental (controlled) |
| q12-personality | Brand personality? | technical · human · premium · rebel · institutional · playful · scientific |

## Phase 3 · Navigation and information architecture

| ID | Question | Options |
|---|---|---|
| q13-areas | How many main areas? | 1–3 · 4–6 · many |
| q14-order | Must users follow an order, or explore freely? | guided order · free exploration · mixed |
| q15-main-task | Is there a dominant task that should own the interface? | yes · no · not sure |
| q16-organization | How should content be organized? | categories · time · location · hierarchy · user type · workflow |
| q17-search | Will they search, filter or compare? | no · search · filters · compare |
| q18-persistence | Do they need save/resume/history? | no · save/resume · history/activity |

## Phase 4 · Archetype

| ID | Question | Options |
|---|---|---|
| q19-page-job | Does the main page explain a proposal or let them do a task? | explain · do a task · both |
| q20-shape | Closest shape? | landing · dashboard · catalog · documentation · configurator |
| q21-behavior | What will they mostly do? | read · explore · compare · input data · visualize · control |
| q22-linearity | Linear or non-linear journey? | linear · non-linear · mixed |
| q23-realtime | Does it show live state, alerts or progress? | no · some states · real-time |
| q24-content-vs-ui | What dominates: content or interaction? | content · interaction · balanced |

## Phase 5 · Creative control

| ID | Question | Options |
|---|---|---|
| q25-risk | How bold should the proposals be? | conservative · innovative · radical |
| q26-avoid | Anything to avoid? | gradients/cards cliché · playful · corporate · dense · animated |
| q27-generic | Avoid the classic hero + 3 cards + testimonials? | yes · no preference |
| q28-motion | Acceptable motion level? | none/subtle · moderate · rich (with purpose) |
| q29-creativity | Where should creativity live? | composition · navigation · content · interaction |
| q30-fixed | What must not change across proposals? | brand · copy · structure · nothing |

## Phase 6 · Real constraints

| ID | Question | Options |
|---|---|---|
| q31-devices | Priority devices? | desktop · mobile · both |
| q32-a11y | Accessibility needs beyond WCAG AA? | no · keyboard/screen reader · motor/vision · low literacy |
| q33-connectivity | Offline or poor connectivity? | no · sometimes · yes |
| q34-environment | Special environment? | no · industrial/gloves · touch/kiosk · low light |
| q35-wcag | WCAG target? | AA · AAA where possible · not defined |
| q36-limits | Biggest constraint? | time · budget · content · stack |
| q37-ai-features | Does the product include AI features? | no · assistive · conversational · agentic |
| q38-languages | Languages and regions? | one · several · RTL needed · not sure |
| q39-performance | Performance budget? | standard (CWV good) · strict (low-end) · effects if justified · not defined |
| q40-theme | Light, dark or both? | light · dark · both (system) · both (user switch) |
| q41-consent-legal | Personal data, payments or regulation? | no · personal data/cookies · payments · regulated sector |

## Laya commands

```bash
# which question to ask next (state = brief in progress)
python ai-frontend-guide-kit/tools/laya_select.py --dataset experience --kind question \
  --task next-question --context-file ai-frontend-output/ux/EXPERIENCE-BRIEF.md --confirmed

# rank the options of a question when the free-text answer is ambiguous
python ai-frontend-guide-kit/tools/laya_select.py --dataset experience --kind question \
  --task options --text "q25-risk" --context-file ai-frontend-output/ux/EXPERIENCE-BRIEF.md --confirmed
```

Without Laya: follow phase order and the dependency notes above; the brief is the same.
