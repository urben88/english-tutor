# 06 — Reuse, adapt or build

Purpose: decide per inventory row and execute the installation with a documented justification.

## Decision tree

```
Need from inventory
   │
   ├─ Catalog entry exists?
   │     ├─ License compatible with this project?
   │     │     ├─ YES → Stack compatible?
   │     │     │     ├─ YES → REUSE (install as-is)
   │     │     │     └─ NO  → ADAPT (port markup/deps to the project stack)
   │     │     └─ NO  → search alternatives (broader filters)…
   │     │              └─ none suitable → BUILD CUSTOM (08-PHILOSOPHY)
   │     └─ (unknown license: verify on docs URL first)
   └─ No entry → search with broader filters → still none → BUILD CUSTOM
```

Record the path taken and one sentence of reasoning per row. "I liked it" is not a reason; "matches hero intent, MIT, reacts to scroll like the anchor requires" is.

## Install by method (use the `install_command` from `get`)

```bash
# shadcn-cli (shadcn, magicui, aceternity, coss, agentskit)
npx shadcn@latest add @magicui/marquee
npx shadcn@latest add "https://ui.aceternity.com/registry/3d-card.json"

# npm package
npm i preline @tailwindcss/forms
npx motion-primitives@latest add text-effect

# copy-paste (daisyui, uiverse, tailblocks, hyperui, floatui, hover)
#   → open docs_url, copy markup, paste into the project
```

After install: run the dev server, render the component in isolation once, and confirm it builds **before** integrating.

## Quotas and gates to respect

- 21st.dev free: 2 code copies/installs per day; CLI/MCP need an API key (403 without it).
- Aceternity premium registry URLs return 401 — only the free tier is in the catalog.
- Agents Kit original families are non-commercial; ported collections are MIT/Apache (check each entry).
- Float UI / Hover / Aceternity / 21st.dev: commercial end products OK; redistributing the components themselves is not.

## Prohibitions

- Never copy third-party component source into this guide folder or any shared catalog.
- Never strip license notices from copied files.
- Do not install a component whose license you have not confirmed when `commercial_use` is `conditional` or `unknown`.

## Record every decision (required)

```bash
node tools/memory.mjs add --screen <screen> --block <block> --need "<need>" \
  --decision reuse|adapt|build --id <entry-id> [--style a,b] [--notes "..."]
```

- Facts (license, commercial flag, install command) are copied from the catalog — never type them by hand.
- `--screen` and `--block` MUST match the names used in `ai-frontend-output/ux/UX-SPEC.md` (this keeps UX and component decisions in sync).
- Custom build: `--decision build --name "Custom logo marquee"` (no id needed).
- Check progress with `node tools/memory.mjs list`; the generated summary lives in `ai-frontend-output/SUMMARY.md`.
- When a screen's decisions are complete, save them as a reusable combination:
  ```bash
  node tools/memory.mjs combo save <name> --note "what this combination is for"
  ```
  Combinations can be reused in other projects (`combo show`/`combo apply`) by copying `combinations.json` or pointing `AI_FRONTEND_OUTPUT` to a shared folder.

## Deliverable

Every inventory row recorded in the memory: `reused | adapted | built` + entry id + justification. The history and `SUMMARY.md` are the auditable decision log.

Next: `07-ADAPT.md`.
