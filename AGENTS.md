# Project agent instructions

<!-- ai-frontend-guide-kit:start -->
## Frontend UI and design (ai-frontend-guide-kit)
**Routing rule:** any request about design, UI or UX goes through `ai-frontend-guide-kit/AGENTS.md` first
(the `ai-frontend-guide` skill), before proposing designs or writing UI code. Triggers include:
design, redesign, restyle, UI, UX, look and feel, theme, colors, typography, fonts, spacing, layout, screen, page,
landing, dashboard, component, form, animation, polish; diseño, rediseñar, estilo, aspecto, tema, colores,
tipografía, fuentes, espaciado, maquetación, pantalla, página, landing, componente, formulario, animación, pulir.
Do not design from scratch: reuse > adapt > build, using the catalog (`node ai-frontend-guide-kit/tools/find.mjs`).
External design skills (impeccable, taste-skill, emilkowalski) run only inside phase 3 through `frontend-polish`.
Ask the user first what they want (new frontend UX -> composition -> polish, a small change, a custom
addition, or polish only) and enter the three-phase workflow at the right point before touching code.
New frontends start with the experience direction (`ai-frontend-guide-kit/guides/01-EXPERIENCE-DIRECTION.md`
-> `ai-frontend-output/ux/EXPERIENCE-BRIEF.md`) before flows, tokens or components.
Optional accelerator: `python ai-frontend-guide-kit/tools/laya_select.py --check` (local Laya decision engine;
ask the user once per session before ranking questions, direction or components).
Selection memory: record every decision with `node ai-frontend-guide-kit/tools/memory.mjs add ...` and reuse saved
combinations from `ai-frontend-output/` before searching the catalog.
Polish phase: use the `frontend-polish` skill with Playwright MCP (`npx @playwright/mcp@latest`).
UX map: generate and maintain `ai-frontend-output/ux/ux-map.excalidraw` with the `ux-map` skill and the local Excalidraw MCP
(`node ai-frontend-guide-kit/tools/excalidraw-mcp.mjs --diagram ai-frontend-output/ux/ux-map.excalidraw`, offline, no install).
<!-- ai-frontend-guide-kit:end -->
