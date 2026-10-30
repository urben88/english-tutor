# 08 — Design philosophy

Distilled rules from `impeccable` (anti-generic + audit), `taste-skill` (hierarchy, density) and `emilkowalski` (springs, micro-feedback). Apply these when adapting components and when building custom.

## Hierarchy and density (taste)

- One primary action per screen; secondary actions are visually quieter.
- No boxes inside boxes: remove redundant wrappers before adding padding.
- Spacing from a scale (4/8/12/16/24/32/48/64…), not arbitrary pixels.
- Alignment beats decoration: if it looks slightly off, fix alignment before adding effects.
- Dense is fine for dashboards, sparse is fine for landing pages — but be consistent within a screen.
- Text hierarchy: max 3 sizes visible at once, weight before size.

## Interaction physics (emilkowalski)

- Springs instead of linear transitions:
  ```tsx
  transition={{ type: "spring", stiffness: 400, damping: 30 }}
  ```
- Micro-feedback on press: subtle scale, no bounce abuse:
  ```tsx
  whileTap={{ scale: 0.98 }}
  ```
- Animate **transform** and **opacity**; avoid animating layout properties.
- Feedback must be immediate (< 100 ms perceived); slow animations feel broken.
- One motion idea per interaction (a fade OR a slide OR a scale — not three at once).
- Page transitions: prefer the View Transitions API; no flashy full-screen wipes.

## Anti-generic rules (impeccable + experience direction)

- Full anti-generic list and P0/P1 tells: `experience/STYLE-DIRECTIONS.md`; apply the purpose and convergence tests to every screen.
- No default purples/blue gradients, no generic glassmorphism wallpaper, no stock "AI look".
- The design must express the `PRODUCT.md` personality; if you can swap the logo and it fits any competitor, iterate.
- Contrast is non-negotiable: body text ≥ 4.5:1, large text ≥ 3:1.
- Audit continuously: at the end of each screen, run the `impeccable` audit if installed (`/impeccable audit <screen>`), otherwise self-review with the checklist below.

## Combination limits

- Max **1–2 high-impact effects** per view (aurora backgrounds, beams, tilt, particles).
- Effects must not compete: one animated background per view, one text effect per section.
- If a component needs a library only for one detail, consider a lighter alternative from the catalog.

## Self-review checklist

- [ ] Primary action unmistakable at first glance.
- [ ] Spacing follows the scale; no random values.
- [ ] Animations use springs and run on transform/opacity.
- [ ] Reduced motion respected.
- [ ] Nothing "default-looking" survived (colors, fonts, radii all from tokens).
- [ ] The effect budget is respected.

Next: `09-VERIFY.md` proves it.
