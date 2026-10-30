# 04 — Component inventory

Purpose: turn each screen into a list of **needed components by category**, before looking at any library. This is the reflection step that makes the catalog useful.

**Source of truth:** `ai-frontend-output/ux/UX-SPEC.md` (from guide 02), coherent with `EXPERIENCE-BRIEF.md`. Inventory rows derive from its screens/blocks — including the empty, loading and error states listed there. Do not invent screens outside the UX-SPEC.

## Method

For every screen in `PRODUCT.md`:

1. Sketch the blocks top to bottom (mentally or on paper).
2. Label each block with a canonical category from `catalog/taxonomy.md` (e.g. `hero`, `features`, `pricing`, `forms`, `feedback`…).
3. Mark interaction needs separately (e.g. "animated counter", "spring tooltip").
4. Do **not** name libraries or components yet — categories only.

## Inventory table (write it to `INVENTORY.md`)

| Screen | Block | Category | Priority | Notes |
|---|---|---|---|---|
| Landing | Top section | hero | must | uses brand gradient |
| Landing | Plan comparison | pricing | must | monthly/annual toggle |
| Landing | FAQ | faq | should | accordion behavior |
| Dashboard | KPI row | data-display | must | 4 metrics, count-up |
| Signup | Form | forms | must | email + password, validation |

## Reflection questions (answer before step 04)

- Which blocks are **structural** (layout, navigation) vs **expressive** (hero, effects)?
  - Structural → prioritize stability (fewer animations, plain markup).
  - Expressive → candidates for high-impact animated components.
- Where will the user spend most time? Those screens deserve the most polish.
- What must work without JavaScript? (forms, critical navigation)
- Which blocks repeat across screens? Those should be one reused component, not copies.

## Rules

- One row per need; if a block combines several categories, split it.
- Priority: `must` / `should` / `nice`. Only `must` and `should` proceed to search.
- Keep the table under ~30 rows for an MVP; merge micro-details into their parent block.

Next: `05-FIND.md` turns rows into catalog matches.
