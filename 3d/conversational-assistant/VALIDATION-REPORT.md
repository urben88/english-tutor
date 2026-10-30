# Validation report

Date: 2026-10-30. Environment: Windows 11, Blender 5.2.2 LTS (headless), Chromium via Playwright, three.js 0.170.0 from a pinned CDN (demo only).

## Model (Blender re-import of the GLB)

`blender -b --factory-startup --python tools/validate_model.py -- assets/models/conversational-assistant.glb`

```
VALIDATE meshes=8 triangles=27216 bones=21 morphs=20 images=7 bytes=1347684
VALIDATE PASS
```

The validator also checks both arms and fingers, that every state's expression has an arm pose plus motion or gestures, that every bone, morph and gesture named in the config exists, at least 4 textures and a size of at most 2 MB.

## Polish pass (2026-10-30)

| Change | Evidence |
|---|---|
| Both arms animated (they already existed in the rig); camera reframed to head-waist | Chromium screenshots (scratch) |
| Body pose per expression, random speaking gestures, left-arm mirrors | `config/element.config.json`, `src/controls.ts` |
| Mouth: visemes about 1.7x taller (`viseme_aa` lower lip 15.5 to 27 mm), lip-sync gain 1.15 to 1.7, audio gain 4.5 to 6.5, procedural floor 0.35 to 0.55; closes fully at silence | captured open while speaking, closed after `setState("idle")` |
| Seven procedural JPEG textures, box/front UVs | GLB 0.90 MB to 1.35 MB |
| `tsc --noEmit` (frontend, includes the 3D code) | 0 errors |
| frontend `npm test` / `npm run build` | 72/72 passed / built (existing chunk-size warning) |

All required bones and morphs are present. Every morph's default weight is 0. Without that check, a Blender quirk exported keys at weight 1 and opened every mouth shape at once; it was caught and fixed.

## Runtime (standalone demo in Chromium)

| Check | Result |
|---|---|
| Model loads, no console errors or warnings | ✅ (only the favicon 404 before it was silenced) |
| Visible at expected scale, bust framing | ✅ `validation/screenshots/idle.png` |
| Expressions: happy, surprised, thinking, speaking | ✅ screenshots |
| Mouth moves while speaking (procedural) | ✅ `talk.png` |
| `setState("speaking")` alone moves the mouth; `setState("idle")` closes it | ✅ `state-speaking.png`, `state-idle-after.png` |
| `speak({ audio })` ends when the audio ends | ✅ 1.5 s clip → resolved at 1570 ms |
| `speak({ text })` duration estimate | ✅ 5 words → 1952 ms |
| `stopSpeaking()` resolves the pending `speak()` | ✅ 300 ms |
| Gestures wave, point, explain, listen, idea | ✅ screenshots |
| Gesture returns to idle before resolving | ✅ wave: 0.43 s in + 1.6 s hold + 0.43 s out = 2459 ms |
| Unknown gesture | ✅ resolves immediately, no error |
| `dispose()` removes the canvas | ✅ 1 → 0 canvases |
| Missing model: `ready` rejects, `onError` fires, no canvas, API calls are no-ops | ✅ |
| Host frontend still builds and its tests pass | ✅ `npm run build` OK; `npm test` 35/35 passed |

## Checklist

- [x] The folder is isolated: everything lives in `3d/conversational-assistant/`.
- [x] No absolute paths. The model URL comes from config, resolved against the page.
- [x] The model loads without console errors.
- [x] Scale and camera framing are correct.
- [x] Gestures, expressions and mouth movement work and ease back to idle.
- [x] Cleanup disposes geometry, materials, renderer and canvas, and detaches the analyser.
- [x] The element is removable; the app does not reference it yet.
- [x] The project still builds and existing tests pass.
- [x] Integrated in the app (`three@0.170.0`, `@types/three@0.170.0`): `tsc --noEmit` 0 errors (3D code included, real three types), `vite build` OK, tests 68/68 on a snapshot with and without the 3D wiring, visible in the running app (`in-app.png`), no console warnings.

## Not verified (be aware)

- **Audio lip-sync quality** was only checked indirectly: the clip played and `speak` resolved on `ended`. The mouth was not captured mid-clip.
- Blinking and idle motion were watched live, not asserted automatically.
- Lip-sync with a real tutor reply (backend TTS) was not exercised in the app; only the demo clip was.
- Bundle: the main chunk is now over Vite's 500 kB warning because of three; consider lazy-loading the assistant.
- Tested in Chromium only. Not tested in Firefox or Safari, nor on mobile hardware.

## Known limitations

- **Likeness is stylized.** The model is built from primitives, so it is recognizable by hair, glasses, eyes and shirt, but it is not a portrait. For closer resemblance, use VRoid Studio (see `INTEGRATION.md`).
- **Fingers are single segments.** Point and idea read correctly from the front, but up close the curled fingers look like an "L", not a fist.
- **`listen` raises the hand beside the head, not behind the ear.** The rigid arm cannot reach the ear without passing through the head, so the head tilt carries most of the meaning.
- **Hand-to-chin is approximate.** The thinking pose was tuned by eye in one framing. Speaking gestures are random, not tied to the words. Wide gestures can reach the edge of a narrow tile.
- **Visemes are inferred from loudness and brightness, not phonemes.** The TTS gives no timings.
- **No `.vrm` export.** The reasons are in `CHARACTER-OR-ASSET-SPEC.md`.
