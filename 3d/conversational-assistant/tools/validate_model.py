"""Re-import the exported GLB in Blender and check it against the asset spec.

    blender -b --factory-startup --python tools/validate_model.py -- assets/models/conversational-assistant.glb

Exits with code 1 and lists the problems if anything required is missing.
"""

import json
import os
import sys

import bpy

REQUIRED_BONES = [
    "hips", "spine", "chest", "neck", "head", "eye_L", "eye_R",
    "shoulder_R", "upperarm_R", "forearm_R", "hand_R", "index_R", "fingers_R", "thumb_R",
    "shoulder_L", "upperarm_L", "forearm_L", "hand_L", "index_L", "fingers_L", "thumb_L",
]
REQUIRED_MORPHS = [
    "viseme_aa", "viseme_E", "viseme_I", "viseme_O", "viseme_U", "viseme_PP", "viseme_SS",
    "blink_L", "blink_R", "eyeWide", "eyeSquint",
    "browUp_L", "browUp_R", "browDown_L", "browDown_R", "browInnerUp",
    "mouthSmile", "mouthHappy", "mouthSurprised", "mouthThinking",
]
MAX_TRIANGLES = 40000
MAX_BYTES = 2 * 1024 * 1024
STATES = ["idle", "listening", "thinking", "speaking"]


def check_config(path, bones, morphs, problems):
    """Every state needs a body gesture; every bone and morph the config names must exist in the model."""
    cfg_path = os.path.join(os.path.dirname(os.path.abspath(path)), "..", "..", "config", "element.config.json")
    if not os.path.exists(cfg_path):
        problems.append("config/element.config.json not found next to the model")
        return
    cfg = json.load(open(cfg_path, encoding="utf-8"))
    gestures, exprs = cfg["gestures"], cfg["expressions"]

    def pose_bones(d):
        return list(d.get("pose", {})) + [o["bone"] for o in d.get("oscillate", [])]

    for name, g in gestures.items():
        if g.get("like") and g["like"] not in gestures:
            problems.append(f"gesture {name}: unknown base {g['like']}")
        base = gestures.get(g.get("like"), {})
        has_motion = pose_bones(g) or pose_bones(base)
        if not has_motion:
            problems.append(f"gesture {name} moves no bone")
        for b in pose_bones(g):
            if b not in bones:
                problems.append(f"gesture {name}: unknown bone {b}")
    for state in STATES:
        expr = exprs.get(cfg["states"][state]["expression"], {})
        arms = [b for b in pose_bones(expr) if b.split("_")[0] in ("upperarm", "forearm", "hand")]
        if not arms:
            problems.append(f"state {state}: expression has no arm pose")
        if not (expr.get("oscillate") or expr.get("gestures") or cfg["states"][state].get("gesture")):
            problems.append(f"state {state}: no continuous motion or gestures")
        for b in pose_bones(expr):
            if b not in bones:
                problems.append(f"state {state}: unknown bone {b}")
        for g in expr.get("gestures", []):
            if g not in gestures:
                problems.append(f"state {state}: unknown gesture {g}")
    for name, e in exprs.items():
        for m in e.get("morphs", {}):
            if m not in morphs:
                problems.append(f"expression {name}: unknown morph {m}")


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
    check_config(path, bones, morphs, problems)
    size = os.path.getsize(path)
    if size > MAX_BYTES:
        problems.append(f"{size} bytes exceeds budget {MAX_BYTES}")
    if len(bpy.data.images) < 4:
        problems.append("expected textured materials (found fewer than 4 images)")
    if tris > MAX_TRIANGLES:
        problems.append(f"{tris} triangles exceeds budget {MAX_TRIANGLES}")

    print(f"VALIDATE meshes={meshes} triangles={tris} bones={len(bones)} morphs={len(morphs)} images={len(bpy.data.images)} bytes={size}")
    print("VALIDATE morphs:", ", ".join(sorted(morphs)))
    for p in problems:
        print("VALIDATE PROBLEM:", p)
    print("VALIDATE", "FAIL" if problems else "PASS")
    sys.exit(1 if problems else 0)


main()
