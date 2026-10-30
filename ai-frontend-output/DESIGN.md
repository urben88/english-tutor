# DESIGN — English Tutor

Visual intent: a calm, warm room where you talk to a person. Warm paper neutrals, one terracotta accent, soft shapes, big readable captions. The character is the only high-impact element; everything else stays quiet. Motion is soft (150-250 ms) and only on user action or state change; reduced motion turns it off.

Source of truth for values: `frontend/src/styles.css` (`:root`, light + dark via `prefers-color-scheme`). Semantic names only.

## Color (light / dark)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-bg` | #f8f1e7 | #1b1411 | page |
| `--color-surface` | #fffaf3 | #261d18 | panels, dock |
| `--color-surface-2` | #f0e6d8 | #33271f | chips, hover, bubbles |
| `--color-border` | #e0d2bf | #45352b | hairlines |
| `--color-ink` | #2a201a | #f4eadf | text (>= 12:1) |
| `--color-ink-muted` | #6b5b4e | #b8a797 | secondary (>= 5:1) |
| `--color-accent` | #b4452a | #ee8e66 | primary action, links |
| `--color-on-accent` | #fffaf3 | #1b1411 | text on accent |
| `--color-ok` | #3f6b52 | #8fc3a2 | listening |
| `--color-warn` | #8a5a00 | #e8b85c | thinking |
| `--color-danger` | #a8321f | #f08a77 | muted, errors |
| `--color-focus` | #1f5fbf | #8cb8ff | focus ring |

## Type

Humanist sans, system stack (no web font download): `"Segoe UI Variable Text","Segoe UI",Candara,"Gill Sans","Trebuchet MS",system-ui,sans-serif`. Scale: 0.8125 / 0.9375 / 1 / 1.25 / 1.75 rem; captions 1.5 rem (clamp 1.25-1.75). No ALL-CAPS labels.

## Space, radius, motion

Spacing 4px base: 4, 8, 12, 16, 24, 40. Radius: 8 (controls), 16 (panels, dock), 999 (pills/stage). Hierarchy: stage > subtitles > dock > panels > header. Motion: `--ease: cubic-bezier(.2,.8,.2,1)`, 160 ms hover, 240 ms drawer, 4 s breathing on the stage. Elevation: drawer and dock only.
