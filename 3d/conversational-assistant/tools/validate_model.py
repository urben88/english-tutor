"""Re-import the exported GLB in Blender and check it against the asset spec.

    blender -b --factory-startup --python tools/validate_model.py -- assets/models/conversational-assistant.glb

Exits with code 1 and lists the problems if anything required is missing.
"""

import sys

import bpy

REQUIRED_BONES = [
    "hips", "spine", "chest", "neck", "head", "eye_L", "eye_R",
    "shoulder_R", "upperarm_R", "forearm_R", "hand_R", "index_R", "fingers_R", "thumb_R",
    "shoulder_L", "upperarm_L", "forearm_L", "hand_L",
]
REQUIRED_MORPHS = [
    "viseme_aa", "viseme_E", "viseme_I", "viseme_O", "viseme_U", "viseme_PP", "viseme_SS",
    "blink_L", "blink_R", "eyeWide", "eyeSquint",
    "browUp_L", "browUp_R", "browDown_L", "browDown_R", "browInnerUp",
    "mouthSmile", "mouthHappy", "mouthSurprised", "mouthThinking",
]
MAX_TRIANGLES = 40000


def main():
    path = sys.argv[sys.argv.index("--") + 1]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)

    problems = []
    rigs = [o for o in bpy.data.objects if o.type == "ARMATURE"]
    bones = {b.name for r in rigs for b in r.data.bones}
    morphs, tris, meshes = set(), 0, 0
    for o in bpy.data.objects:
        if o.type != "MESH" or not o.vertex_groups:
            continue  # the importer adds an unskinned bone-shape mesh; skip it
        meshes += 1
        tris += sum(len(p.vertices) - 2 for p in o.data.polygons)
        if o.data.shape_keys:
            for k in o.data.shape_keys.key_blocks[1:]:
                morphs.add(k.name)
                if abs(k.value) > 1e-6:
                    problems.append(f"{o.name}:{k.name} default weight {k.value} (must be 0)")
    problems += [f"missing bone {b}" for b in REQUIRED_BONES if b not in bones]
    problems += [f"missing morph {m}" for m in REQUIRED_MORPHS if m not in morphs]
    if len(rigs) != 1:
        problems.append(f"expected 1 armature, found {len(rigs)}")
    if tris > MAX_TRIANGLES:
        problems.append(f"{tris} triangles exceeds budget {MAX_TRIANGLES}")

    print(f"VALIDATE meshes={meshes} triangles={tris} bones={len(bones)} morphs={len(morphs)}")
    print("VALIDATE morphs:", ", ".join(sorted(morphs)))
    for p in problems:
        print("VALIDATE PROBLEM:", p)
    print("VALIDATE", "FAIL" if problems else "PASS")
    sys.exit(1 if problems else 0)


main()
