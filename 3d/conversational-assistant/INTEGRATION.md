# Integration guide

Status (2026-10-30): **integrated** in `frontend/` with the steps below (relative imports, no alias).

## 1. Dependencies

| Package | Why | Where |
|---|---|---|
| `three` | WebGL renderer and glTF loader | `dependencies` |
| `@types/three` | TypeScript types | `devDependencies` |

```bash
cd frontend
npm install three@0.170.0
npm install -D @types/three@0.170.0
```

Version 0.170.0 is what the standalone demo was validated with. A newer version should work, but the demo would need re-checking.

## 2. Make the folder importable (keep it in `3d/`)

`frontend/vite.config.ts`: `resolve: { dedupe: ["three", "react", "react-dom"] }` (bare imports from `3d/` resolve to frontend/node_modules) and `server.fs.allow: [".."]`.

`frontend/tsconfig.json`: add `"../3d/conversational-assistant/src"` to `include`, plus `paths` for `three`, `three/addons/*`, `react` and `react/*` pointing at `./node_modules/@types/...`.

## 3. Import and render

In the container `frontend/src/App.tsx`. Actual wiring: passed as `children` of `CharacterStage`, rendered only when `supportsWebGL()` and not failed, otherwise the orb placeholder stays:

```tsx
import { useRef } from "react";
import { ConversationalAssistantView } from "../../3d/conversational-assistant/src/react";
import type { ConversationalAssistant, ElementConfig } from "../../3d/conversational-assistant/src/types";
import assistantConfig from "../../3d/conversational-assistant/config/element.config.json";
import modelUrl from "../../3d/conversational-assistant/assets/models/conversational-assistant.glb?url";

const config = assistantConfig as unknown as ElementConfig; // module scope: a stable reference, no remounts

// inside App():
const assistant = useRef<ConversationalAssistant | null>(null);
const avatarState = tutor.speaking ? "speaking" : tutor.busy ? "thinking" : voice.listening ? "listening" : "idle";

<ConversationalAssistantView
  ref={assistant}
  config={config}
  modelUrl={modelUrl}
  state={avatarState}
  className="assistant-3d" // give it a size, e.g. height: 320px
/>
```

`voice.listening` is a placeholder. Use whichever flag your voice-mode hook exposes.

## 4. Configuration

Everything is in `config/element.config.json`:

- `camera`: framing (position, target, fov).
- `expressions`: morph weights, head offset and gaze per expression.
- `gestures`: per-bone rotations in degrees, with hold time and oscillation.
- `smoothing`: how fast poses, expressions, visemes and blinks blend.
- `states`: which expression or gesture each app state uses.
- `morphAliases`: map logical names to another model's morphs (for example a VRM).

Pose angles are in rest-pose world axes: X = nod or forward, Y = turn, Z = sideways tilt (Y up, the model faces +Z).

## 5. Gestures and animations

```ts
await assistant.current?.gesture("wave");   // wave | point | explain | listen | idea
assistant.current?.playAnimation("point");  // same thing
```

The promise resolves once the arm is back at idle.

## 6. Expressions and states

```ts
assistant.current?.setExpression("happy");   // neutral | happy | listening | thinking | surprised | speaking
assistant.current?.setState("thinking");     // idle | listening | thinking | speaking
```

## 7. Speech and lip-sync

Without touching `player.ts`, procedural mouth movement runs while `state` is `speaking`. For example:

```ts
assistant.current?.speak();          // until stopSpeaking()
assistant.current?.stopSpeaking();
assistant.current?.speak({ text });  // estimated duration from word count
```

For audio-driven lip-sync, `player.ts` must expose its `Audio` element. Proposed diff:

```diff
-export function createBrowserPlayer(): Player {
+export function createBrowserPlayer(onAudio?: (audio: HTMLAudioElement) => void): Player {
@@
         const audio = new Audio(url);
         current = audio;
+        onAudio?.(audio);
         audio.onended = stop;
```

Then, in `App.tsx`:

```ts
const player = useMemo(
  () => props.player ?? createBrowserPlayer((audio) => void assistant.current?.speak({ audio })),
  [props.player],
);
```

`speak({ audio })` routes the element through Web Audio, which stays audible. It ends when the audio ends or is paused, which matches `player.stop()`. Cross-origin audio without CORS falls back to procedural movement. The player uses blob URLs, so this does not happen here.

You can also feed a level from your own analyser: `setSpeechLevel(0..1)`.

## 8. Removing it

1. Delete the `<ConversationalAssistantView … />` line and its imports.
2. Revert the `vite.config.ts` / `tsconfig.json` / `player.ts` changes.
3. `npm uninstall three @types/three`.
4. Delete `3d/conversational-assistant/`.

Unmounting calls `dispose()`. That frees the geometry, materials, renderer and canvas, and detaches the audio analyser.

## 9. Common errors

| Symptom | Cause / fix |
|---|---|
| `Failed to resolve import "three"` from a `3d/` file | `resolve.dedupe: ["three"]` is missing in Vite |
| `fetch … responded with 404` in `onError` | Wrong `modelUrl`. Use the `?url` import or put the GLB in `frontend/public/` |
| Blank area, no error | Container has no height. Give it a CSS height |
| Mouth does not follow audio | `speak({ audio })` not wired, or `AudioContext` blocked before a user gesture. The first click or keypress unlocks it |
| Model loads twice in dev | React StrictMode mounts twice. Harmless, the first instance is disposed |

## 10. Performance

- About 27k triangles, no textures, one canvas: light for any GPU from the last decade.
- `rendering.maxPixelRatio: 1.5` saves fill-rate on 4K screens.
- Hide the component (or unmount it) when the panel is not visible. `hide()` keeps the GPU loop running; unmounting does not.

## Upgrading to VRM (optional, later)

1. Build the character in **VRoid Studio** (free) using the reference sheet, then export VRM 1.0. It comes with expressions and the visemes `aa ih ou ee oh`.
2. A `.vrm` is a glTF file, so this loader can already read its meshes and morphs. Map the raw VRoid morph names in `morphAliases`, for example `"viseme_aa": "Fcl_MTH_A"` and `"blink_L": "Fcl_EYE_Close_L"`. Map the bone names in `bones` and in the gesture poses (`J_Bip_R_UpperArm`, …), then retune the angles.
3. Validating the VRM metadata, or using its expression and look-at system, needs `@pixiv/three-vrm`. That is a new dependency and needs approval.
