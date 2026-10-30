# Install Guides

Per-source instructions: prerequisites, exact install commands, how to get the code, dependencies, stack/Tailwind compatibility and free-plan limits. All prices and quotas verified on 2026-10-02.

---

## DaisyUI

- **Catalog:** https://daisyui.com/components/ (68 components)
- **Install:** `npm i -D daisyui@latest`
- **Setup (Tailwind v4):** in your CSS add `@import "tailwindcss";` and `@plugin "daisyui";`. Do not use `tailwind.config.js` (deprecated).
- **CDN:** `<link href="https://cdn.jsdelivr.net/npm/daisyui@5" rel="stylesheet" type="text/css" />` + `@tailwindcss/browser@4` script; add `daisyui@5/themes.css` for all themes.
- **Get the code:** copy-paste the HTML classes from each docs page (e.g. `.btn`, `.card`, `.modal`).
- **Dependencies:** none (pure CSS, no JS).
- **Stack / Tailwind:** Tailwind CSS v4 required; framework-agnostic (React, Vue, Svelte, Astro, plain HTML).
- **License / limits:** MIT. Paid extras: templates, charts, Figma library, MCP Blueprint (not required).

## Preline UI

- **Catalog:** https://preline.co/docs/components.html (640+ free examples)
- **Install:** `npm i preline @tailwindcss/forms`
- **Setup (Tailwind v4):** CSS: `@import "tailwindcss";`, `@source "./node_modules/preline/dist/*.js";`, `@import "./node_modules/preline/variants.css";`, `@plugin "@tailwindcss/forms";`. JS: load `node_modules/preline/dist/preline.js` at the end of `<body>`.
- **Get the code:** copy-paste from each docs page (Tailwind / dark / JSX tabs).
- **Dependencies:** `@tailwindcss/forms` (required); optional plugin libs: apexcharts, datatables.net, dropzone, nouislider, vanilla-calendar-pro, @floating-ui/dom.
- **Stack / Tailwind:** Tailwind v4; framework-agnostic (HTML + vanilla JS). Node ≥ 22 recommended by the package.
- **License / limits:** MIT + Preline Fair Use: free for commercial products; do not build a competing UI library; keep attribution when redistributing. Pro (€221 lifetime) adds premium blocks/templates (no redistribution).

## Aceternity UI

- **Catalog:** https://ui.aceternity.com/components (free registry items only in this manifest)
- **Prereqs:** React + Tailwind (v4 or v3 legacy) + shadcn/ui initialized (`npx shadcn@latest init`).
- **Install base:** `npm i motion clsx tailwind-merge` and create `lib/utils.ts` with `cn` (see Add Utilities docs).
- **Install component:** `npx shadcn@latest add https://ui.aceternity.com/registry/<name>.json` (or namespace `@aceternity` in `components.json`).
- **Get the code:** CLI installs the source into your repo, or copy-paste from the component page.
- **Dependencies:** usually `motion`; some components add `three`/`@react-three/fiber`, `@tsparticles/*`, `simplex-noise`, `react-syntax-highlighter`, radix packages, icons.
- **Stack / Tailwind:** React; Tailwind v4 current (v3 legacy docs available).
- **License / limits:** Proprietary (not MIT). Free components: unlimited personal/commercial client projects; no reselling/redistributing as a competing library. Premium blocks/templates require All-Access ($169/yr or $199 lifetime). Premium registry URLs return HTTP 401.

## Magic UI

- **Catalog:** https://magicui.design/docs/components
- **Install:** `npx shadcn@latest add @magicui/<name>` (shadcn CLI, same flow as shadcn/ui).
- **Get the code:** CLI, or copy-paste from the docs page.
- **Dependencies:** `class-variance-authority`, `lucide-react`, `tw-animate-css` (dev) plus `motion` for most components; some add `cobe`, `react-tweet`, `shiki`, `canvas-confetti`, `rough-notation`.
- **Stack / Tailwind:** React + TypeScript + Tailwind v4 (v3 legacy at v3.magicui.design).
- **License / limits:** MIT (components). Magic UI Pro ($199 one-time) adds templates/sections with its own license (no redistribution).

## Uiverse

- **Catalog:** https://uiverse.io/elements (community elements; this manifest indexes top 30 per category)
- **Install:** none; pure copy-paste.
- **Get the code:** open the element page → copy the HTML/CSS tab (Tailwind tab when available).
- **Dependencies:** none.
- **Stack / Tailwind:** plain HTML + CSS, or Tailwind. Framework-agnostic.
- **License / limits:** all elements published under MIT (site-wide statement); keep the author copyright notice. `uiverse.io` blocks plain HTTP clients with 403 — use a real browser to browse.

## 21st.dev

- **Catalog:** https://21st.dev/community/components (community components, shadcn-compatible)
- **Install:** with an API key: `npx shadcn@latest add "https://21st.dev/r/<author>/<slug>?api_key=$API_KEY_21ST"`. Free tier: 2 code copies/installs per day (shared across web, MCP and CLI).
- **Get the code:** copy prompt or TSX from the component page; or use the 21st CLI/MCP (`npx @21st-dev/cli@latest init`).
- **Dependencies:** declared per component (e.g. radix packages, cva, spline runtime).
- **Stack / Tailwind:** React + TypeScript + Tailwind, shadcn/ui compatible.
- **License / limits:** varies per component (MIT frequent, some `unknown` — verify on the page). Templates have separate terms. ToS forbids scraping: use only sitemap/markdown/API channels.

## shadcn/ui

- **Catalog:** https://ui.shadcn.com/docs/components
- **Install:** `npx shadcn@latest init`, then `npx shadcn@latest add <name>` (bases: Base UI default, `radix`, `aria`).
- **Get the code:** CLI writes the source into your repo; manual copy-paste also available.
- **Dependencies:** `class-variance-authority`, `cn`, `lucide-react`, `tw-animate-css`; per-component primitives (`@base-ui/react` or `radix-ui`, Recharts, Embla, Vaul, cmdk, Sonner).
- **Stack / Tailwind:** React (Next.js, Vite, React Router, Astro, TanStack Start); Tailwind v4 current.
- **License / limits:** MIT. Third-party registry directory may contain premium registries — check before adding.

## coss ui / Origin UI

- **Catalog:** https://coss.com/ui (coss ui) and https://coss.com/origin (legacy Origin, ~604 variants in 30 categories)
- **Install (coss ui):** `npx shadcn@latest add @coss/<name>` (or bundle `@coss/ui`, preset `@coss/style`).
- **Install (legacy Origin):** copy-paste, or `npx shadcn@latest add https://coss.com/origin/r/<name>.json`.
- **Dependencies:** coss ui is built on Base UI (`@base-ui/react`) + Tailwind v4; legacy Origin uses Radix.
- **Stack / Tailwind:** React + Tailwind v4.
- **License / limits:** MIT for the component directories (`apps/ui`, `apps/origin`); the rest of the coss repo is AGPL — do not copy non-MIT parts.

## Float UI

- **Catalog:** https://floatui.com/components (31 categories, ~192 components)
- **Install:** none; copy-paste only (no npm package or CLI).
- **Get the code:** open a component page, expand "Code", copy; source also at https://github.com/MarsX-dev/floatui (`previewsComponents/`).
- **Dependencies:** radix packages, framer-motion, tailwind-merge, @heroicons/react (per component).
- **Stack / Tailwind:** React/Next.js + Tailwind (Vue/Svelte claimed on-site, not verified live).
- **License / limits:** custom Float UI license (not OSI): commercial end products allowed; redistributing components/templates standalone or as starter kits/themes is not.

## Hover.dev

- **Catalog:** https://www.hover.dev/components (58 free of 153)
- **Install:** none; copy-paste.
- **Get the code:** free components show **VIEWCODE** inline on the category page; paid components require Hover Pro (one-time $49).
- **Dependencies:** framer-motion/Motion; some components use @react-three/fiber or anime.js.
- **Stack / Tailwind:** React + Tailwind + Motion.
- **License / limits:** proprietary custom license (not MIT). Free and paid components usable commercially, no attribution; no repackaging as a competing service.

## Tailblocks

- **Catalog:** https://tailblocks.cc (63 blocks in 15 categories)
- **Install:** none; copy-paste HTML + Tailwind classes.
- **Get the code:** pick block + color scheme + light/dark → View Code; raw sources at https://github.com/mertJF/tailblocks (`src/blocks/`).
- **Dependencies:** none.
- **Stack / Tailwind:** plain HTML + Tailwind; any framework.
- **License / limits:** MIT, no attribution required (keep the notice when redistributing the code itself).

## HyperUI

- **Catalog:** https://www.hyperui.dev (540 examples across application/marketing/neobrutalism + 5 templates)
- **Install:** none; copy-paste.
- **Get the code:** copy from the site, or fetch raw examples from GitHub (`public/examples/<collection>/<category>/<n>.html`). Note: the site's robots.txt disallows crawling `/examples/`, so use the GitHub raw files for automation.
- **Dependencies:** none.
- **Stack / Tailwind:** Tailwind CSS v4; plain HTML, any framework.
- **License / limits:** MIT.

## Motion Primitives

- **Catalog:** https://motion-primitives.com/docs (33 components)
- **Install:** `npm install motion` + `npx motion-primitives@latest add <name>`; list with `npx motion-primitives@latest list`.
- **Get the code:** CLI writes to `components/motion-primitives/`, or copy-paste from the docs page.
- **Dependencies:** `motion`, `clsx`, `tailwind-merge`, `lucide-react`; some add `react-use-measure`.
- **Stack / Tailwind:** React/Next.js + Tailwind + Motion.
- **License / limits:** MIT (core). Pro sections/templates are a separate paid product.

## Agents Kit

- **Catalog:** https://agents-ui.github.io/agents-kit/components (224 registry blocks)
- **Prereqs:** React 19 + Tailwind v4 + shadcn/ui initialized.
- **Install:** `npx shadcn@latest add https://agents-ui.github.io/agents-kit/c/<name>.json` (or namespace `@agents-kit`).
- **Get the code:** CLI copies the source; per-item JSON embeds the full source. Import required styles (`styles/agents.css` + collection CSS).
- **Dependencies:** declared per entry (motion, lucide-react, radix/aria components, shiki, streamdown, katex; voice: @livekit/components-react, @elevenlabs/react, three).
- **Stack / Tailwind:** React 19 + Tailwind v4; some v0.1 components retain Next.js code.
- **License / limits:** **original Agents Kit families are non-commercial** (written permission required); ported collections keep MIT/Apache-2.0. Check the `license_type` and `commercial_use` fields of each entry before commercial use. All entries are free to install.

## aicss.dev

- **Catalog:** https://www.aicss.dev (18 components: 13 free, 5 Pro)
- **Install (npm):** `npm install @aicss/react` (React ≥ 18; Next.js needs `transpilePackages: ["@aicss/react"]`).
- **Install (CLI):** `npx @aicss/cli add <slug>` (add `--framework vue|svelte` for those targets); Pro requires `AICSS_TOKEN`.
- **Install (registry):** `npx shadcn@latest add https://www.aicss.dev/r/<slug>.json`.
- **Get the code:** copy-paste React/Vue/Svelte from the component page; free code is public; do not reconstruct Pro source.
- **Dependencies:** none beyond react/react-dom (CSS Modules, no Tailwind required).
- **Stack / Tailwind:** React, Vue, Svelte; self-contained CSS with design tokens.
- **License / limits:** MIT for free components and CLI. Pro: one-time $89 Personal / $299 Enterprise, no redistribution. Do not reconstruct or transcribe Pro components (explicit AI-assistant instruction in llms.txt).

## Design Systems Repo (designsystemsrepo.ai)

- **Catalog:** https://designsystemsrepo.ai/design-systems (26 design systems)
- **Install:** not installable — it is a reference directory (no code stored).
- **Use:** open each system's documentation and Figma kit link to extract tokens and component guidance.
- **Dependencies:** none.
- **Stack / Tailwind:** each system has its own stack; verify on its site.
- **License / limits:** directory has no declared content license (credit `designsystemsrepo.ai`, Shift+R); each indexed system keeps its own license, which the directory does not capture. Access via the site's Machine Mode Markdown or one low-frequency CMS fetch — do not redistribute the dataset.

---

## Validation findings (2026-10-02, sandbox)

Practical checks run in a fresh Next.js 16 + Tailwind v4 + `--src-dir` project:

- **One build, four sources:** shadcn/ui (`npx shadcn@latest init -d`), Magic UI (`npx shadcn@latest add "https://magicui.design/r/marquee.json"`), Motion Primitives (`npx motion-primitives@latest add text-effect`) and DaisyUI (`npm i -D daisyui@latest` + `@plugin "daisyui";`) compiled together with `npm run build` (daisyUI 5.7.47 detected, TypeScript and static generation passed).
- **Motion Primitives + `--src-dir`:** its CLI writes to `<project-root>/components/motion-primitives/`, outside `src/`. With the default `@/* -> ./src/*` alias, move the folder to `src/components/motion-primitives/` (or extend the alias) so `@/components/motion-primitives/...` resolves.
- **21st.dev without API key:** registry URLs (e.g. `https://21st.dev/r/shadcn/button`) return HTTP 403. The documented free quota (2 copies/installs per day) applies through the web UI, MCP or CLI with an API key.
- **Aceternity premium detection:** premium registry items return HTTP 401 while free ones return 200 — this is the mechanism the extractor uses to exclude Pro content.
- **Agents Kit license:** `LICENSE.md` in the repository is a custom Non-Commercial License; commercial use of original Agents Kit families requires written permission. Ported collections keep MIT/Apache-2.0 (see each entry's `license_type`).

## Kibo UI

- **Catalog:** https://www.kibo-ui.com/components (40 compound components: kanban, gantt, table, editor, AI blocks, calendar).
- **Install:** `npx shadcn@latest add https://www.kibo-ui.com/r/<name>.json` or `npx kibo-ui add <name>`.
- **Stack / Tailwind:** React + shadcn/ui + Tailwind.
- **License / limits:** MIT (verified from the repository `license.md`).

## Animate UI

- **Catalog:** https://animate-ui.com/docs/components (animated shadcn-style primitives, Radix and Base UI variants).
- **Install:** `npx shadcn@latest add https://animate-ui.com/r/<name>.json`.
- **Dependencies:** `motion`, `tw-animate-css`, `class-variance-authority`, `lucide-react`.
- **License / limits:** MIT + Commons Clause — free inside apps, sites and products; do not resell the components as a library or template.

## cult/ui

- **Catalog:** https://www.cult-ui.com/docs/components (animated and AI-oriented components, 150+ ui and component items).
- **Install:** `npx shadcn@latest add https://www.cult-ui.com/r/<name>.json`.
- **Dependencies:** mostly `motion`; some entries add `zustand`, `ai` or editor libraries — read `dependencies` in the entry.
- **License / limits:** MIT (open-source components); Pro blocks have a separate license.

## React Bits

- **Catalog:** https://reactbits.dev (animations, backgrounds, text effects, components; indexed one entry per component, TS + Tailwind variant).
- **Install:** `npx shadcn@latest add @react-bits/<Name>-TS-TW` (variants: `JS-CSS`, `JS-TW`, `TS-CSS`, `TS-TW`).
- **Dependencies:** often `gsap`, `three`, `ogl` or `motion`; WebGL entries cost INP/LCP — see `reference-core-web-vitals.md`.
- **License / limits:** MIT + Commons Clause — free in products; no resale of the components themselves.

## shadcn-vue and shadcn-svelte

- **Catalog:** https://www.shadcn-vue.com/docs/components (Vue, Reka UI) and https://shadcn-svelte.com/docs/components (Svelte, Bits UI, plus 147 blocks: dashboards, login, sidebars, calendars).
- **Install:** `npx shadcn-vue@latest add <name>` / `npx shadcn-svelte@latest add <name>` (run `init` first).
- **License / limits:** MIT. Use these instead of the React sources when the project is Vue or Svelte.

## Mantine

- **Catalog:** https://mantine.dev/core/getting-started/ (100+ components with hooks, forms, dates, charts, notifications packages).
- **Install:** `npm i @mantine/core @mantine/hooks`, wrap the app in `MantineProvider`, import `@mantine/core/styles.css`.
- **Stack:** React with its own theme and CSS variables (not Tailwind-first). Map your tokens into the Mantine theme.
- **License / limits:** MIT.

## Base UI

- **Catalog:** https://base-ui.com/react/overview/quick-start (unstyled accessible primitives from the MUI team).
- **Install:** `npm i @base-ui/react`; style with Tailwind or CSS.
- **License / limits:** MIT.

## React Aria Components

- **Catalog:** https://react-spectrum.adobe.com/react-aria/components.html (accessible, unstyled; best i18n and keyboard behavior).
- **Install:** `npm i react-aria-components`; Tailwind users add `tailwindcss-react-aria-components`.
- **License / limits:** Apache-2.0.

## Arc UI

- **Catalog:** https://uiarc.dev (105 components and 22 blocks with calm motion: actions, inputs, data, disclosure, feedback, text; blocks such as sign-in, plan comparison, hero, FAQ, command palette).
- **Install:** register `@uiarc` (`https://uiarc.dev/r/{name}.json`) in `components.json`, then `npx shadcn@latest add @uiarc/<name>`. Each item pulls the shared `arc-foundation` item (design and motion tokens).
- **Stack:** React + `motion` + CSS modules (not Tailwind): map your tokens into `arc-foundation`.
- **License / limits:** MIT for the free source (verified from the `kuratlielia/arc-library` LICENSE). Pro components have extra restrictions and are not indexed.

## Material UI

- **Catalog:** https://mui.com/material-ui/all-components/
- **Install:** `npm i @mui/material @emotion/react @emotion/styled`; wrap the app in `ThemeProvider` and define tokens with `createTheme`.
- **Stack:** React + Emotion (not Tailwind). Material Design look by default: theme heavily if the brand is not Material.
- **License / limits:** MIT (core). MUI X Pro/Premium and paid templates are separate and not indexed.

## Chakra UI

- **Catalog:** https://chakra-ui.com/docs/components/concepts/overview (v3, built on Ark UI).
- **Install:** `npm i @chakra-ui/react @emotion/react`, then `npx @chakra-ui/cli snippet add <name>` for the copy-in snippets.
- **License / limits:** MIT.

## Ant Design

- **Catalog:** https://ant.design/components/overview
- **Install:** `npm i antd`; theme through `ConfigProvider` design tokens.
- **Stack:** React + CSS-in-JS. Dense enterprise look; large bundle, tree-shake imports.
- **License / limits:** MIT.

## Radix Primitives

- **Catalog:** https://www.radix-ui.com/primitives
- **Install:** `npm i radix-ui` (or a single package, e.g. `@radix-ui/react-dialog`). Unstyled: bring Tailwind or CSS.
- **License / limits:** MIT. It is the behavior layer under shadcn/ui.

## Headless UI

- **Catalog:** https://headlessui.com/react/menu
- **Install:** `npm i @headlessui/react` (a Vue package, `@headlessui/vue`, also exists). Unstyled, Tailwind-friendly.
- **License / limits:** MIT.

## Flowbite

- **Catalog:** https://flowbite.com/docs/getting-started/introduction/
- **Install:** `npm i flowbite`, add the plugin to the Tailwind config and import `flowbite/dist/flowbite.min.js` for interactive parts. Plain HTML + Tailwind; framework wrappers exist.
- **License / limits:** MIT for the open-source components. Flowbite Pro and most of Flowbite Blocks are paid (see the `resources` source entry).

## Mantine UI

- **Catalog:** https://ui.mantine.dev (about 120 copy-paste sections on Mantine, one catalog entry per category).
- **Install:** requires Mantine (`@mantine/core`); open the category page and copy the variant you want.
- **License / limits:** MIT.

## shadcn/ui blocks

- Official free blocks (dashboard-01, sidebar-01..16, login-01..05, signup-01..05, chart variants) are indexed in the `shadcn` source with `entry_type: block`.
- **Install:** `npx shadcn@latest add dashboard-01` (pulls the shadcn/ui components it needs).

## Curated resources (icons, illustrations, kits)

- **Icon sets:** Lucide (ISC), Heroicons (MIT), Tabler Icons (MIT), Phosphor Icons (MIT): install via npm (`lucide-react`, `@heroicons/react`, `@tabler/icons-react`, `@phosphor-icons/react`). Use one set per project.
- **Illustrations:** unDraw (free, no attribution, no redistribution or AI training), Storyset (free with attribution; Flaticon Premium removes it).
- **Design-tool libraries:** Figma Community (free files are CC BY 4.0, per-file license), Canva (Content License Agreement; check branded and people/logo content).
- **Paid or partly paid:** Tailwind Plus (paid one-time license), Untitled UI React (free MIT tier + PRO), Flowbite Blocks (free subset + Pro). Only reference entries exist: the kit never stores their code.
- Each entry links the license evidence page in `manual_steps`; re-verify before client delivery because terms and prices change.
