"""Build the conversational assistant bust procedurally in Blender and export it as GLB.

Run headless from the element folder:

    blender -b --factory-startup --python tools/build_model.py -- \
        --out assets/models/conversational-assistant.glb \
        [--blend assets/models/conversational-assistant.blend] [--preview preview.png]

Conventions (Blender space): metres, Z up, the character faces -Y, its right side is -X.
The glTF exporter converts to Y up, facing +Z.

Everything that moves is either a bone (rigid skinning) or a shape key (morph target).
Morph meshes carry no modifiers other than the armature, so the exporter keeps their keys.
"""

import argparse
import math
import sys

import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree


# ---------------------------------------------------------------------------
# Colours and materials
# ---------------------------------------------------------------------------

def srgb(hex_color):
    """Hex sRGB to linear RGBA, which is what Principled BSDF expects."""
    hex_color = hex_color.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(hex_color[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


PALETTE = {
    "skin": ("#F2C3A2", 0.65),
    "hair": ("#5B3A21", 0.8),
    "hair_light": ("#70482A", 0.8),
    "eye_white": ("#F7F5F2", 0.35),
    "iris": ("#4C7DBF", 0.3),
    "pupil": ("#121212", 0.3),
    "highlight": ("#FFFFFF", 0.2),
    "glasses": ("#1B1B1D", 0.35),
    "brows": ("#3F2716", 0.9),
    "mouth": ("#6A2626", 0.7),
    "teeth": ("#F5F2EC", 0.4),
    "shirt": ("#9EBEE9", 0.85),
    "shirt_dark": ("#86A9DA", 0.85),
    "collar": ("#AECBF0", 0.85),
    "button": ("#EEF3F9", 0.4),
}


# Procedural textures. Pixels are written in sRGB space (what a JPEG holds) and the materials
# reference them through a plain Image Texture, which the glTF exporter keeps as-is.
TEX_SIZE = {"skin": 256, "face": 512, "shirt": 512, "shirt_dark": 256, "collar": 256, "hair": 256, "hair_light": 256}


def hex_rgb(hex_color):
    h = hex_color.lstrip("#")
    return np.array([int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)])


def tileable_noise(n, seed, beta=1.6, stretch=(1.0, 1.0)):
    """Seamless noise with unit deviation. `beta` sets the roughness, `stretch` elongates it per axis."""
    rng = np.random.default_rng(seed)
    f = np.fft.fft2(rng.standard_normal((n, n)))
    fy = np.fft.fftfreq(n)[:, None] * stretch[0]
    fx = np.fft.fftfreq(n)[None, :] * stretch[1]
    r = np.sqrt(fx ** 2 + fy ** 2)
    r[0, 0] = 1.0
    f = f / r ** (beta / 2)
    f[0, 0] = 0.0
    out = np.real(np.fft.ifft2(f))
    return out / out.std()


def make_image(name, rgb):
    n = rgb.shape[0]
    rgba = np.ones((n, n, 4))
    rgba[..., :3] = np.clip(rgb, 0, 1)
    img = bpy.data.images.new(name, n, n, alpha=False)
    img.pixels.foreach_set(rgba.astype(np.float32).ravel())
    img.pack()
    return img


def tex_skin(n):
    base = hex_rgb(PALETTE["skin"][0])
    pores = tileable_noise(n, 1, 1.0)
    mottle = tileable_noise(n, 2, 2.4)
    k = 1 + 0.012 * pores + 0.018 * mottle
    return base * k[..., None] + np.array([0.012, 0.0, -0.006]) * mottle[..., None]


def tex_face(n):
    """Front-projected face map: u = x / 0.24 + 0.5, v = (z - 1.62) / 0.24 + 0.5."""
    out = tex_skin(n)
    v, u = np.mgrid[0:n, 0:n] / n
    x = (u - 0.5) * 0.24
    z = (v - 0.5) * 0.24 + 1.62

    def blob(cx, cz, rx, rz):
        return np.exp(-(((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2))

    def tint(out, amount, color):
        a = (amount * np.clip(color[0], 0, 1))[..., None]
        return out * (1 - a) + hex_rgb(color[1]) * a

    out = tint(out, 0.42, (blob(0.052, 1.582, 0.026, 0.019) + blob(-0.052, 1.582, 0.026, 0.019), "#E98B88"))
    out = tint(out, 0.18, (blob(0.0, 1.575, 0.012, 0.012), "#F29C94"))
    out = tint(out, 0.22, (blob(0.093, 1.612, 0.016, 0.03) + blob(-0.093, 1.612, 0.016, 0.03), "#E7A08F"))
    return out


def tex_weave(n, color):
    """Oxford cloth: plain weave threads with slubs. One tile covers 0.08 m."""
    base = hex_rgb(color)
    c = n // 32
    yy, xx = np.mgrid[0:n, 0:n]
    over = (((xx // c) % 2) ^ ((yy // c) % 2)).astype(float)  # which thread is on top in this cell
    warp = np.sin(np.pi * (xx % c) / c)
    weft = np.sin(np.pi * (yy % c) / c)
    thread = over * warp + (1 - over) * weft
    slub = 0.012 * tileable_noise(n, 5, 0.8, (1.0, 0.25)) + 0.012 * tileable_noise(n, 6, 0.8, (0.25, 1.0))
    k = (0.93 + 0.1 * thread + slub) * (1 + 0.02 * tileable_noise(n, 7, 2.2))
    return base * k[..., None]


def tex_hair(n, color, seed):
    """Vertical strands with light and dark streaks."""
    base = hex_rgb(color)
    fine = tileable_noise(n, seed, 0.6, (0.06, 1.0))
    broad = tileable_noise(n, seed + 1, 1.8, (0.2, 1.0))
    k = 1 + 0.16 * fine + 0.08 * broad
    return base * k[..., None] + np.array([0.03, 0.012, -0.01]) * np.clip(broad, 0, 3)[..., None] * 0.35


TEXTURE_BUILDERS = {
    "skin": tex_skin,
    "face": tex_face,
    "shirt": lambda n: tex_weave(n, PALETTE["shirt"][0]),
    "shirt_dark": lambda n: tex_weave(n, PALETTE["shirt_dark"][0]),
    "collar": lambda n: tex_weave(n, PALETTE["collar"][0]),
    "hair": lambda n: tex_hair(n, PALETTE["hair"][0], 11),
    "hair_light": lambda n: tex_hair(n, PALETTE["hair_light"][0], 21),
}

# Material -> UV mapping. ("box", size): project along the dominant face axis, `size` metres per tile.
# ("front", size, cx, cz): planar projection from the front (+x -> u, +z -> v) centred on (cx, cz).
UV_SPEC = {
    "skin": ("box", 0.10),
    "face": ("front", 0.24, 0.0, 1.62),
    "shirt": ("box", 0.08),
    "shirt_dark": ("box", 0.08),
    "collar": ("box", 0.08),
    "hair": ("box", 0.10),
    "hair_light": ("box", 0.10),
}


def make_materials():
    mats = {}
    palette = dict(PALETTE)
    palette["face"] = PALETTE["skin"]
    for name, (hex_color, roughness) in palette.items():
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        nt = m.node_tree
        bsdf = nt.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value = srgb(hex_color)
        bsdf.inputs["Roughness"].default_value = roughness
        m.diffuse_color = srgb(hex_color)  # used by the Workbench preview
        if name in TEXTURE_BUILDERS:
            tex = nt.nodes.new("ShaderNodeTexImage")
            tex.image = make_image(f"tex_{name}", TEXTURE_BUILDERS[name](TEX_SIZE[name]))
            tex.interpolation = "Linear"
            tex.extension = "REPEAT"
            nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        mats[name] = m
    return mats


def assign_uvs(mesh, mat_names):
    """Box / front UVs per material, so textured materials need no unwrapping."""
    layer = mesh.uv_layers.new(name="UVMap")
    for poly in mesh.polygons:
        spec = UV_SPEC.get(mat_names[poly.material_index])
        n = poly.normal
        for li in poly.loop_indices:
            p = mesh.vertices[mesh.loops[li].vertex_index].co
            if spec is None:
                uv = (0.0, 0.0)
            elif spec[0] == "front":
                uv = ((p.x - spec[2]) / spec[1] + 0.5, (p.z - spec[3]) / spec[1] + 0.5)
            else:
                ax = max(range(3), key=lambda a: abs(n[a]))
                a, b = [(1, 2), (0, 2), (0, 1)][ax]
                uv = (p[a] / spec[1], p[b] / spec[1])
            layer.data[li].uv = uv


# ---------------------------------------------------------------------------
# Geometry primitives (plain vertex/face lists, no operators)
# ---------------------------------------------------------------------------

def ellipsoid(center, radii, seg_u=24, seg_v=16, rot=None, theta_max=None):
    """UV ellipsoid. `theta_max(u)` optionally limits the polar angle per azimuth (open shell)."""
    cx, cy, cz = center
    rx, ry, rz = radii
    rot = rot or Matrix.Identity(3)
    verts, faces = [], []
    top = len(verts)
    verts.append(Vector(center) + rot @ Vector((0, 0, rz)))
    closed = theta_max is None
    rings = seg_v - 1 if closed else seg_v
    for j in range(1, rings + 1):
        for i in range(seg_u):
            u = 2 * math.pi * i / seg_u
            tmax = math.pi if closed else theta_max(u)
            t = tmax * j / seg_v
            p = Vector((rx * math.sin(t) * math.cos(u), ry * math.sin(t) * math.sin(u), rz * math.cos(t)))
            verts.append(Vector((cx, cy, cz)) + rot @ p)
    ring = lambda j, i: 1 + (j - 1) * seg_u + (i % seg_u)
    for i in range(seg_u):
        faces.append((top, ring(1, i + 1), ring(1, i)))
    for j in range(1, rings):
        for i in range(seg_u):
            faces.append((ring(j, i), ring(j, i + 1), ring(j + 1, i + 1), ring(j + 1, i)))
    if closed:
        bottom = len(verts)
        verts.append(Vector(center) + rot @ Vector((0, 0, -rz)))
        for i in range(seg_u):
            faces.append((bottom, ring(rings, i), ring(rings, i + 1)))
    return verts, faces


def sphere_cap(center, radius, axis, max_angle, seg_u=20, seg_v=6):
    """Spherical cap around `axis` (unit vector) up to `max_angle` radians."""
    axis = Vector(axis).normalized()
    rot = axis.to_track_quat("Z", "Y").to_matrix()
    return ellipsoid(center, (radius, radius, radius), seg_u, seg_v, rot, theta_max=lambda u: max_angle)


def tube(points, radii, seg=10, closed=False, up=Vector((0, 0, 1)), caps=True):
    """Sweep a circle/ellipse along `points`. `radii[i]` is a float or (a, b) with `a` along `up`."""
    n = len(points)
    pts = [Vector(p) for p in points]
    verts, faces = [], []
    for k in range(n):
        if closed:
            t = (pts[(k + 1) % n] - pts[(k - 1) % n]).normalized()
        else:
            t = (pts[min(k + 1, n - 1)] - pts[max(k - 1, 0)]).normalized()
        side = t.cross(up)
        if side.length < 1e-6:
            side = t.cross(Vector((1, 0, 0)))
        side.normalize()
        nrm = side.cross(t).normalized()
        r = radii[k]
        a, b = (r, r) if isinstance(r, (int, float)) else r
        for i in range(seg):
            ang = 2 * math.pi * i / seg
            verts.append(pts[k] + nrm * (a * math.cos(ang)) + side * (b * math.sin(ang)))
    rings = n if closed else n - 1
    for k in range(rings):
        k2 = (k + 1) % n
        for i in range(seg):
            faces.append((k * seg + i, k * seg + (i + 1) % seg, k2 * seg + (i + 1) % seg, k2 * seg + i))
    if caps and not closed:
        for k, flip in ((0, True), (n - 1, False)):
            c = len(verts)
            verts.append(pts[k].copy())
            for i in range(seg):
                f = (c, k * seg + i, k * seg + (i + 1) % seg)
                faces.append(f[::-1] if flip else f)
    return verts, faces


def loft(rings_spec, seg=48, power=2.6):
    """Open loft of horizontal superellipse rings: [(z, rx, ry, y_offset), ...]."""
    verts, faces = [], []
    for z, rx, ry, yo in rings_spec:
        for i in range(seg):
            u = 2 * math.pi * i / seg
            c, s = math.cos(u), math.sin(u)
            x = rx * math.copysign(abs(c) ** (2 / power), c)
            y = ry * math.copysign(abs(s) ** (2 / power), s) + yo
            verts.append(Vector((x, y, z)))
    for k in range(len(rings_spec) - 1):
        for i in range(seg):
            a, b = k * seg + i, k * seg + (i + 1) % seg
            faces.append((a, b, b + seg, a + seg))
    return verts, faces


# ---------------------------------------------------------------------------
# Mesh builder with materials, vertex groups and shape keys
# ---------------------------------------------------------------------------

class Builder:
    def __init__(self, name):
        self.name = name
        self.verts, self.faces, self.face_mat, self.vgroup = [], [], [], []
        self.mat_names = []

    def add(self, geo, mat, group):
        verts, faces = geo
        if mat not in self.mat_names:
            self.mat_names.append(mat)
        off = len(self.verts)
        self.verts += [Vector(v) for v in verts]
        self.faces += [tuple(i + off for i in f) for f in faces]
        self.face_mat += [self.mat_names.index(mat)] * len(faces)
        self.vgroup += [group] * len(verts)
        return off

    def build(self, mats, smooth=True):
        mesh = bpy.data.meshes.new(self.name)
        mesh.from_pydata([tuple(v) for v in self.verts], [], self.faces)
        mesh.update(calc_edges=True)
        for m in self.mat_names:
            mesh.materials.append(mats[m])
        for poly, mi in zip(mesh.polygons, self.face_mat):
            poly.material_index = mi
            poly.use_smooth = smooth
        if any(m in UV_SPEC for m in self.mat_names):
            assign_uvs(mesh, self.mat_names)
        obj = bpy.data.objects.new(self.name, mesh)
        bpy.context.scene.collection.objects.link(obj)
        for g in sorted(set(self.vgroup)):
            vg = obj.vertex_groups.new(name=g)
            vg.add([i for i, name in enumerate(self.vgroup) if name == g], 1.0, "REPLACE")
        return obj


def add_shape_keys(obj, keys):
    """`keys` maps key name -> list of absolute vertex positions (same order as the mesh)."""
    if obj.data.shape_keys is None:
        obj.shape_key_add(name="Basis", from_mix=False)
    for name, positions in keys.items():
        sk = obj.shape_key_add(name=name, from_mix=False)
        sk.value = 0.0  # exported as the default morph weight
        for i, p in enumerate(positions):
            sk.data[i].co = p


# ---------------------------------------------------------------------------
# Character
# ---------------------------------------------------------------------------

HEAD_C = Vector((0.0, 0.0, 1.62))
HEAD_R = (0.095, 0.104, 0.117)
EYE_Z = 1.622
EYE_X = 0.038
EYE_R = 0.0195
MOUTH_Z = 1.548
BODY_LIFT = 0.04  # raises the torso so the neck stays short, as in the reference
SHOULDER = Vector((0.160, 0.0, 1.362 + BODY_LIFT))
ELBOW = Vector((0.180, 0.004, 1.105 + BODY_LIFT))
WRIST = Vector((0.184, -0.004, 0.872 + BODY_LIFT))


def head_geometry():
    verts, faces = ellipsoid(HEAD_C, HEAD_R, 48, 32)
    out = []
    for v in verts:
        p = v - HEAD_C
        nx, ny, nz = p.x / HEAD_R[0], p.y / HEAD_R[1], p.z / HEAD_R[2]
        if nz < 0:  # jaw and chin taper
            k = (-nz) ** 1.6
            p.x *= 1 - 0.24 * k
            if ny < 0:
                p.y *= 1 - 0.18 * k
        if ny < 0:  # flatter face plane
            p.y *= 0.93
        else:  # rounder back of the skull
            p.y *= 1.04
        if nz > 0.2:  # slightly wider cranium
            p.x *= 1 + 0.04 * nz
        out.append(HEAD_C + p)
    return out, faces


class Surface:
    """Ray-casts onto a mesh from the front (-Y) so features sit on it."""

    def __init__(self, verts, faces):
        self.tree = BVHTree.FromPolygons([tuple(v) for v in verts], faces)

    def front_y(self, x, z, fallback=-0.09):
        hit = self.tree.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)))
        return hit[0].y if hit[0] is not None else fallback

    def on(self, x, z, offset):
        return Vector((x, self.front_y(x, z) - offset, z))


def mouth_shape(face, width, h_up, h_low, smile=0.0, shift=0.0, seg=28):
    """Dark mouth interior plus an upper teeth strip, conformed to the face."""
    rim = []
    for i in range(seg):
        t = 2 * math.pi * i / seg
        c, s = math.cos(t), math.sin(t)
        x = width * c
        h = h_up if s > 0 else h_low
        lift = smile * (x / width) ** 2
        rim.append((x + shift, MOUTH_Z + h * s + lift))
    inner = [face.on(x, z, 0.0018) for x, z in rim]
    centre = face.on(shift, MOUTH_Z + (h_up - h_low) * 0.5 + smile * 0.3, 0.0018)
    # Teeth: strip just under the upper lip, height grows with the opening.
    teeth_h = min(0.0045, (h_up + h_low) * 0.32)
    upper = [rim[i] for i in range(seg // 2 + 1)]  # t from 0 to pi = upper half
    top = [face.on(x * 0.86 + shift * 0.14, z - 0.0004, 0.0026) for x, z in upper]
    bottom = [face.on(x * 0.86 + shift * 0.14, z - 0.0004 - teeth_h * (1 - (abs(x - shift) / width) ** 2), 0.0026)
              for x, z in upper]
    return inner, centre, top, bottom


def build_mouth(face, mats):
    params = {
        "basis": dict(width=0.021, h_up=0.0007, h_low=0.0007, smile=0.0018),
        "viseme_aa": dict(width=0.025, h_up=0.0080, h_low=0.0270, smile=0.0015),
        "viseme_E": dict(width=0.029, h_up=0.0058, h_low=0.0135, smile=0.0030),
        "viseme_I": dict(width=0.029, h_up=0.0042, h_low=0.0085, smile=0.0040),
        "viseme_O": dict(width=0.0155, h_up=0.0095, h_low=0.0185, smile=0.0),
        "viseme_U": dict(width=0.0110, h_up=0.0055, h_low=0.0095, smile=0.0),
        "viseme_PP": dict(width=0.0195, h_up=0.0002, h_low=0.0002, smile=0.0005),
        "viseme_SS": dict(width=0.026, h_up=0.0030, h_low=0.0045, smile=0.0025),
        "mouthSmile": dict(width=0.027, h_up=0.0008, h_low=0.0010, smile=0.0075),
        "mouthHappy": dict(width=0.029, h_up=0.0035, h_low=0.0120, smile=0.0085),
        "mouthSurprised": dict(width=0.0125, h_up=0.0085, h_low=0.0170, smile=0.0),
        "mouthThinking": dict(width=0.017, h_up=0.0006, h_low=0.0006, smile=-0.0025, shift=0.004),
    }

    def assemble(p):
        inner, centre, top, bottom = mouth_shape(face, **p)
        verts = inner + [centre] + top + bottom
        return verts

    seg = 28
    n_upper = seg // 2 + 1
    fan = [(seg, (i + 1) % seg, i) for i in range(seg)]
    strip = []
    t0, b0 = seg + 1, seg + 1 + n_upper
    for i in range(n_upper - 1):
        strip.append((t0 + i, b0 + i, b0 + i + 1, t0 + i + 1))
    b = Builder("Mouth")
    base = assemble(params["basis"])
    b.add((base[:seg + 1], fan), "mouth", "head")
    b.add((base[seg + 1:], [tuple(i - (seg + 1) for i in f) for f in strip]), "teeth", "head")
    obj = b.build(mats, smooth=False)
    add_shape_keys(obj, {k: assemble(p) for k, p in params.items() if k != "basis"})
    return obj


def build_eyelids(mats):
    b = Builder("Eyelids")
    shapes = {"basis": {}, "blink_L": {}, "blink_R": {}, "eyeWide": {}, "eyeSquint": {}}
    angles = {"open": -38, "blink": 64, "wide": -52, "squint": 6}
    per_side = {}
    for side, sx in (("L", 1), ("R", -1)):
        c = Vector((sx * EYE_X, eye_center_y(sx), EYE_Z))
        verts, faces = sphere_cap(c, EYE_R * 1.1, (0, 0, 1), math.radians(96), 22, 8)
        local = [v - c for v in verts]

        def rotated(deg, local=local, c=c):
            m = Matrix.Rotation(math.radians(deg), 3, "X")
            return [c + m @ v for v in local]

        start = b.add((rotated(angles["open"]), faces), "skin", "head")
        per_side[side] = (start, rotated)
    obj = b.build(mats)
    count = len(obj.data.vertices)

    def key(overrides):
        pos = [v.co.copy() for v in obj.data.vertices]
        for side, deg in overrides.items():
            start, rotated = per_side[side]
            for i, p in enumerate(rotated(deg)):
                pos[start + i] = p
        assert len(pos) == count
        return pos

    add_shape_keys(obj, {
        "blink_L": key({"L": angles["blink"]}),
        "blink_R": key({"R": angles["blink"]}),
        "eyeWide": key({"L": angles["wide"], "R": angles["wide"]}),
        "eyeSquint": key({"L": angles["squint"], "R": angles["squint"]}),
    })
    return obj


_EYE_Y = {}


def eye_center_y(sx):
    return _EYE_Y[sx]


def build_eyes(face, mats):
    b = Builder("Eyes")
    fwd = Vector((0, -1, 0))
    for sx, group in ((1, "eye_L"), (-1, "eye_R")):
        surf = face.front_y(sx * EYE_X, EYE_Z)
        cy = surf + EYE_R * 0.55
        _EYE_Y[sx] = cy
        c = Vector((sx * EYE_X, cy, EYE_Z))
        b.add(ellipsoid(c, (EYE_R,) * 3, 24, 16), "eye_white", group)
        b.add(sphere_cap(c, EYE_R * 1.006, fwd, math.radians(36), 24, 6), "iris", group)
        b.add(sphere_cap(c, EYE_R * 1.012, fwd, math.radians(17), 18, 4), "pupil", group)
        hl_dir = Vector((0.35 * sx * -1 + 0.2, -1, 0.45)).normalized()
        b.add(ellipsoid(c + hl_dir * EYE_R * 1.02, (0.0028, 0.0012, 0.0028), 10, 6), "highlight", group)
    return b.build(mats)


def build_brows(face, mats):
    def brow_points(sx, lift_inner=0.0, lift_outer=0.0):
        pts = []
        for i in range(9):
            t = i / 8
            x = sx * (0.016 + 0.054 * t)
            z = 1.664 + 0.009 * math.sin(math.pi * (0.25 + 0.75 * t)) - 0.004 * t
            z += lift_inner * (1 - t) + lift_outer * t
            pts.append(face.on(x, z, 0.0022))
        return pts

    def radii():
        return [(0.0046 - 0.0022 * (i / 8), 0.0022) for i in range(9)]

    def geo(sx, li=0.0, lo=0.0):
        return tube(brow_points(sx, li, lo), radii(), seg=8, up=Vector((0, 0, 1)))

    b = Builder("Brows")
    b.add(geo(1), "brows", "head")
    b.add(geo(-1), "brows", "head")
    obj = b.build(mats)

    def key(l=(0, 0), r=(0, 0)):
        return geo(1, *l)[0] + geo(-1, *r)[0]

    add_shape_keys(obj, {
        "browUp_L": key(l=(0.0065, 0.0055)),
        "browUp_R": key(r=(0.0065, 0.0055)),
        "browDown_L": key(l=(-0.0045, -0.0005)),
        "browDown_R": key(r=(-0.0045, -0.0005)),
        "browInnerUp": key(l=(0.0055, -0.0005), r=(0.0055, -0.0005)),
    })
    return obj


def build_glasses(face, mats):
    b = Builder("Glasses")
    hw, hh, cr, tr = 0.031, 0.0215, 0.009, 0.0027
    for sx in (1, -1):
        cx = sx * 0.041
        eye_front = _EYE_Y[sx] - EYE_R
        y0 = eye_front - 0.011
        pts = []
        steps = 6
        corners = [(hw - cr, hh - cr, 0), (-(hw - cr), hh - cr, 90), (-(hw - cr), -(hh - cr), 180), (hw - cr, -(hh - cr), 270)]
        for ox, oz, a0 in corners:
            for s in range(steps + 1):
                a = math.radians(a0 + 90 * s / steps)
                lx = ox + cr * math.cos(a)
                lz = oz + cr * math.sin(a)
                wrap = 0.10 * (lx * sx) / hw  # frames follow the face curve
                pts.append(Vector((cx + lx, y0 + abs(lx) * 0.0 + wrap * 0.03 + (0.004 if lx * sx > 0 else 0) * (lx * sx / hw), EYE_Z + 0.001 + lz)))
        b.add(tube(pts, [tr] * len(pts), seg=8, closed=True, up=Vector((0, -1, 0))), "glasses", "head")
        # Temple arm from the outer top corner back to the ear.
        outer = Vector((sx * (0.041 + hw), y0 + 0.004, EYE_Z + hh * 0.55))
        arm = [outer, outer + Vector((sx * 0.024, 0.02, 0.0)), Vector((sx * 0.099, 0.03, EYE_Z + 0.004)),
               Vector((sx * 0.101, 0.065, EYE_Z - 0.012))]
        b.add(tube(arm, [0.0022] * len(arm), seg=6), "glasses", "head")
    yb = min(_EYE_Y.values()) - EYE_R - 0.012
    bridge = [Vector((0.041 - hw, yb, EYE_Z + 0.007)), Vector((0.0, yb - 0.003, EYE_Z + 0.011)),
              Vector((-0.041 + hw, yb, EYE_Z + 0.007))]
    b.add(tube(bridge, [0.0024] * 3, seg=8), "glasses", "head")
    return b.build(mats)


def build_head(mats):
    verts, faces = head_geometry()
    face = Surface(verts, faces)
    b = Builder("Head")
    b.add((verts, faces), "face", "head")
    # Nose
    nz = 1.588
    b.add(ellipsoid(face.on(0, nz, -0.004) + Vector((0, 0, 0)), (0.0105, 0.012, 0.016), 16, 12), "face", "head")
    # Ears
    for sx in (1, -1):
        rot = Matrix.Rotation(math.radians(-12 * sx), 3, "Z")
        b.add(ellipsoid(Vector((sx * 0.091, 0.012, 1.612)), (0.011, 0.020, 0.029), 16, 12, rot), "face", "head")
    return b.build(mats), face


def hairline(u):
    """Polar limit (radians) of the hair shell for azimuth u (0 = +X, -pi/2 = front)."""
    front = max(0.0, -math.sin(u))  # 1 at the face
    back = max(0.0, math.sin(u))
    return math.radians(58 - 6 * front ** 2 + 52 * back ** 1.5 + 22 * (1 - front - back))


def build_hair(face, mats):
    b = Builder("Hair")
    c = HEAD_C + Vector((0, 0.006, 0.006))
    r = (HEAD_R[0] * 1.10, HEAD_R[1] * 1.08, HEAD_R[2] * 1.07)
    b.add(ellipsoid(c, r, 40, 14, theta_max=hairline), "hair", "head")

    def on_shell(u_deg, t_deg, lift):
        u, t = math.radians(u_deg), math.radians(t_deg)
        d = Vector((r[0] * math.sin(t) * math.cos(u), r[1] * math.sin(t) * math.sin(u), r[2] * math.cos(t)))
        return c + d * (1 + lift), d.normalized()

    # Volume clumps over the skull, slightly irregular for a wavy silhouette.
    for ring, (t_deg, count, size) in enumerate(((12, 5, 0.045), (34, 10, 0.040), (56, 14, 0.034), (78, 12, 0.028))):
        for i in range(count):
            u_deg = 360 * i / count + ring * 17
            u = math.radians(u_deg)
            if -math.sin(u) > 0.55 and t_deg > 50:
                continue  # keep the forehead clear, the fringe covers it
            if t_deg > 70 and -math.sin(u) > 0.2:
                continue
            p, n = on_shell(u_deg, t_deg, 0.05 + 0.03 * ((i * 7 + ring) % 3) / 2)
            rot = n.to_track_quat("Z", "Y").to_matrix()
            mat = "hair_light" if (i + ring) % 3 == 0 else "hair"
            b.add(ellipsoid(p, (size, size * 0.85, size * 0.55), 14, 10, rot), mat, "head")
    # Fringe: locks swept from the parting towards the character's left (+X) with a curl.
    locks = [(-0.058, 1.712, 0.028, 20), (-0.030, 1.716, 0.032, 12), (0.000, 1.712, 0.034, 4),
             (0.030, 1.704, 0.032, -8), (0.056, 1.692, 0.027, -22), (0.074, 1.678, 0.020, -40),
             (-0.076, 1.700, 0.020, 50), (-0.012, 1.744, 0.030, 8), (0.040, 1.736, 0.028, -4)]
    for x, z, size, roll in locks:
        hit = face.tree.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)))
        loc, nrm = (hit[0], hit[1]) if hit[0] is not None else (Vector((x, -0.06, z)), Vector((0, -1, 0)))
        rot = nrm.to_track_quat("Z", "Y").to_matrix() @ Matrix.Rotation(math.radians(roll), 3, "Z")
        mat = "hair_light" if roll % 3 == 0 else "hair"
        b.add(ellipsoid(loc + nrm * (0.010 + size * 0.35), (size * 1.35, size * 0.8, size * 0.5), 16, 10, rot), mat, "head")
    # Sideburns
    for sx in (1, -1):
        b.add(ellipsoid(Vector((sx * 0.090, -0.012, 1.625)), (0.010, 0.016, 0.026), 10, 8), "hair", "head")
    return b.build(mats)


def build_body(mats):
    b = Builder("Body")
    L = BODY_LIFT
    neck = [Vector((0, 0.008, 1.43)), Vector((0, 0.006, 1.47)), Vector((0, 0.004, 1.55))]
    b.add(tube(neck, [(0.040, 0.043)] * 3, seg=20, caps=False), "skin", "neck")
    rings = [(z + L, rx, ry, yo) for z, rx, ry, yo in (
        (1.00, 0.158, 0.100, 0.0), (1.18, 0.162, 0.104, 0.0), (1.30, 0.174, 0.106, 0.0),
        (1.36, 0.176, 0.098, 0.004), (1.405, 0.156, 0.084, 0.006), (1.430, 0.108, 0.066, 0.008),
        (1.444, 0.058, 0.052, 0.008))]
    tv, tf = loft(rings, 48)
    b.add((tv, tf), "shirt", "chest")
    torso = Surface(tv, tf)
    # Collar band and points.
    band = []
    for i in range(24):
        a = 2 * math.pi * i / 24
        band.append(Vector((0.052 * math.cos(a), 0.008 + 0.048 * math.sin(a), 1.452 + L + 0.006 * math.sin(a))))
    b.add(tube(band, [(0.010, 0.0035)] * 24, seg=8, closed=True, up=Vector((0, 0, 1))), "collar", "chest")
    for sx in (1, -1):
        tri = [(sx * 0.006, 1.448 + L), (sx * 0.056, 1.440 + L), (sx * 0.026, 1.385 + L)]
        p = [torso.on(x, z, 0.003) for x, z in tri]
        p2 = [torso.on(x, z, 0.0055) for x, z in tri]
        faces = [(0, 1, 2), (5, 4, 3), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)]
        if sx < 0:
            faces = [f[::-1] for f in faces]
        b.add((p + p2, faces), "collar", "chest")
    # Button placket and buttons.
    plack = [torso.on(0.0, z + L, 0.0015) for z in (1.40, 1.30, 1.20, 1.10, 1.00)]
    b.add(tube(plack, [(0.0012, 0.009)] * len(plack), seg=6, up=Vector((0, -1, 0))), "shirt_dark", "chest")
    for z in (1.365, 1.275, 1.185, 1.095):
        b.add(ellipsoid(torso.on(0.0, z + L, 0.003), (0.0055, 0.0022, 0.0055), 12, 8), "button", "chest")
    # Arms (rigid parts; balls at the joints hide the seams when posed).
    for sx, side in ((1, "L"), (-1, "R")):
        s = Vector((sx * SHOULDER.x, SHOULDER.y, SHOULDER.z))
        e = Vector((sx * ELBOW.x, ELBOW.y, ELBOW.z))
        w = Vector((sx * WRIST.x, WRIST.y, WRIST.z))
        b.add(ellipsoid(s, (0.045, 0.045, 0.045), 20, 14), "shirt", f"upperarm_{side}")
        b.add(tube([s, s.lerp(e, 0.5), e], [0.046, 0.042, 0.038], seg=16, caps=False), "shirt", f"upperarm_{side}")
        b.add(ellipsoid(e, (0.038,) * 3, 16, 12), "shirt", f"forearm_{side}")
        b.add(tube([e, e.lerp(w, 0.5), w], [0.037, 0.035, 0.032], seg=16, caps=False), "shirt", f"forearm_{side}")
        b.add(tube([w + Vector((0, 0, 0.012)), w - Vector((0, 0, 0.004))], [0.034, 0.034], seg=16), "shirt_dark",
              f"forearm_{side}")
        build_hand(b, w, sx, side)
    return b.build(mats)


def build_hand(b, w, sx, side):
    """Hand hanging down, palm facing the body, thumb forward (-Y)."""
    palm_c = w + Vector((0, 0, -0.046))
    b.add(ellipsoid(w + Vector((0, 0, -0.008)), (0.017, 0.026, 0.016), 12, 8), "skin", f"hand_{side}")
    b.add(ellipsoid(palm_c, (0.015, 0.036, 0.045), 16, 12), "skin", f"hand_{side}")
    knuckle_z = w.z - 0.086
    finger_y = [-0.026, -0.009, 0.008, 0.024]  # index (front) ... pinky (back)
    lengths = [0.066, 0.072, 0.067, 0.054]
    for i, (fy, ln) in enumerate(zip(finger_y, lengths)):
        base = Vector((w.x, w.y + fy, knuckle_z + 0.008))
        tip = base + Vector((0, fy * 0.08, -ln))
        group = f"index_{side}" if i == 0 else f"fingers_{side}"
        b.add(tube([base, base.lerp(tip, 0.5), tip], [0.0092, 0.0088, 0.0082], seg=10), "skin", group)
        b.add(ellipsoid(tip, (0.0082,) * 3, 10, 8), "skin", group)
    t0 = Vector((w.x - sx * 0.004, w.y - 0.030, w.z - 0.030))
    t1 = t0 + Vector((-sx * 0.004, -0.024, -0.040))
    b.add(tube([t0, t0.lerp(t1, 0.5), t1], [0.0115, 0.0105, 0.0095], seg=10), "skin", f"thumb_{side}")
    b.add(ellipsoid(t1, (0.0095,) * 3, 10, 8), "skin", f"thumb_{side}")


def thumb_base(sx):
    w = Vector((sx * WRIST.x, WRIST.y, WRIST.z))
    return Vector((w.x - sx * 0.004, w.y - 0.030, w.z - 0.030))


def build_armature():
    arm_data = bpy.data.armatures.new("AssistantRig")
    rig = bpy.data.objects.new("AssistantRig", arm_data)
    bpy.context.scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm_data.edit_bones

    def bone(name, head, tail, parent=None, roll=0.0):
        bn = eb.new(name)
        bn.head, bn.tail, bn.roll = Vector(head), Vector(tail), roll
        if parent:
            bn.parent = eb[parent]
        return bn

    bone("hips", (0, 0, 0.95), (0, 0, 1.05))
    bone("spine", (0, 0, 1.05), (0, 0, 1.25), "hips")
    bone("chest", (0, 0, 1.25), (0, 0, 1.44), "spine")
    bone("neck", (0, 0.006, 1.44), (0, 0.004, 1.53), "chest")
    bone("head", (0, 0.004, 1.53), (0, 0.004, 1.76), "neck")
    for sx, side in ((1, "L"), (-1, "R")):
        c = Vector((sx * EYE_X, _EYE_Y[sx], EYE_Z))
        bone(f"eye_{side}", c, c + Vector((0, -0.03, 0)), "head")
        s = Vector((sx * SHOULDER.x, SHOULDER.y, SHOULDER.z))
        e = Vector((sx * ELBOW.x, ELBOW.y, ELBOW.z))
        w = Vector((sx * WRIST.x, WRIST.y, WRIST.z))
        bone(f"shoulder_{side}", (sx * 0.03, 0, 1.40 + BODY_LIFT), s, "chest")
        bone(f"upperarm_{side}", s, e, f"shoulder_{side}")
        bone(f"forearm_{side}", e, w, f"upperarm_{side}")
        bone(f"hand_{side}", w, w + Vector((0, 0, -0.08)), f"forearm_{side}")
        k = w.z - 0.078
        bone(f"index_{side}", (w.x, w.y - 0.026, k), (w.x, w.y - 0.028, k - 0.066), f"hand_{side}")
        bone(f"fingers_{side}", (w.x, w.y + 0.004, k), (w.x, w.y + 0.004, k - 0.07), f"hand_{side}")
        t0 = thumb_base(sx)
        bone(f"thumb_{side}", t0, t0 + Vector((-sx * 0.004, -0.024, -0.040)), f"hand_{side}")
    bpy.ops.object.mode_set(mode="OBJECT")
    return rig


def bind(obj, rig):
    obj.parent = rig
    mod = obj.modifiers.new("Armature", "ARMATURE")
    mod.object = rig


def preview(path, lens=70, location=(0.0, -1.25, 1.52)):
    scene = bpy.context.scene
    cam_data = bpy.data.cameras.new("PreviewCam")
    cam_data.lens = lens
    cam = bpy.data.objects.new("PreviewCam", cam_data)
    scene.collection.objects.link(cam)
    cam.location = location
    cam.rotation_euler = (math.radians(90), 0, 0)
    scene.camera = cam
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
    scene.render.film_transparent = True
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--blend")
    ap.add_argument("--preview")
    args = ap.parse_args(argv)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = make_materials()
    head, face = build_head(mats)
    eyes = build_eyes(face, mats)
    objs = [head, eyes, build_eyelids(mats), build_brows(face, mats), build_mouth(face, mats),
            build_glasses(face, mats), build_hair(face, mats), build_body(mats)]
    rig = build_armature()
    for o in objs:
        bind(o, rig)

    if args.preview:
        preview(args.preview)
        preview(args.preview.replace(".png", "-face.png"), lens=200, location=(0.0, -1.25, 1.63))
    if args.blend:
        bpy.ops.wm.save_as_mainfile(filepath=args.blend)

    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.export_scene.gltf(
        filepath=args.out,
        export_format="GLB",
        export_apply=False,
        export_yup=True,
        export_skins=True,
        export_morph=True,
        export_morph_normal=True,
        export_animations=False,
        export_materials="EXPORT",
        export_image_format="JPEG",
        export_image_quality=82,
    )
    print("EXPORTED", args.out)


main()
