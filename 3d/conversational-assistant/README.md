# Conversational assistant (3D)

A stylized 3D bust of the English tutor. It blinks, talks, changes expression, moves its head and gestures with its right arm (wave, point, explain, listen, idea). Every change eases back to idle.

| File | What it is |
|---|---|
| `PROJECT-ANALYSIS.md` | Stack findings, workflow comparison, whether visemes are needed |
| `CHARACTER-OR-ASSET-SPEC.md` | What the model contains, budgets, why there is no `.vrm` |
| `INTEGRATION.md` | How to add it to the app (needs `three`) and how to remove it |
| `VALIDATION-REPORT.md` | What was checked, what was not, known limitations |

## Folder

```text
assets/models/        conversational-assistant.glb (runtime) + .blend (source)
assets/reference-images/  the sheet and background used as reference
config/element.config.json  camera, expressions, gestures, smoothing, states
src/                  index.ts (entry), controls.ts (animation), loader.ts, types.ts, react.tsx
examples/standalone.html  demo page with buttons for every expression and gesture
tools/                build_model.py (Blender generator), validate_model.py
validation/screenshots/   evidence for the report
dist/                 compiled JS for the demo (generated)
```

## Quick try (no install)

Serve this folder with any static server, then open `examples/standalone.html`. For example, from this folder:

```bash
npx serve .   # or: python -m http.server
```

The demo loads three.js from a pinned CDN, only for the demo.

## Rebuild

```bash
# Model (Blender 5.2+)
blender -b --factory-startup --python tools/build_model.py -- --out assets/models/conversational-assistant.glb --blend assets/models/conversational-assistant.blend
blender -b --factory-startup --python tools/validate_model.py -- assets/models/conversational-assistant.glb

# Demo JS (uses the frontend's TypeScript)
../../frontend/node_modules/.bin/tsc -p tsconfig.json --noCheck
```

## API

```ts
const a = createConversationalAssistant({ container, config, modelUrl });
await a.ready;
a.setState("listening");            // idle | listening | thinking | speaking
a.setExpression("happy");
await a.gesture("wave");
await a.speak({ audio });           // or { text } / { durationMs } / nothing
a.stopSpeaking();
a.dispose();
```
