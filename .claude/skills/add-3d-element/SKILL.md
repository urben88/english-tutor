---
name: add-3d-element
description: Add a reusable, isolated 3D element to an existing software project. Generate the 3D asset from scratch or from user-provided reference images, create a self-contained folder with models, textures, animations, source code, configuration and integration instructions, then adapt the integration to the project's existing stack. Use for adding 3D characters, avatars, mascots, objects, product viewers, scenes or interactive widgets to web, desktop, mobile or game projects.
level: advanced
---

# Add 3D Element

## Purpose

Add one new 3D element to an existing project without breaking its current architecture.

The skill must:

1. Inspect the existing project.
2. Identify its stack, rendering environment and conventions.
3. Create an isolated folder for the 3D element.
4. Generate the 3D asset from scratch or from reference images.
5. Add the minimum code required to load, render and control the element.
6. Produce clear integration instructions.
7. Never modify unrelated application code without explicit approval.

## Core principles

- The 3D element must be modular and portable.
- All generated files must live under one dedicated folder.
- The element must be removable without breaking the host application.
- Prefer free and open-source tools and libraries.
- Prefer standard formats: `.glb` for general 3D, `.vrm` for humanoid avatars, `.hdr` for environment maps and `.ktx2` or compressed textures for web optimization.
- Do not assume the project uses React, Vue, Angular, Svelte, Next.js, Unity, Unreal, Flutter or any other framework until it has been inspected.
- Do not install dependencies without explaining why they are needed.
- Do not overwrite existing files.
- If a required dependency already exists, reuse it.
- If the project has no 3D runtime, propose the lightest suitable option and ask for approval before installing it.

## Required inputs

Ask the user for missing information, but do not block progress if reasonable defaults can be chosen.

### Required

- Element name, in kebab-case, for example `english-teacher-avatar`.
- Intended use: character, avatar, mascot, object, product, scene or UI widget.
- Target platform: web, desktop, mobile, game engine or embedded viewer.
- Visual style: realistic, stylized, low-poly, cartoon, anime, voxel or abstract.
- Whether the element will be generated from scratch or from reference images.

### Optional

- Reference images.
- Color palette.
- Dimensions or real-world scale.
- Required animations.
- Required interactions.
- Performance budget.
- Whether it must support transparency.
- Whether it must be animated by user input, application state, audio, voice or an AI agent.

## Project inspection

Before creating anything, inspect the repository.

1. Identify the package manager: npm, pnpm, yarn, bun, pip, poetry, uv, cargo, gradle, maven or another.
2. Identify the language and framework.
3. Identify the existing rendering stack, if any.
4. Detect whether Three.js, Babylon.js, React Three Fiber, PlayCanvas, Unity, Unreal, Godot, Flutter, Qt or another 3D runtime is already used.
5. Detect the build system and folder conventions.
6. Detect TypeScript, JavaScript, Python, C#, C++ or other relevant languages.
7. Detect existing asset folders and naming conventions.
8. Detect whether the app is SSR, SPA, static, Electron, Tauri, mobile or native.
9. Summarize the findings before writing files.

Create a short inspection report at:

```text
3d/<element-name>/PROJECT-ANALYSIS.md
```

The report must include:

- Detected stack.
- Existing 3D dependencies.
- Recommended 3D runtime.
- Recommended asset format.
- Integration point.
- Risks and constraints.
- Files that may need modification.

## Folder contract

Create this structure:

```text
3d/<element-name>/
├── README.md
├── PROJECT-ANALYSIS.md
├── CHARACTER-OR-ASSET-SPEC.md
├── INTEGRATION.md
├── assets/
│   ├── models/
│   ├── textures/
│   ├── animations/
│   ├── audio/
│   └── reference-images/
├── src/
│   ├── index.<ext>
│   ├── loader.<ext>
│   ├── controls.<ext>
│   └── types.<ext>
├── config/
│   └── element.config.json
└── examples/
    └── standalone.<ext>
```

Use the project's existing language extension for source files. For example, use `.ts` in a TypeScript project and `.js` in a JavaScript project.

The `assets/reference-images/` folder is mandatory when the user provides images.

## Asset specification

Before generating the model, create:

```text
3d/<element-name>/CHARACTER-OR-ASSET-SPEC.md
```

The specification must define:

- Purpose of the element.
- Visual description.
- Style and proportions.
- Color palette.
- Polygon budget.
- Texture budget.
- Scale and units.
- Pivot point.
- Required meshes.
- Required materials.
- Required animations.
- Required facial expressions, if it is a character.
- Required morph targets or blend shapes, if applicable.
- Interaction model.
- Accessibility considerations.
- Performance constraints.
- Export formats.

For a character, always specify:

- Head, torso, arms and hands if a bust is required.
- Full body if full-body animations are required.
- Eye blink morph targets.
- Mouth morph targets or visemes.
- At least these expressions: neutral, happy, surprised, thinking, listening and speaking.
- At least these animations: idle, talk, wave, point, think, listen and react.

For a non-character object, specify:

- Geometry parts.
- Materials and roughness/metalness.
- Animation or movement requirements.
- Interaction requirements.
- Whether it needs physics.

## Generation modes

### Mode A — Generate from scratch

Use this mode when no reference images are provided or when the user wants a custom original design.

1. Create the asset specification.
2. Choose a procedural or code-based approach when possible.
3. Build the model using the project's 3D runtime.
4. Keep geometry simple and animation-friendly.
5. Use named groups for parts that will move.
6. Add basic idle animation.
7. Add controls for rotation, zoom, visibility and interaction.
8. Export or save a reusable component.

Prefer procedural generation when:

- The element is simple.
- The project already uses a 3D runtime.
- The user wants fast iteration.
- File size and maintainability matter.

### Mode B — Generate from reference images

Use this mode when the user provides one or more images.

1. Copy all provided images into:

```text
3d/<element-name>/assets/reference-images/
```

2. Analyze each image.
3. Extract visual traits: shape, proportions, colors, clothing, materials, pose, expression and distinctive details.
4. Create a consistent asset specification.
5. Choose one of these generation paths:

#### Path 1 — Image-to-3D reconstruction

Use when visual resemblance is the priority.

- Use a local, free or open-source image-to-3D tool when available.
- Recommended default: TripoSR for single-image reconstruction.
- Export the result as `.glb`.
- Inspect the mesh for broken geometry, floating parts, bad topology and texture issues.
- Do not assume the generated mesh is rigged.
- Add rigging, morph targets and animations only if required by the specification.

#### Path 2 — Reference-guided procedural model

Use when the element must be lightweight, editable and web-friendly.

- Use the images only as visual reference.
- Build the model procedurally in the project's 3D runtime.
- Match proportions, colors and recognizable features.
- Keep the model modular and easy to animate.

#### Path 3 — External 3D authoring workflow

Use when high visual quality or a rigged humanoid is required.

- Recommend Blender, VRoid Studio, Blockbench or another appropriate free tool.
- Provide exact modeling, rigging, UV, texture and export instructions.
- If Blender is available, generate a Python script that Claude can execute.
- Export to `.glb`, or `.vrm` for humanoid avatars.
- Validate the exported file before integration.

### Mode C — Use an existing model

Use this mode when the user already has a `.glb`, `.gltf`, `.fbx`, `.obj` or `.vrm` file.

1. Copy the model into `assets/models/`.
2. Inspect its hierarchy, materials, textures, animations and morph targets.
3. Normalize scale, rotation and pivot if needed.
4. Create a loader and controls.
5. Document any missing animations or expressions.

## Runtime selection

Choose the runtime according to the project.

| Project type | Recommended runtime | Asset format |
|---|---|---|
| Web SPA or static site | Three.js | `.glb` |
| React web app | React Three Fiber + drei | `.glb` |
| Vue, Svelte or Angular web app | Three.js | `.glb` |
| Humanoid conversational avatar | Three.js + three-vrm | `.vrm` |
| Desktop app with web UI | Three.js or Babylon.js | `.glb` |
| Flutter | model_viewer_plus or flutter_gl | `.glb` |
| Unity | Unity GLTF import | `.glb` or `.fbx` |
| Unreal Engine | glTF or FBX import | `.glb` or `.fbx` |
| Godot | glTF import | `.glb` |

If the project already has a 3D runtime, use it. Do not introduce a second runtime unless there is a strong technical reason.

## Code requirements

The generated code must provide:

- A single entry-point component or module.
- A loader for the 3D asset.
- Scene setup only if the host project does not already provide one.
- Camera framing appropriate to the element.
- Lighting that does not conflict with the host scene.
- Optional transparent background.
- Resize handling.
- Cleanup function to dispose geometries, materials, textures and renderers.
- Error handling for missing assets.
- TypeScript types when the project uses TypeScript.
- No hardcoded absolute paths.
- Assets referenced through configurable paths.

The code must expose a simple API similar to this concept:

```ts
create3DElement({
  container: HTMLElement,
  modelUrl: string,
  config?: ElementConfig
})
```

For a character, also expose:

```ts
playAnimation(name: string)
setExpression(name: string)
speak(textOrAudio)
stopSpeaking()
show()
hide()
dispose()
```

Do not force this exact API if the project uses a framework with more idiomatic patterns.

## Animation rules

Create animations only if they are required.

For characters, include at minimum:

- `idle`
- `talk`
- `wave`
- `point`
- `think`
- `listen`
- `surprised`
- `nod`

For objects, include only relevant animations, such as:

- `rotate`
- `float`
- `open`
- `close`
- `press`
- `highlight`

Store animations in:

```text
assets/animations/
```

or embed them in the `.glb` when appropriate.

## Facial animation rules

For a talking character, implement:

- Mouth movement through visemes or morph targets.
- Blinking.
- Expression changes.
- Head movement while speaking.
- Return to idle after speaking.

Minimum visemes:

- `viseme_aa`
- `viseme_E`
- `viseme_I`
- `viseme_O`
- `viseme_U`
- `viseme_PP`
- `viseme_SS`

If the model does not include visemes, clearly report this limitation and offer alternatives:

- Use a base avatar with visemes.
- Add blend shapes in Blender.
- Use a simple procedural mouth animation.
- Use pre-rendered sprite frames.

## Integration rules

Create:

```text
3d/<element-name>/INTEGRATION.md
```

The document must contain:

1. Required dependencies.
2. Exact installation commands.
3. Where to place the component.
4. How to import it.
5. How to render it.
6. How to pass configuration.
7. How to trigger animations.
8. How to trigger expressions.
9. How to trigger speech or audio, if applicable.
10. How to remove the element cleanly.
11. Common errors and fixes.
12. Performance recommendations.

Claude may modify host application files only to add the integration point. Before modifying an existing file:

- Show the exact file path.
- Explain the change.
- Show the diff or proposed code.
- Ask for approval if the change affects existing behavior.

## Configuration file

Create:

```text
3d/<element-name>/config/element.config.json
```

Example:

```json
{
  "name": "english-teacher-avatar",
  "type": "character",
  "model": "../assets/models/english-teacher-avatar.glb",
  "scale": 1,
  "position": [0, 0, 0],
  "rotation": [0, 0, 0],
  "camera": {
    "position": [0, 1.4, 1.8],
    "target": [0, 1.3, 0]
  },
  "animations": {
    "idle": "idle",
    "talk": "talk",
    "wave": "wave",
    "point": "point",
    "think": "think",
    "listen": "listen"
  },
  "expressions": {
    "neutral": "neutral",
    "happy": "happy",
    "surprised": "surprised",
    "thinking": "relaxed"
  },
  "rendering": {
    "transparentBackground": true,
    "antialias": true,
    "shadows": false
  }
}
```

## Validation checklist

Before declaring the task complete, verify:

- [ ] The 3D folder is isolated.
- [ ] All assets are inside the folder.
- [ ] No absolute local paths are used.
- [ ] The model loads without console errors.
- [ ] The element is visible at the expected scale.
- [ ] The camera framing is correct.
- [ ] Animations work.
- [ ] Expressions work, if applicable.
- [ ] Mouth movement works, if applicable.
- [ ] Cleanup prevents memory leaks.
- [ ] The integration guide is accurate.
- [ ] The element can be removed without breaking the app.
- [ ] The project still builds.
- [ ] Existing functionality is not broken.

## Final response format

When finished, respond with:

1. What was created.
2. Folder location.
3. Files generated.
4. Dependencies added or required.
5. How to integrate it.
6. How to test it.
7. Known limitations.
8. Next recommended improvements.

## Example user requests

- “Add a 3D mascot to my React app using this image.”
- “Create a low-poly 3D product viewer for my existing Vue project.”
- “Add a talking 3D teacher avatar to my web app using these reference images.”
- “Generate a 3D dashboard widget from scratch and integrate it into my Next.js project.”
- “Add a VRM avatar to my existing Three.js scene.”
- “Create a 3D object from this photo and add it to my Flutter app.”

## Safety and quality rules

- Never claim an image-to-3D result is production-ready without validation.
- Never add facial animation unless the model supports it or a clear fallback is implemented.
- Never install heavy dependencies for a simple use case.
- Never mix multiple 3D engines in the same page unless explicitly requested.
- Always prefer progressive enhancement: the host app must continue working if the 3D element fails to load.
