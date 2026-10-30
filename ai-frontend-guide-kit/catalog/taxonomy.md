# Taxonomy

Canonical categories used by the Component Manifest. Every entry's `category` MUST be one of these values. This file also documents the mapping from each source's own categories to the canonical set; extraction scripts apply these maps.

## Canonical categories

| Category | Covers |
|---|---|
| `navigation` | Navbars, menus, breadcrumbs, pagination, tabs, steps, sidebars, docks, toolbars |
| `hero` | Hero sections and above-the-fold landing blocks |
| `features` | Feature grids/lists, bento layouts, how-it-works content |
| `pricing` | Pricing tables, plan comparisons, billing toggles |
| `cta` | Call-to-action sections, banners, announcements |
| `testimonials` | Testimonials, social proof, logos, reviews |
| `faq` | FAQ sections and accordions used as FAQ content |
| `forms` | Inputs, selects, checkboxes, radios, switches, file uploads, authentication forms, contact forms, field validation |
| `data-display` | Tables, stats, KPIs, timelines, avatars, badges, cards showing data, charts, kanban |
| `feedback` | Alerts, toasts, notifications, loaders, progress, skeletons, status, tooltips |
| `overlay` | Modals, dialogs, drawers, popovers, dropdown surfaces, context menus |
| `layout` | Structure: dividers, footers, section headers, grids, stacks, empty states, 404 pages |
| `backgrounds-effects` | Decorative backgrounds: gradients, particles, beams, aurora, grids, shaders, borders, glow |
| `micro-interactions` | Animated buttons, toggles, hover/tap effects, cursor, reveal-on-scroll, swaps |
| `text` | Text effects and typography animations (shimmer, scramble, rotate, loop) |
| `media` | Carousels, sliders, galleries, images, videos, device mockups, image comparison |
| `blocks-sections` | Multi-component marketing/app sections that combine several pieces (team, blog, ecommerce, full blocks) |
| `ai-surfaces` | Agent/AI conversation UI: chat, thinking states, tool calls, streaming text, approvals, voice |
| `design-system` | Full design systems and token/theme references (not single components) |
| `template` | Complete page templates (landing, portfolio, dashboard) |
| `assets` | Icon sets, illustrations and design-tool libraries (not code components) |

## Source → canonical mapping

### daisyui
Actions→`micro-interactions`; Data display→`data-display`; Navigation→`navigation`; Feedback→`feedback`; Data input→`forms`; Layout→`layout`; Mockup→`media`.

### preline
Layout & Content→`layout`/`blocks-sections`; Base Components→`micro-interactions`/`data-display`/`feedback` (per component); Navigations→`navigation`; Basic Forms→`forms`; Advanced Forms→`forms`; Overlays→`overlay`; Tables→`data-display`; Third-Party Plugins→`data-display` (charts) / `forms` (pickers).

### aceternity
Backgrounds & Effects→`backgrounds-effects`; Card Components→`data-display`; Scroll & Parallax→`micro-interactions`; Text Components→`text`; Buttons→`micro-interactions`; Loaders→`feedback`; Navigation→`navigation`; Inputs & Forms→`forms`; Overlays & Popovers→`overlay`; Carousels & Sliders→`media`; Layout & Grid→`layout`; Data & Visualization→`data-display`; Cursor & Pointer→`micro-interactions`; 3D→`backgrounds-effects`; Sections and Blocks Free→`blocks-sections`; free hero sections→`hero`.

### magicui
Components→`backgrounds-effects`/`micro-interactions` (per component); Special Effects→`backgrounds-effects`; Animations→`micro-interactions`; Text Animations→`text`; Device Mocks→`media`; Buttons→`micro-interactions`; Backgrounds→`backgrounds-effects`; Community→`blocks-sections`.

### uiverse
buttons→`micro-interactions`; checkboxes→`forms`; switches→`micro-interactions`; cards→`data-display`; loaders→`feedback`; inputs→`forms`; radio-buttons→`forms`; forms→`forms`; patterns→`backgrounds-effects`; tooltips→`feedback`.

### 21stdev
heroes→`hero`; texts→`text`; cta→`cta`; navigation-menus→`navigation`; images→`media`; backgrounds→`backgrounds-effects`; features→`features`; scroll-areas→`micro-interactions`; galleries→`media`; pricing→`pricing`; faqs→`faq`; videos→`media`; testimonials→`testimonials`; stats→`data-display`; steppers→`navigation`; team→`blocks-sections`; marquees→`micro-interactions`; borders→`backgrounds-effects`; timelines→`data-display`; announcements→`cta`; footers→`layout`; buttons→`micro-interactions`; cards→`data-display`; forms→`forms`; inputs→`forms`; icons→`media`; grids-bento→`features`; badges→`data-display`; avatars→`data-display`; toggles→`forms`; dropdowns→`overlay`; spinners→`feedback`; dashboards→`blocks-sections`; progress→`feedback`; links→`navigation`; lists→`data-display`; modals→`overlay`; selects→`forms`; tables→`data-display`; menus→`navigation`; profiles→`blocks-sections`; tooltips→`feedback`; ai-chats→`ai-surfaces`; notifications→`feedback`; charts→`data-display`; alerts→`feedback`; calendars→`forms`; carousels→`media`; tabs→`navigation`; checkboxes→`forms`; accordions→`faq`; search-bars→`forms`; sliders→`forms`; paginations→`navigation`.

### shadcn
Form & Input→`forms`; Layout & Navigation→`layout`/`navigation`; Overlays & Dialogs→`overlay`; Feedback & Status→`feedback`; Display & Media→`data-display`/`media`; Misc→`micro-interactions`.

### coss-origin
coss ui primitives follow shadcn conventions (same mapping). Legacy Origin UI categories map: accordion/alert/avatar/badge/banner/breadcrumb/button/calendar/checkbox/image-cropper/dialog/dropdown/file-upload/event-calendar/input/navbar/notification/pagination/popover/radio/select/slider/stepper/switch/table/tabs/textarea/timeline/tooltip/tree → per closest canonical category (accordion→`faq` when FAQ, else `micro-interactions`; alert/notification→`feedback`; banner→`cta`; calendar/event-calendar→`forms`; image-cropper/file-upload/input/checkbox/radio/select/slider/switch/textarea→`forms`; dialog/dropdown/popover→`overlay`; navbar/breadcrumb/pagination/stepper→`navigation`; table→`data-display`; tabs→`navigation`; timeline→`data-display`; tooltip→`feedback`; tree→`navigation`; avatar/badge→`data-display`; button→`micro-interactions`).

### floatui
Marketing: banners→`cta`; cta sections→`cta`; team→`blocks-sections`; contact→`forms`; footers→`layout`; logo grid→`testimonials`; 404 pages→`layout`; heroes→`hero`; faqs→`faq`; feature sections→`features`; pricing→`pricing`; testimonials→`testimonials`; stats→`data-display`; newsletters→`forms`. Application: inputs→`forms`; tables→`data-display`; paginations→`navigation`; cards→`data-display`; alerts→`feedback`; section headers→`layout`; steps→`navigation`; buttons→`micro-interactions`; tabs→`navigation`; navbars→`navigation`; select menus→`forms`; modals→`overlay`; avatars→`data-display`; authentication→`forms`; sidebars→`navigation`; radio groups→`forms`; context menus→`overlay`.

### hover
buttons→`micro-interactions`; cards→`data-display`; carousels→`media`; countdown→`data-display`; dropdown menus→`navigation`; grids→`features`; inputs→`forms`; links→`navigation`; loaders→`feedback`; modals→`overlay`; navbars & menus→`navigation`; notifications→`feedback`; other→`backgrounds-effects`/`text`/`micro-interactions` (per component); progress→`feedback`; tabs→`navigation`; tables→`data-display`; text→`text`; toggles→`micro-interactions`; sections: faq→`faq`; forms→`forms`; heros→`hero`; features→`features`; pricing→`pricing`; sign in→`forms`; stats→`data-display`; testimonials→`testimonials`; 3d→`backgrounds-effects`; kanban→`data-display`.

### tailblocks
Blog→`blocks-sections`; Contact→`forms`; Content→`blocks-sections`; CTA→`cta`; Ecommerce→`blocks-sections`; Feature→`features`; Footer→`layout`; Gallery→`media`; Header→`navigation`; Hero→`hero`; Pricing→`pricing`; Statistic→`data-display`; Step→`features`; Team→`blocks-sections`; Testimonial→`testimonials`.

### hyperui
Application and Marketing categories map per component type (accordions→`faq`; badges/avatars/stats/charts/timelines→`data-display`; buttons→`micro-interactions`; forms controls→`forms`; dropdowns/modals→`overlay`; menus/navbars/breadcrumbs/pagination/steps/tabs→`navigation`; toasts/alerts/progress/loaders/empty states→`feedback`/`layout`; marketing sections→`hero`/`features`/`pricing`/`cta`/`testimonials`/`faq`/`blocks-sections`; footers/headers→`layout`/`navigation`; neobrutalism variants follow the same component-type mapping).

### motion-primitives
Core: accordion→`micro-interactions`; animated background→`backgrounds-effects`; animated group→`micro-interactions`; border trail→`backgrounds-effects`; carousel→`media`; cursor→`micro-interactions`; dialog→`overlay`; disclosure→`micro-interactions`; in view→`micro-interactions`; infinite slider→`media`; transition panel→`micro-interactions`. Text Effects→`text`. Number Effects→`text`. Interactive Elements: dock→`navigation`; glow effect→`backgrounds-effects`; image comparison→`media`; scroll progress→`feedback`; spotlight→`backgrounds-effects`; spinning text→`text`; tilt→`micro-interactions`. Toolbars→`navigation`. Advanced Effects: magnetic→`micro-interactions`; morphing dialog/popover→`overlay`; progressive blur→`backgrounds-effects`.

### agentskit
Collections: AI Elements→`ai-surfaces`; Generated results & runtime controls→`ai-surfaces`; Voice→`ai-surfaces`; App examples→`blocks-sections`; source collections (Beautiful UI, beUI, Blocks.so, BoardUI, Libraries.dev, Prompt Kit, ElevenLabs, LiveKit, OrbKit, v0.1 compatibility)→map per component type using the same rules as above, defaulting to `ai-surfaces` when the component is an agent interaction surface.

### aicss
All 18 components→`ai-surfaces` (thinking & reasoning, tool & action states, text outputs, structured outputs, rich & interactive conversation elements).

### design-systems-repo
All entries→`design-system`.
