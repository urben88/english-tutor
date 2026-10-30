# 03 — Design tokens

Purpose: fix the visual system (color, type, radius, spacing) **before** choosing components, so every reused piece inherits your identity instead of the library's defaults.

## Option A — Figma available (Figma MCP)

1. Configure the Figma MCP server (token in the editor's MCP config).
2. Ask the agent to inspect the file and extract: color palette, type scale, radii, base spacing.
3. Write the values to `DESIGN.md` and to the Tailwind v4 theme (`@theme` in your CSS).

Prompt template:

> "Inspect the Figma file at [URL]. Extract palette, type scale, radii and layout spacing. Store them in `DESIGN.md` and in the Tailwind v4 theme, following the `impeccable` guidelines if installed."

## Option B — No Figma (fallback)

1. Derive tokens from the **visual brief** of `ai-frontend-output/ux/EXPERIENCE-BRIEF.md` (style, palette intent, typography personality, composition, motion, anti-generic list) plus `PRODUCT.md`: brand adjectives, competitor contrast, audience expectations.
2. If the product needs a system-level reference, search the catalog's design systems:
   ```bash
   node tools/find.mjs --type design-system
   node tools/get.mjs <id>   # docs + Figma kit link
   ```
3. Define in `DESIGN.md`: 1 primary + 1 accent color, neutral ramp, 2 font roles, spacing scale, corner radius, motion personality (calm / snappy / playful).

## Rules

- Semantic names only (`--color-primary`, `--color-surface`), never palette names in components.
- Dark mode from day one if the product is a dashboard or dev tool.
- Contrast: body text ≥ 4.5:1; verify before moving on.
- Motion personality here decides how springs feel in `08-PHILOSOPHY.md`.

## Deliverables

- `DESIGN.md` with the token tables.
- Tailwind v4 `@theme` block in the global CSS.
- A one-paragraph "visual intent" you can quote when choosing components.

Next: `04-INVENTORY.md`.
