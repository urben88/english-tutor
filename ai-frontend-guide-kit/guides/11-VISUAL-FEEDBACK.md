# 11 — Visual feedback (Agentation: point at it, say what to change)

For when the user wants to change **specific things on the rendered page** and would rather click the element than describe it in text. [Agentation](https://www.agentation.com) adds an annotation toolbar to the running app; its MCP server hands each annotation (element, selector, component, the user's note) to the agent, which changes exactly that and marks it resolved.

Optional. Never a prerequisite for any phase. React 18+, desktop browser, development only.

## When to use it

- **During** phase 2: fine adjustments to a block that is already rendered ("this padding", "this heading", "this button's radius").
- **At the end** of phase 3: after `frontend-polish`, one human round of "I point, you change" before closing the screen.
- **Small changes** (`10-ITERATE.md`): when the user can click the element, use this instead of locating it from a text description.
- **Not for**: flows, new screens or redesigns (UX phase), nor as a replacement for `09-VERIFY.md`.

## Install (message to give the user)

Once per machine (MCP server) and once per project (component):

```bash
npm install agentation -D
claude mcp add agentation -- npx -y agentation-mcp server
npx agentation-mcp doctor     # verifies Node, the local server and the Claude Code MCP config
```

On Windows, if the MCP does not start, register it through the shell: `claude mcp add agentation -- cmd /c npx -y agentation-mcp server`.

OpenCode (`opencode.json`): `"mcp": { "agentation": { "type": "local", "command": ["npx", "-y", "agentation-mcp", "server"], "enabled": true } }`.

Mount the component once in the app root, **development only** (Next.js `app/layout.tsx` or Vite `main.tsx`/`App.tsx`):

```tsx
import { Agentation } from 'agentation';

{process.env.NODE_ENV === 'development' && <Agentation endpoint="http://localhost:4747" />}
```

Restart the agent session after registering the MCP so the `agentation_*` tools load. Projects that are not React (Vue, Svelte, plain HTML) cannot use the toolbar: fall back to the Playwright MCP loop in `frontend-polish` and ask the user to name the element.

## How the user uses it

1. Run the app in dev and open the page.
2. Activate the Agentation toolbar, click the element, write exactly what to change. Several annotations can be queued.
3. Tell the agent: *"process the Agentation annotations"*.

## Agent loop

1. Call `agentation_watch_annotations` (or `agentation_get_pending`) to receive the batch.
2. `agentation_acknowledge` each annotation you will act on.
3. Find the code from the annotation's selector/component and apply the **smallest change** that satisfies the note. Keep tokens (`03-TOKENS.md`), the license notices of reused components and the interaction physics of `08-PHILOSOPHY.md`.
4. Re-verify the touched state (Playwright snapshot/screenshot, console clean). No annotation is closed without a re-check.
5. `agentation_resolve` with a one-line summary of what changed. If the change swapped or adapted a catalog component, record it with `memory.mjs add` (see `10-ITERATE.md`).
6. Unclear note → `agentation_reply` with a question. Note that contradicts `PRODUCT.md`, tokens or a license, or that implies a UX change → `agentation_reply` explaining why and wait for the user; if declined, `agentation_dismiss`.

When the batch is done, run the affected checks of `09-VERIFY.md` (the `@playwright/test` suite) once.

## Rules

- One annotation = one change; do not bundle unrelated edits.
- Never silently redesign; propose UX changes instead of applying them.
- The component never ships to production: keep the `NODE_ENV === 'development'` guard (or remove the import before release).
- Annotations are local by default; the toolbar only sends data to the configured `endpoint` (localhost).
- Say so if the MCP is not available or the project is not React; never claim an annotation was processed when it was not.
