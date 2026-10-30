# 07 — Adapt without rewriting

Purpose: make reused components look and feel like **this** product, without forking their internals.

## Order of adaptation (always in this order)

1. **Tokens first** — colors, radius, typography and spacing come from the Tailwind v4 theme (`03-TOKENS.md`). Never hardcode palette values in a component.
2. **Props and slots** — use the component's own API (variants, `className`, children) before touching its code.
3. **Wrapper** — if you need to reposition or resize, wrap the component; do not edit its files.
4. **Patch, last resort** — if the component must change internally, keep a short comment header: what changed, why, and the catalog id + `verified_at` so a future update can reconcile.

## Motion adaptation

- Replace linear/ease transitions with springs following `08-PHILOSOPHY.md`.
- Keep the interaction budget: max 1–2 high-impact animated blocks per view.
- Respect `prefers-reduced-motion`: wrap decorative animation or provide a static fallback.

## Anti-patterns

- Rebuilding a component "cleaner" from scratch just because its markup looked unusual (that is a new component now — it must go through `06-REUSE` reasoning again).
- Copying the same component into three screens instead of extracting one shared component.
- Adjusting spacing with magic pixel values instead of the token scale.

## Deliverable

- Components render with your tokens, your radius, your motion personality.
- Every internal patch is documented with catalog id + reason.
- The catalog's `get` card still describes the component accurately after adaptation (if not, note the divergence).
