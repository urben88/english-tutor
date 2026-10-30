# 10 — Iterate (small changes & custom additions)

For requests that are **not** a new build: adjusting a block, adding a custom component, tweaking copy, layout, spacing or an interaction on an existing UI. Do not repeat the UX phase; do not skip memory or verification.

## The minimal loop

1. **Locate.** Find the block in `ai-frontend-output/ux/UX-SPEC.md` (its `--screen`/`--block` names) and its code. If the repo has no UX-SPEC, use the screen/route names as they are. In a React project where the user can click the element in the browser, use `11-VISUAL-FEEDBACK.md` (Agentation) instead of locating it from a text description.
2. **Reuse first.** Check saved combinations (`node ai-frontend-guide-kit/tools/memory.mjs combo list`) and query the catalog (`find`/`get`). Facts — license, dependencies, install command — always come from `get`.
3. **Decide.** reuse (install as-is) / adapt (tokens, props) / build (only if nothing fits or the license blocks you; follow `08-PHILOSOPHY.md`).
4. **Apply.** Make the smallest change that satisfies the request; keep the design tokens and the interaction physics (springs, transform/opacity only, 1–2 high-impact effects per view).
5. **Map.** If the change adds, removes or renames screens or transitions, update `ai-frontend-output/ux/ux-map.excalidraw` with the `ux-map` skill (incremental; labels = `UX-SPEC.md` names).
6. **Polish.** Run the `frontend-polish` skill on the touched screen/block. Fallback: `08-PHILOSOPHY.md` checklist + the `@playwright/test` regression of `09-VERIFY.md`.
7. **Record.** Register the decision right away:

```bash
node ai-frontend-guide-kit/tools/memory.mjs add --screen <screen> --block <block> --need "..." \
  --decision reuse|adapt|build [--id <entry-id>] [--notes "..."]
```

## When it stops being "small"

Go back to the router (`00-START-HERE.md`) and re-enter a phase when the change:

- touches 3+ screens or adds a new flow → phase 1 (UX) first;
- needs a new inventory of several blocks → phase 2 from `04-INVENTORY.md`;
- implies a redesign of how the screen works → ask the user; UX changes are phase 1.

## Rules

- One need per memory decision; record before moving to the next block.
- Never silently redesign: a small change stays small; propose UX changes instead of applying them.
- Reused components keep their license notices.
- Polish is part of the loop — a change is not done with console errors, broken focus or unverified states.
