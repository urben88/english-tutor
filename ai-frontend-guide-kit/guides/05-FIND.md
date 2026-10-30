# 05 — Find candidates in the catalog

Purpose: map each inventory row to a short list of concrete catalog entries, with reasons.

## Query basics

```bash
node tools/find.mjs --category hero --commercial          # must-have filter for client work
node tools/find.mjs --category forms --stack react
node tools/find.mjs --text marquee --limit 8
node tools/find.mjs --source magicui --category backgrounds-effects
node tools/find.mjs --text "pricing toggle" --stack react --licensed --min-quality 70   # ranked by quality / relevance
node tools/get.mjs <entry-id>                             # full card: install, license, deps
```

Filters: `--category`, `--stack`, `--license`, `--commercial`, `--free`, `--source`, `--type`, `--text`, `--limit` (default 12), `--json`.

## Rank with Laya (recommended, local)

After the `find` shortlist and the `get` cards, rank the candidates with the local Laya engine, passing the **chosen direction** and the brief as context. Consent is once per session (recorded in `EXPERIENCE-BRIEF.md` from guide 01):

```bash
python tools/laya_select.py --check                    # ready? (exit 0 = usable)
python tools/laya_select.py --need "…" --dry-run        # preview the payload without the model
# after the user consented this session:
python tools/laya_select.py --need "…the block need…" --category <category> --commercial \
  --direction <experience-id> --context-file ai-frontend-output/ux/EXPERIENCE-BRIEF.md --confirmed
```

- `--direction <id>` is the chosen archetype/philosophy/style (the one recorded in `EXPERIENCE-BRIEF.md`, e.g. `exp-archetype-monitor`): its profile goes into the ranking state so the fit matches the UX direction. A wrong id only prints a warning and continues.
- Adopt Laya's order as the shortlist order; facts (license, install command, links) always come from `get`.
- The deterministic license/commercial filter runs **before** the model; probabilities are **relative** between candidates. If the top score is low, compare alternatives or broaden filters.
- No Python/Laya or no consent this session? Keep working with the candidate table and the heuristics below. The workflow never depends on Laya.

## Working method

1. Before searching, check saved combinations (they live next to the kit and survive refreshes):
   ```bash
   node tools/memory.mjs combo list
   ```
   If one fits this project, `node tools/memory.mjs combo show <name>` and reuse its entries (record them with `combo apply` or `add`).
2. For each inventory row run **one** `find` with the tightest filters.
3. If 0 results: broaden one filter at a time (category → text → drop stack). If still 0, mark "build custom" and move on.
4. For the top 2–3 results per row run `get` and note: license, commercial flag, dependencies, install command.
5. Add candidates to your working table; do not stop at the first result — compare at least two when available.
6. Present the shortlist to the user as **2–3 combinations** (see below), not loose links; iterate variants until the set fits.
7. Recommended: rank the shortlist with Laya passing `--direction <id>` and the brief as context (consent once per session); adopt its order and keep the facts from `get`.

## Candidate table (extend `INVENTORY.md`)

| Block | Candidate id | Source | License OK? | Why it fits | Alternative |
|---|---|---|---|---|---|
| Landing hero | aceternity-hero-aurora… | Aceternity | yes (commercial) | gradient + motion matching brand | magicui-…-warp |
| Pricing | preline-pricing-… | Preline | yes | toggle included, plain markup | floatui-pricing-… |
| KPI row | motionprimitives-text-… | Motion Primitives | MIT | count-up animation | build custom |

## Combination round (with the user)

Before closing the selection, group candidates into 2–3 purposeful combinations (e.g. nav + hero + background; pricing + toggle + FAQ) and present each one with:

- the rationale — why these pieces fit together (density, motion budget, personality);
- the catalog ids and the facts from `get` (license, install command);
- what changes in the other blocks if the user picks it.

The user picks or swaps; offer A/B variants when the trade-off is real. Components found on the web (not in the catalog) stay `provisional` until their license is verified on the origin page — never proposed as usable before that and never added to the catalog automatically. Record every choice with `memory.mjs add` and snapshot the accepted set with `combo save <name>`. Full protocol: `experience/DISCOVERY-LOOP.md` (phase B).

## Selection heuristics

- **Structural blocks** (nav, forms, tables): choose `daisyui`, `preline`, `shadcn`, `coss` — predictable, low animation.
- **Expressive blocks** (hero, backgrounds): choose `aceternity` / `magicui` / `motionprimitives` / `reactbits` / `animateui`, max 1–2 per view and within the performance budget (`09-VERIFY` section 5).
- **Micro details** (buttons, loaders, toggles): `uiverse`, `hover`, `motionprimitives`.
- **AI/agent surfaces**: `aicss`, `agentskit`, `21stdev` (check licenses first).
- Prefer the smallest dependency footprint; every `motion`-based piece costs bundle size and attention.

## License gate (quick)

- `non-commercial` → excluded for commercial projects (stop).
- `unknown` → open the docs URL and verify before shortlisting.
- `conditional` → read `limits` in the `get` card.

Next: `06-REUSE.md` decides reuse vs adapt vs build and installs.

## Ranking, duplicates and the explorer

- Results are ranked by `quality` (0-100: license clarity, install effort, dependency count, source maintenance tier). Use `--min-quality 70` for safer picks and `--licensed` to drop entries with an unknown license.
- `--text` is word-based: every word must match; name hits weigh more than tags, category and description. `--sort relevance|quality|name` overrides the order.
- The same component often exists in several sources. `find` collapses entries with the same name, category and framework and says how many it hid; `--all` shows every copy. Icons are hidden unless `--type icon` or `--all`.
- Other frameworks: `--stack vue` and `--stack svelte` return shadcn-vue / shadcn-svelte; `--stack headless` returns unstyled primitives (Base UI, React Aria Components) for projects that own all visuals.
- `catalog/explorer.html` is an offline explorer with the same filters, preview links and copy-install buttons: open it when the user wants to browse instead of describe.
