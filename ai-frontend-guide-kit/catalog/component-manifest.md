# Component Manifest

Light index of 4287 reusable UI entries across 34 sources. Generated 2026-10-04.

**Rule:** consult this catalog before writing any component from scratch. Filter with `find`, inspect with `get`, then follow `guides/06-REUSE.md`.

## Sources

| Source | Entries | License | Granularity | Detail |
|---|---|---|---|---|
| 21st.dev | 785 | Varies per component (MIT frequent; some unknown) | curated: top 30 per tag across 40 tags | `sources/21stdev.json` |
| Aceternity UI | 112 | Proprietary (free tier; commercial use allowed, no redistribution) | complete free registry:ui set (premium detected via HTTP 401) | `sources/aceternity.json` |
| Agents Kit | 224 | Non-commercial for original families; MIT/Apache-2.0 for ported collections | complete (224 registry blocks) | `sources/agentskit.json` |
| aicss.dev | 13 | MIT (free components); Pro under a custom one-time license | complete for the 13 free components (Pro excluded by design) | `sources/aicss.json` |
| Animate UI | 414 | MIT + Commons Clause (use in products; no resale of the components) | complete (all registry:ui items) | `sources/animateui.json` |
| Ant Design | 68 | MIT | components of antd (docs URLs verified) | `sources/antd.json` |
| Arc UI | 127 | MIT (free source; Pro components have additional restrictions and are not indexed) | complete (registry:ui + registry:block, all marked free) | `sources/arcui.json` |
| Base UI | 38 | MIT | complete (components of @base-ui/react) | `sources/baseui.json` |
| Chakra UI | 82 | MIT | components of @chakra-ui/react v3 (docs URLs verified) | `sources/chakra.json` |
| coss ui / Origin UI | 76 | MIT for component directories (apps/ui and apps/origin); AGPL elsewhere in the repo | coss ui complete; legacy Origin indexed at base-component level (30 categories, ~604 variants upstream) | `sources/coss.json` |
| cult/ui | 155 | MIT (open-source components); Pro blocks have a separate license | complete (registry:ui + registry:component) | `sources/cultui.json` |
| DaisyUI | 68 | MIT (library); templates/charts/Figma assets sold separately | complete (68 components) | `sources/daisyui.json` |
| Design Systems Repo | 26 | Directory has no declared content license; each indexed system keeps its own | complete (26 design systems) | `sources/dsr.json` |
| Float UI | 198 | Custom Float UI license (not MIT/OSI; commercial end products allowed) | complete (192 components) | `sources/floatui.json` |
| Flowbite | 44 | MIT (open-source components); Flowbite Pro blocks/templates and part of Flowbite Blocks are paid | components of the open-source Flowbite docs (docs URLs verified) | `sources/flowbite.json` |
| Headless UI | 16 | MIT | public components of @headlessui/react (docs URLs verified) | `sources/headlessui.json` |
| Hover.dev | 53 | Proprietary custom license (free tier commercially usable, no attribution) | complete free set only (58 free of 153; paid requires Pro) | `sources/hover.json` |
| HyperUI | 266 | MIT | curated: top 5 per category (540 total in source) | `sources/hyperui.json` |
| Kibo UI | 40 | MIT (verified from the shadcnblocks/kibo repo license.md) | complete (all registry:ui items) | `sources/kiboui.json` |
| Magic UI | 78 | MIT (components); Pro templates have a separate license | complete (all registry:ui items) | `sources/magicui.json` |
| Mantine | 108 | MIT | complete (components of @mantine/core) | `sources/mantine.json` |
| Mantine UI | 24 | MIT | one entry per category (about 120 variants inside) | `sources/mantineui.json` |
| Motion Primitives | 33 | MIT (core); Pro sections have a separate paid license | complete (33 components) | `sources/motionprimitives.json` |
| Material UI | 57 | MIT (core); MUI X Pro/Premium and templates are paid | main components of @mui/material (sub-parts folded into their parent, docs URLs verified) | `sources/mui.json` |
| Preline UI | 85 | MIT + Preline UI Fair Use License (dual) | complete at page level (component docs pages with variant headings) | `sources/preline.json` |
| Radix Primitives | 30 | MIT | public primitives of Radix (docs URLs verified) | `sources/radix.json` |
| React Aria Components | 51 | Apache-2.0 | complete (react-aria-components source files) | `sources/reactaria.json` |
| React Bits | 213 | MIT + Commons Clause (use in products; no resale of the components) | complete (one entry per component, TS + Tailwind variant) | `sources/reactbits.json` |
| Curated resources | 11 | Per resource: icon sets MIT/ISC, illustrations with custom terms, paid kits proprietary. See each entry. | curated: icon sets, illustrations, design-tool libraries and paid UI kits (reference level) | `sources/resources.json` |
| shadcn/ui | 160 | MIT | complete (registry:ui items + official registry:block items) | `sources/shadcn.json` |
| shadcn-svelte | 203 | MIT | complete (registry:ui + registry:block) | `sources/shadcnsvelte.json` |
| shadcn-vue | 66 | MIT | complete (registry:ui) | `sources/shadcnvue.json` |
| Tailblocks | 63 | MIT | complete (all 63 free blocks) | `sources/tailblocks.json` |
| Uiverse | 300 | MIT (all community elements; author copyright notices apply) | curated: top 30 per category across 10 categories (~4.268 elements upstream) | `sources/uiverse.json` |

## Categories

| Category | Entries |
|---|---|
| micro-interactions | 780 |
| forms | 689 |
| data-display | 671 |
| feedback | 330 |
| navigation | 303 |
| ai-surfaces | 238 |
| overlay | 208 |
| backgrounds-effects | 200 |
| text | 147 |
| layout | 140 |
| blocks-sections | 131 |
| media | 122 |
| features | 54 |
| testimonials | 53 |
| hero | 50 |
| cta | 48 |
| pricing | 44 |
| faq | 42 |
| design-system | 28 |
| assets | 7 |
| template | 2 |

## How to query

```bash
node tools/find.mjs --category hero --stack react --commercial   # short candidate list
node tools/get.mjs <entry-id>                                    # full decision card + install command
```

Read `taxonomy.md` for category definitions, `install-guides.md` for setup per source, and `sources/<id>.json` only when you need the raw entries of one source.
