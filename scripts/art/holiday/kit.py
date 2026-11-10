"""
The holiday gifts' art, made in Blender (4.0) from code and nothing else: every object is built
here, lit by one soft key light from the top left, and rendered by Cycles into a background plate
and a handful of sprites with their own shadows, which the gift then moves about in the browser.

    blender --background --factory-startup --python unwrapped.py -- --out <dir> [--preview]

The camera looks down at a table and leans 20 degrees towards the viewer, orthographic, so a sprite
is the same picture wherever it is put and a flat thing lying on the table is only 6% shorter than
it is wide. One stage unit (the gift's --k) is 0.1 Blender units; the stage is 100 by 170 of them,
its middle at the world's origin, on the table (z = 0).
"""

import bpy
import json
import math
import os
import random
import sys
from mathutils import Matrix, Vector

K = 0.1
CAM_DIST = 60.0   # how far the lens is from the middle of the table
TILT = math.radians(20.0)
COS_T, SIN_T = math.cos(TILT), math.sin(TILT)
STAGE_W, STAGE_H = 100.0, 170.0
TAU = math.tau


# ------------------------------------------------------------------------------------------ cli

def cli():
    """Arguments after the bare `--`: --out DIR, --preview (small and quick), --only NAME,NAME."""
    a = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    opt = {"out": os.getcwd(), "preview": False, "only": None, "look": None, "samples": None, "view": None, "exposure": None, "contrast": None}
    i = 0
    while i < len(a):
        if a[i] == "--out":
            opt["out"] = a[i + 1]
            i += 1
        elif a[i] == "--preview":
            opt["preview"] = True
        elif a[i] == "--only":
            opt["only"] = a[i + 1].split(",")
            i += 1
        elif a[i] == "--look":
            opt["look"] = a[i + 1].split(",")
            i += 1
        elif a[i] == "--samples":
            opt["samples"] = int(a[i + 1])
            i += 1
        elif a[i] == "--view":
            opt["view"] = a[i + 1]
            i += 1
        elif a[i] == "--exposure":
            opt["exposure"] = float(a[i + 1])
            i += 1
        elif a[i] == "--contrast":
            opt["contrast"] = a[i + 1]
            i += 1
        i += 1
    os.makedirs(opt["out"], exist_ok=True)
    return opt


# ---------------------------------------------------------------------------------------- scene

_cur = None


def reset():
    """Back to nothing. A generator is run hundreds of times; it has to start clean."""
    global _cur
    for coll in (bpy.data.objects, bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.lights,
                 bpy.data.cameras, bpy.data.textures, bpy.data.images, bpy.data.worlds, bpy.data.collections,
                 bpy.data.node_groups, bpy.data.metaballs):
        for item in list(coll):
            try:
                coll.remove(item, do_unlink=True)
            except Exception:
                pass
    _cur = None


def layer(name):
    """Everything built from here on goes into the collection `name` (made if it is new)."""
    global _cur
    coll = bpy.data.collections.get(name)
    if coll is None:
        coll = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(coll)
    _cur = coll
    return coll


def link(ob):
    (_cur or bpy.context.scene.collection).objects.link(ob)
    return ob


def at(sx, sy, z=0.0):
    """Where on the table a thing has to stand to be seen at (sx, sy) on the stage, in stage units from its middle."""
    return Vector((sx * K, sy * K / COS_T, z))


def on_stage(p):
    """A point in the world, as stage units from the stage's middle (x right, y up)."""
    return (p.x / K, (p.y * COS_T + p.z * SIN_T) / K)


def lin(hexcolor, a=1.0):
    """An sRGB hex colour as the linear RGBA Blender wants."""
    h = hexcolor.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (out[0], out[1], out[2], a)


# ----------------------------------------------------------------------------------------- mesh

def mesh_obj(name, verts, faces, mat=None, smooth=True, uvs=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.validate()
    me.update()
    for p in me.polygons:
        p.use_smooth = smooth
    if uvs is not None:
        layer_uv = me.uv_layers.new(name="UVMap")
        for poly in me.polygons:
            for li in poly.loop_indices:
                layer_uv.data[li].uv = uvs[me.loops[li].vertex_index]
    ob = bpy.data.objects.new(name, me)
    if mat is not None:
        me.materials.append(mat)
    return link(ob)


def autosmooth(ob, angle=40.0):
    try:
        ob.data.use_auto_smooth = True
        ob.data.auto_smooth_angle = math.radians(angle)
    except Exception:
        pass
    return ob


def bevel(ob, width, segs=3, angle=35.0):
    m = ob.modifiers.new("bevel", "BEVEL")
    m.width = width
    m.segments = segs
    m.limit_method = "ANGLE"
    m.angle_limit = math.radians(angle)
    try:
        m.harden_normals = True
    except Exception:
        pass
    autosmooth(ob, 60.0)
    return ob


def subsurf(ob, levels=2):
    m = ob.modifiers.new("subsurf", "SUBSURF")
    m.levels = levels
    m.render_levels = levels
    return ob


def solidify(ob, thickness, offset=-1.0):
    m = ob.modifiers.new("solid", "SOLIDIFY")
    m.thickness = thickness
    m.offset = offset
    return ob


def displace(ob, strength, scale, kind="CLOUDS", depth=2, mid=0.5):
    tex = bpy.data.textures.new(ob.name + "_tex", kind)
    try:
        tex.noise_scale = scale
        tex.noise_depth = depth
    except Exception:
        pass
    m = ob.modifiers.new("disp", "DISPLACE")
    m.texture = tex
    m.strength = strength
    m.mid_level = mid
    m.texture_coords = "GLOBAL"
    return ob


def place(ob, loc=(0, 0, 0), rot=(0, 0, 0), scale=None):
    ob.location = loc
    ob.rotation_euler = rot
    if scale is not None:
        ob.scale = (scale, scale, scale) if isinstance(scale, (int, float)) else scale
    return ob


def parent(children, name, loc=(0, 0, 0), rot_z=0.0, scale=1.0):
    """Puts a group of things built round the origin behind one empty, then moves, turns and sizes that."""
    e = bpy.data.objects.new(name, None)
    link(e)
    for c in children:
        c.parent = e
    e.location = loc
    e.rotation_euler = (0, 0, rot_z)
    e.scale = (scale, scale, scale)
    return e


BOX_FACES = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]


def box(name, size, mat=None, z0=0.0, r=0.0, segs=3):
    """A cuboid standing on z0, its middle over the origin; `r` rounds its edges."""
    hx, hy, h = size[0] / 2.0, size[1] / 2.0, size[2]
    v = [(-hx, -hy, z0), (hx, -hy, z0), (hx, hy, z0), (-hx, hy, z0), (-hx, -hy, z0 + h), (hx, -hy, z0 + h), (hx, hy, z0 + h), (-hx, hy, z0 + h)]
    ob = mesh_obj(name, v, BOX_FACES, mat, smooth=r > 0)
    if r > 0:
        bevel(ob, r, segs)
    return ob


def lathe(name, profile, seg=48, mat=None, smooth=True):
    """A shape turned round the Z axis from (radius, height) pairs; a radius of 0 at either end closes it."""
    verts, faces = [], []
    rows = []
    for (r, z) in profile:
        if r <= 1e-6:
            rows.append([len(verts)])
            verts.append((0.0, 0.0, z))
        else:
            row = []
            for j in range(seg):
                a = TAU * j / seg
                row.append(len(verts))
                verts.append((r * math.cos(a), r * math.sin(a), z))
            rows.append(row)
    for i in range(len(rows) - 1):
        a, b = rows[i], rows[i + 1]
        for j in range(seg):
            k = (j + 1) % seg
            if len(a) == 1 and len(b) == 1:
                continue
            if len(a) == 1:
                faces.append((a[0], b[k], b[j]))
            elif len(b) == 1:
                faces.append((a[j], a[k], b[0]))
            else:
                faces.append((a[j], a[k], b[k], b[j]))
    return mesh_obj(name, verts, faces, mat, smooth)


def sphere(name, r=1.0, mat=None, seg=32, rings=16, squash=1.0):
    prof = [(r * math.sin(math.pi * i / rings), -r * math.cos(math.pi * i / rings) * squash) for i in range(rings + 1)]
    prof[0] = (0.0, -r * squash)
    prof[-1] = (0.0, r * squash)
    return lathe(name, prof, seg, mat)


def _frame(t, up=Vector((0, 0, 1))):
    t = t.normalized()
    if abs(t.dot(up)) > 0.98:
        up = Vector((1, 0, 0))
    b = t.cross(up).normalized()
    n = b.cross(t).normalized()
    return n, b


def tube(name, path, radii, seg=12, mat=None, cap=True, flat=1.0):
    """A tube along `path` (a list of points). `radii` is one radius or one per point; `flat` squashes it across."""
    pts = [Vector(p) for p in path]
    if isinstance(radii, (int, float)):
        radii = [radii] * len(pts)
    verts, faces, uvs = [], [], []
    length = 0.0
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)])
        n, b = _frame(t)
        if i:
            length += (p - pts[i - 1]).length
        for j in range(seg):
            a = TAU * j / seg
            verts.append(p + (n * math.cos(a) * flat + b * math.sin(a)) * radii[i])
            uvs.append((length, j / seg))
    for i in range(len(pts) - 1):
        for j in range(seg):
            k = (j + 1) % seg
            faces.append((i * seg + j, i * seg + k, (i + 1) * seg + k, (i + 1) * seg + j))
    if cap:
        faces.append(tuple(range(seg - 1, -1, -1)))
        base = (len(pts) - 1) * seg
        faces.append(tuple(range(base, base + seg)))
    return mesh_obj(name, verts, faces, mat, True, uvs)


def strip(name, stations, mat=None, thickness=0.03, levels=2, across=5):
    """
    A ribbon. Each station is (centre, across, half_width, out, bulge): the middle of the ribbon there, the
    unit direction across it, half its width, the unit direction its face looks, and how far its middle
    swells that way, which is what gives satin its roll of light.
    """
    verts, faces = [], []
    for (c, ax, hw, out, bulge) in stations:
        c, ax, out = Vector(c), Vector(ax), Vector(out)
        for j in range(across):
            u = j / (across - 1) * 2.0 - 1.0
            verts.append(c + ax * (hw * u) + out * (bulge * (1.0 - u * u)))
    for i in range(len(stations) - 1):
        for j in range(across - 1):
            a = i * across + j
            faces.append((a, a + 1, a + across + 1, a + across))
    ob = mesh_obj(name, verts, faces, mat, True)
    if thickness:
        solidify(ob, thickness, 0.0)
    if levels:
        subsurf(ob, levels)
    return ob


def prism(name, outline, h, mat=None, z0=0.0, r=0.0, segs=2):
    """A flat shape with thickness: `outline` is its edge, anticlockwise, in x and y."""
    n = len(outline)
    verts = [(x, y, z0) for (x, y) in outline] + [(x, y, z0 + h) for (x, y) in outline]
    faces = [tuple(range(n - 1, -1, -1)), tuple(range(n, 2 * n))]
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, n + j, n + i))
    ob = mesh_obj(name, verts, faces, mat, smooth=False)
    if r > 0:
        bevel(ob, r, segs, 30.0)
    return ob


def grid(name, w, d, nx, ny, mat=None, z=0.0):
    verts = [(-w / 2 + w * i / nx, -d / 2 + d * j / ny, z) for j in range(ny + 1) for i in range(nx + 1)]
    faces = [(j * (nx + 1) + i, j * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i) for j in range(ny) for i in range(nx)]
    return mesh_obj(name, verts, faces, mat, True)


def star_outline(points=5, r_out=1.0, r_in=0.42, turn=math.pi / 2):
    return [((r_out if i % 2 == 0 else r_in) * math.cos(turn + math.pi * i / points), (r_out if i % 2 == 0 else r_in) * math.sin(turn + math.pi * i / points)) for i in range(points * 2)]


def rounded_rect(w, h, r, seg=6):
    pts = []
    for (cx, cy, a0) in ((w / 2 - r, h / 2 - r, 0.0), (-w / 2 + r, h / 2 - r, math.pi / 2), (-w / 2 + r, -h / 2 + r, math.pi), (w / 2 - r, -h / 2 + r, 1.5 * math.pi)):
        for i in range(seg + 1):
            a = a0 + (math.pi / 2) * i / seg
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


# ------------------------------------------------------------------------------------ materials

class Mat:
    """A material and a few short words for wiring its nodes."""

    def __init__(self, name):
        self.mat = bpy.data.materials.new(name)
        self.mat.use_nodes = True
        self.nt = self.mat.node_tree
        self.bsdf = self.nt.nodes["Principled BSDF"]
        self.out = self.nt.nodes["Material Output"]

    def _in(self, sock, val):
        if isinstance(val, bpy.types.NodeSocket):
            self.nt.links.new(val, sock)
        elif isinstance(val, str):
            sock.default_value = lin(val)
        else:
            sock.default_value = val

    def set(self, **kw):
        names = {"base": "Base Color", "rough": "Roughness", "metal": "Metallic", "sss": "Subsurface Weight", "sss_scale": "Subsurface Scale",
                 "sss_radius": "Subsurface Radius", "sheen": "Sheen Weight", "sheen_rough": "Sheen Roughness", "sheen_tint": "Sheen Tint",
                 "coat": "Coat Weight", "coat_rough": "Coat Roughness", "emit": "Emission Color", "emit_strength": "Emission Strength",
                 "normal": "Normal", "spec": "Specular IOR Level", "trans": "Transmission Weight", "ior": "IOR", "alpha": "Alpha",
                 "aniso": "Anisotropic", "aniso_rot": "Anisotropic Rotation", "coat_normal": "Coat Normal"}
        for k, v in kw.items():
            self._in(self.bsdf.inputs[names[k]], v)
        return self

    def node(self, kind):
        return self.nt.nodes.new(kind)

    def math(self, op, a, b=None, c=None, clamp=False):
        if op == "SMOOTHSTEP":
            # 0 below `b`, 1 above `c`, eased between: the Math node has no such thing, Map Range does.
            n = self.node("ShaderNodeMapRange")
            n.interpolation_type = "SMOOTHSTEP"
            self._in(n.inputs["Value"], a)
            self._in(n.inputs["From Min"], b)
            self._in(n.inputs["From Max"], c)
            n.inputs["To Min"].default_value = 0.0
            n.inputs["To Max"].default_value = 1.0
            return n.outputs["Result"]
        n = self.node("ShaderNodeMath")
        n.operation = op
        n.use_clamp = clamp
        self._in(n.inputs[0], a)
        if b is not None:
            self._in(n.inputs[1], b)
        if c is not None:
            self._in(n.inputs[2], c)
        return n.outputs[0]

    def vmath(self, op, a, b=None, scale=None):
        n = self.node("ShaderNodeVectorMath")
        n.operation = op
        self._in(n.inputs[0], a)
        if b is not None:
            self._in(n.inputs[1], b)
        if scale is not None:
            self._in(n.inputs[3], scale)
        return n.outputs[1] if op in ("LENGTH", "DOT_PRODUCT", "DISTANCE") else n.outputs[0]

    def mix(self, fac, a, b, kind="MIX"):
        n = self.node("ShaderNodeMixRGB")
        n.blend_type = kind
        self._in(n.inputs["Fac"], fac)
        self._in(n.inputs["Color1"], a)
        self._in(n.inputs["Color2"], b)
        return n.outputs[0]

    def coords(self, kind="Object"):
        return self.node("ShaderNodeTexCoord").outputs[kind]

    def mapping(self, vec, scale=(1, 1, 1), rot=(0, 0, 0), loc=(0, 0, 0)):
        n = self.node("ShaderNodeMapping")
        self.nt.links.new(vec, n.inputs["Vector"])
        n.inputs["Scale"].default_value = scale
        n.inputs["Rotation"].default_value = rot
        n.inputs["Location"].default_value = loc
        return n.outputs[0]

    def sep(self, vec):
        n = self.node("ShaderNodeSeparateXYZ")
        self.nt.links.new(vec, n.inputs[0])
        return n.outputs[0], n.outputs[1], n.outputs[2]

    def comb(self, x, y, z=0.0):
        n = self.node("ShaderNodeCombineXYZ")
        self._in(n.inputs[0], x)
        self._in(n.inputs[1], y)
        self._in(n.inputs[2], z)
        return n.outputs[0]

    def noise(self, vec, scale=1.0, detail=2.0, rough=0.5, distortion=0.0):
        n = self.node("ShaderNodeTexNoise")
        if vec is not None:
            self.nt.links.new(vec, n.inputs["Vector"])
        n.inputs["Scale"].default_value = scale
        n.inputs["Detail"].default_value = detail
        n.inputs["Roughness"].default_value = rough
        n.inputs["Distortion"].default_value = distortion
        return n.outputs["Fac"], n.outputs["Color"]

    def voronoi(self, vec, scale=1.0, feature="F1", rand=1.0):
        n = self.node("ShaderNodeTexVoronoi")
        n.feature = feature
        if vec is not None:
            self.nt.links.new(vec, n.inputs["Vector"])
        n.inputs["Scale"].default_value = scale
        n.inputs["Randomness"].default_value = rand
        return n.outputs["Distance"], (n.outputs["Color"] if "Color" in n.outputs else None)

    def wave(self, vec, scale=1.0, distortion=0.0, detail=2.0, dscale=1.0, kind="BANDS", direction="X", profile="SIN"):
        n = self.node("ShaderNodeTexWave")
        n.wave_type = kind
        n.wave_profile = profile
        if kind == "BANDS":
            n.bands_direction = direction
        else:
            n.rings_direction = direction
        if vec is not None:
            self.nt.links.new(vec, n.inputs["Vector"])
        n.inputs["Scale"].default_value = scale
        n.inputs["Distortion"].default_value = distortion
        n.inputs["Detail"].default_value = detail
        n.inputs["Detail Scale"].default_value = dscale
        return n.outputs["Fac"]

    def ramp(self, fac, stops, interp="LINEAR"):
        n = self.node("ShaderNodeValToRGB")
        cr = n.color_ramp
        cr.interpolation = interp
        while len(cr.elements) < len(stops):
            cr.elements.new(0.5)
        for el, (pos, col) in zip(cr.elements, stops):
            el.position = pos
            el.color = lin(col) if isinstance(col, str) else col
        self._in(n.inputs["Fac"], fac)
        return n.outputs["Color"]

    def bump(self, height, strength=0.3, dist=0.02, normal=None):
        n = self.node("ShaderNodeBump")
        n.inputs["Strength"].default_value = strength
        n.inputs["Distance"].default_value = dist
        self._in(n.inputs["Height"], height)
        if normal is not None:
            self.nt.links.new(normal, n.inputs["Normal"])
        return n.outputs["Normal"]

    def face_uv(self, scale=1.0):
        """Flat coordinates on each face of a box (in object units), so a print is not smeared down its sides."""
        tc = self.node("ShaderNodeTexCoord")
        x, y, z = self.sep(tc.outputs["Object"])
        nx, ny, nz = self.sep(tc.outputs["Normal"])
        top = self.math("GREATER_THAN", self.math("ABSOLUTE", nz), 0.5)
        front = self.math("GREATER_THAN", self.math("ABSOLUTE", ny), 0.5)
        side_or_front = self.mix(front, self.comb(y, z), self.comb(x, z))
        uv = self.mix(top, side_or_front, self.comb(x, y))
        return self.vmath("SCALE", uv, scale=scale) if scale != 1.0 else uv

    def band(self, x, width, soft=0.02):
        """1 inside a stripe of `width` (0..1 of the period) centred on every whole number of x, 0 outside."""
        tri = self.math("MULTIPLY", self.math("ABSOLUTE", self.math("SUBTRACT", self.math("FRACT", self.math("ADD", x, 0.5)), 0.5)), 2.0)
        return self.math("SUBTRACT", 1.0, self.math("SMOOTHSTEP", tri, width - soft, width + soft))


def plain(name, color, rough=0.5, metal=0.0, **kw):
    m = Mat(name)
    m.set(base=color, rough=rough, metal=metal, **kw)
    return m.mat


def gold(name="gold", color="#ffc65a", rough=0.24):
    return plain(name, color, rough, 1.0)


def satin(name, color):
    m = Mat(name)
    m.set(base=color, rough=0.36, sheen=0.35, sheen_rough=0.4, coat=0.12, coat_rough=0.3)
    return m.mat


def emissive(name, color, strength):
    m = Mat(name)
    m.set(base=color, emit=color, emit_strength=strength, rough=0.4)
    return m.mat


def paper(name, base, print_kind=None, ink="#ffffff", scale=1.0, ink2=None, foil=False):
    """Wrapping paper: a colour, a print (dots, stripes, stars, tartan) and the soft crumple of a sheet folded round a box."""
    m = Mat(name)
    uv = m.face_uv(scale)
    u, v, _ = m.sep(uv)
    col = lin(base)
    if print_kind == "dots":
        row = m.math("FLOOR", v)
        u2 = m.math("ADD", u, m.math("FRACT", m.math("MULTIPLY", row, 0.5)))
        fu = m.math("SUBTRACT", m.math("FRACT", u2), 0.5)
        fv = m.math("SUBTRACT", m.math("FRACT", v), 0.5)
        d = m.math("SQRT", m.math("ADD", m.math("MULTIPLY", fu, fu), m.math("MULTIPLY", fv, fv)))
        mask = m.math("SUBTRACT", 1.0, m.math("SMOOTHSTEP", d, 0.215, 0.245))
        col = m.mix(mask, col, lin(ink))
    elif print_kind == "stripes":
        mask = m.band(m.math("MULTIPLY", m.math("ADD", u, v), 0.5), 0.36, 0.03)
        col = m.mix(mask, col, lin(ink))
    elif print_kind == "pinstripes":
        mask = m.band(u, 0.16, 0.03)
        col = m.mix(mask, col, lin(ink))
    elif print_kind == "stars":
        row = m.math("FLOOR", v)
        u2 = m.math("ADD", u, m.math("FRACT", m.math("MULTIPLY", row, 0.5)))
        fu = m.math("ABSOLUTE", m.math("SUBTRACT", m.math("FRACT", u2), 0.5))
        fv = m.math("ABSOLUTE", m.math("SUBTRACT", m.math("FRACT", v), 0.5))
        a = m.math("ADD", m.math("SQRT", fu), m.math("SQRT", fv))
        mask = m.math("SUBTRACT", 1.0, m.math("SMOOTHSTEP", a, 0.50, 0.56))
        col = m.mix(mask, col, lin(ink))
    elif print_kind == "tartan":
        wide_u = m.band(u, 0.4, 0.015)
        wide_v = m.band(v, 0.4, 0.015)
        dark = m.math("ADD", m.math("MULTIPLY", wide_u, 0.5), m.math("MULTIPLY", wide_v, 0.5))
        col = m.mix(dark, col, lin(ink))
        mid_u = m.band(m.math("ADD", u, 0.5), 0.16, 0.012)
        mid_v = m.band(m.math("ADD", v, 0.5), 0.16, 0.012)
        col = m.mix(m.math("MULTIPLY", m.math("ADD", mid_u, mid_v), 0.32), col, (0.0, 0.0, 0.0, 1.0))
        thin_u = m.band(m.math("ADD", u, 0.5), 0.035, 0.008)
        thin_v = m.band(m.math("ADD", v, 0.5), 0.035, 0.008)
        col = m.mix(m.math("MAXIMUM", thin_u, thin_v), col, lin(ink2 or "#f3e3b4"))
        fine_u = m.band(m.math("ADD", u, 0.0), 0.022, 0.006)
        fine_v = m.band(m.math("ADD", v, 0.0), 0.022, 0.006)
        col = m.mix(m.math("MULTIPLY", m.math("MAXIMUM", fine_u, fine_v), 0.8), col, lin("#f6efe0"))
    obj = m.coords("Object")
    crumple, _ = m.noise(obj, 0.55, 7.0, 0.62)
    fine, _ = m.noise(obj, 9.0, 3.0, 0.5)
    height = m.math("ADD", crumple, m.math("MULTIPLY", fine, 0.08))
    normal = m.bump(height, 0.36, 0.08)
    if foil:
        m.set(base=col, metal=1.0, rough=0.28, normal=normal)
    else:
        m.set(base=col, rough=0.46, coat=0.18, coat_rough=0.35, normal=normal, spec=0.45)
    return m.mat


def wood(name, light="#6b4226", dark="#3c2416", plank=1.7, rough=0.42, along="X"):
    """Planks: each a shade of its own, grain running along it, a fine dark seam between."""
    m = Mat(name)
    x, y, z = m.sep(m.coords("Object"))
    a, b = (x, y) if along == "X" else (y, x)
    idx = m.math("FLOOR", m.math("DIVIDE", b, plank))
    wn = m.node("ShaderNodeTexWhiteNoise")
    wn.noise_dimensions = "1D"
    m._in(wn.inputs["W"], idx)
    shade = wn.outputs["Value"]
    stagger = m.math("MULTIPLY", shade, 37.0)
    grain_vec = m.comb(m.math("MULTIPLY", m.math("ADD", a, stagger), 0.16), m.math("MULTIPLY", b, 3.2), m.math("MULTIPLY", idx, 3.1))
    grain, _ = m.noise(grain_vec, 3.4, 9.0, 0.62, 0.9)
    tone = m.math("ADD", m.math("MULTIPLY", grain, 0.72), m.math("MULTIPLY", shade, 0.28))
    col = m.ramp(tone, [(0.25, dark), (0.5, light), (0.78, dark)])
    edge = m.math("ABSOLUTE", m.math("SUBTRACT", m.math("FRACT", m.math("DIVIDE", b, plank)), 0.5))
    seam = m.math("SMOOTHSTEP", edge, 0.478, 0.497)
    col = m.mix(seam, col, (0.01, 0.006, 0.004, 1.0))
    height = m.math("SUBTRACT", m.math("MULTIPLY", grain, 0.25), seam)
    m.set(base=col, rough=rough, coat=0.25, coat_rough=0.3, normal=m.bump(height, 0.35, 0.03))
    return m.mat


def cloth(name, color, weave=22.0, rough=0.85, sheen=0.7, check=None, check_size=0.88, check_color=None):
    """Woven cloth with a soft nap. `check` adds gingham: bands one way, bands the other, darkest where they cross."""
    m = Mat(name)
    obj = m.coords("Object")
    x, y, z = m.sep(obj)
    col = lin(color)
    if check:
        bu = m.band(m.math("DIVIDE", x, check_size * 2.0), 0.5, 0.004)
        bv = m.band(m.math("DIVIDE", y, check_size * 2.0), 0.5, 0.004)
        both = m.math("MULTIPLY", bu, bv)
        either = m.math("SUBTRACT", m.math("ADD", bu, bv), m.math("MULTIPLY", both, 2.0))
        col = m.mix(m.math("MULTIPLY", either, 0.5), col, lin(check))
        col = m.mix(both, col, lin(check_color or check))
    wx = m.math("SINE", m.math("MULTIPLY", x, weave * TAU))
    wy = m.math("SINE", m.math("MULTIPLY", y, weave * TAU))
    weave_h = m.math("MULTIPLY", m.math("ADD", wx, wy), 0.25)
    slub, _ = m.noise(m.mapping(obj, (1.0, 14.0, 1.0)), 2.2, 4.0, 0.6)
    slub2, _ = m.noise(m.mapping(obj, (14.0, 1.0, 1.0)), 2.2, 4.0, 0.6)
    col = m.mix(m.math("MULTIPLY", m.math("ADD", slub, slub2), 0.09), col, (0.0, 0.0, 0.0, 1.0))
    m.set(base=col, rough=rough, sheen=sheen, sheen_rough=0.55, normal=m.bump(weave_h, 0.28, 0.004), spec=0.2)
    return m.mat


# ----------------------------------------------------------------------------- light and camera

VIEW = {}


def setup(view_w, view_h, ppk, samples=160, preview=False, exposure=0.75, view="Filmic", contrast="Very High Contrast"):
    """The camera, the key light and the renderer. `view_*` are stage units; `ppk` is pixels per unit."""
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    device = None
    for kind in ("OPTIX", "CUDA"):
        try:
            prefs.compute_device_type = kind
            try:
                prefs.refresh_devices()
            except Exception:
                prefs.get_devices()
            if any(d.type == kind for d in prefs.devices):
                for d in prefs.devices:
                    d.use = d.type == kind
                device = kind
                break
        except Exception:
            pass
    sc.cycles.device = "GPU" if device else "CPU"
    sc.cycles.samples = 48 if preview else samples
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.03 if preview else 0.012
    sc.cycles.use_denoising = True
    try:
        sc.cycles.denoiser = "OPTIX" if device == "OPTIX" else "OPENIMAGEDENOISE"
    except Exception:
        pass
    sc.cycles.max_bounces = 6
    sc.cycles.caustics_reflective = False
    sc.cycles.caustics_refractive = False
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.image_settings.color_depth = "8"
    sc.render.image_settings.compression = 20
    for v in (view, "Filmic", "Standard"):
        try:
            sc.view_settings.view_transform = v
            break
        except Exception:
            continue
    for look in (contrast, "Filmic - " + contrast, "None"):
        try:
            sc.view_settings.look = look
            break
        except Exception:
            continue
    sc.view_settings.exposure = exposure
    sc.view_settings.gamma = 1.0

    cam_data = bpy.data.cameras.new("cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = max(view_w, view_h) * K
    cam_data.clip_start = 0.1
    cam_data.clip_end = 300.0
    cam = bpy.data.objects.new("cam", cam_data)
    bpy.context.scene.collection.objects.link(cam)
    cam.rotation_euler = (TILT, 0.0, 0.0)
    cam.location = Vector((0.0, -math.sin(TILT), math.cos(TILT))) * CAM_DIST
    sc.camera = cam
    scale = 0.5 if preview else 1.0
    sc.render.resolution_x = int(round(view_w * ppk * scale))
    sc.render.resolution_y = int(round(view_h * ppk * scale))
    sc.render.resolution_percentage = 100
    VIEW.update(w=view_w, h=view_h, ppk=ppk * scale, preview=preview)
    return cam


def lights(key=2600.0, world=0.34, hdri="studio.exr", key_color=(1.0, 0.955, 0.9), size=16.0, fill=0.0, world_rot=0.6):
    """One big soft light from the top left, and a studio's worth of sky for the shine on satin and gold."""
    coll = layer("lights")
    data = bpy.data.lights.new("key", "AREA")
    data.shape = "DISK"
    data.size = size
    data.energy = key
    data.color = key_color
    ob = bpy.data.objects.new("key", data)
    coll.objects.link(ob)
    ob.location = Vector((-13.0, 11.0, 19.0))
    ob.rotation_euler = (Vector((0, 0, 0)) - ob.location).to_track_quat("-Z", "Y").to_euler()
    if fill:
        fd = bpy.data.lights.new("fill", "AREA")
        fd.shape = "DISK"
        fd.size = 22.0
        fd.energy = fill
        fd.color = (0.9, 0.94, 1.0)
        fo = bpy.data.objects.new("fill", fd)
        coll.objects.link(fo)
        fo.location = Vector((12.0, -14.0, 14.0))
        fo.rotation_euler = (Vector((0, 0, 0)) - fo.location).to_track_quat("-Z", "Y").to_euler()
        try:
            fd.cycles.cast_shadow = False
        except Exception:
            pass
    w = bpy.data.worlds.new("world")
    w.use_nodes = True
    nt = w.node_tree
    bg = nt.nodes["Background"]
    path = os.path.join(os.path.dirname(bpy.app.binary_path), "%d.%d" % bpy.app.version[:2], "datafiles", "studiolights", "world", hdri)
    if os.path.exists(path):
        env = nt.nodes.new("ShaderNodeTexEnvironment")
        env.image = bpy.data.images.load(path)
        tc = nt.nodes.new("ShaderNodeTexCoord")
        mp = nt.nodes.new("ShaderNodeMapping")
        mp.inputs["Rotation"].default_value = (0.0, 0.0, world_rot)
        nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"])
        nt.links.new(mp.outputs[0], env.inputs["Vector"])
        nt.links.new(env.outputs[0], bg.inputs["Color"])
    else:
        bg.inputs["Color"].default_value = (1.0, 0.96, 0.92, 1.0)
    bg.inputs["Strength"].default_value = world
    bpy.context.scene.world = w
    return ob


def lamp(name, loc, energy, color=(1.0, 0.72, 0.38), radius=0.15, shadow=True):
    """A small warm light: a fairy bulb's or a candle's throw on what is round it."""
    data = bpy.data.lights.new(name, "POINT")
    data.energy = energy
    data.color = color
    data.shadow_soft_size = radius
    try:
        data.cycles.cast_shadow = shadow
    except Exception:
        pass
    ob = bpy.data.objects.new(name, data)
    link(ob)
    ob.location = loc
    return ob


def glow(threshold=1.6, size=7, mix=0.0):
    """Bloom round whatever is brighter than the paper white: bulbs, flames."""
    sc = bpy.context.scene
    sc.use_nodes = True
    nt = sc.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    rl = nt.nodes.new("CompositorNodeRLayers")
    gl = nt.nodes.new("CompositorNodeGlare")
    gl.glare_type = "FOG_GLOW"
    gl.quality = "HIGH"
    gl.threshold = threshold
    gl.size = size
    gl.mix = mix
    out = nt.nodes.new("CompositorNodeComposite")
    nt.links.new(rl.outputs["Image"], gl.inputs["Image"])
    nt.links.new(gl.outputs["Image"], out.inputs["Image"])
    return gl


# --------------------------------------------------------------------------------------- render

MANIFEST = {"sprites": {}, "anchors": {}, "bulbs": []}


def _bounds(objs):
    dg = bpy.context.evaluated_depsgraph_get()
    xs, ys = [], []
    for ob in objs:
        if ob.type not in ("MESH", "CURVE", "META"):
            continue
        ev = ob.evaluated_get(dg)
        for corner in ev.bound_box:
            sx, sy = on_stage(ev.matrix_world @ Vector(corner))
            xs.append(sx)
            ys.append(sy)
    return min(xs), min(ys), max(xs), max(ys)


def objects_of(*names):
    out = []
    for n in names:
        coll = bpy.data.collections.get(n)
        if coll:
            out.extend(coll.all_objects)
    return out


def show_only(names):
    for coll in bpy.data.collections:
        coll.hide_render = coll.name not in names and coll.name != "lights"


def render_plate(path, hide=()):
    """The whole table, everything that never moves on it."""
    sc = bpy.context.scene
    for coll in bpy.data.collections:
        coll.hide_render = coll.name in hide
    sc.render.film_transparent = False
    sc.render.use_border = False
    sc.render.use_compositing = True
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("PLATE", path)


def render_sprite(name, path, layers, catch=("catch",), pad=(3.0, 3.0, 9.0, 9.0), density=1.5, bounds_of=None):
    """
    One thing by itself on nothing, with the shadow it throws (on the table, or on whatever `catch` holds)
    in its alpha. Only its own rectangle is rendered; where that sits on the stage goes in the manifest.
    `pad` is room left, top, right and bottom of it for the shadow, in stage units.
    """
    sc = bpy.context.scene
    show_only(set(layers) | set(catch))
    x0, y0, x1, y1 = _bounds(objects_of(*(bounds_of or layers)))
    x0, y1 = x0 - pad[0], y1 + pad[1]
    x1, y0 = x1 + pad[2], y0 - pad[3]
    hw, hh = VIEW["w"] / 2.0, VIEW["h"] / 2.0
    x0, x1 = max(x0, -hw), min(x1, hw)
    y0, y1 = max(y0, -hh), min(y1, hh)
    rx, ry = sc.render.resolution_x, sc.render.resolution_y
    pct = int(round(100 * density)) if not VIEW["preview"] else 100
    tx, ty = rx * pct // 100, ry * pct // 100
    px0, px1 = int(math.floor((x0 + hw) / VIEW["w"] * tx)), int(math.ceil((x1 + hw) / VIEW["w"] * tx))
    py0, py1 = int(math.floor((y0 + hh) / VIEW["h"] * ty)), int(math.ceil((y1 + hh) / VIEW["h"] * ty))
    sc.render.resolution_percentage = pct
    sc.render.use_border = True
    sc.render.use_crop_to_border = True
    sc.render.border_min_x = (px0 + 0.01) / tx
    sc.render.border_max_x = (px1 + 0.01) / tx
    sc.render.border_min_y = (py0 + 0.01) / ty
    sc.render.border_max_y = (py1 + 0.01) / ty
    sc.render.film_transparent = True
    sc.render.use_compositing = False
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    sc.render.use_border = False
    sc.render.resolution_percentage = 100
    per_k = tx / VIEW["w"]
    MANIFEST["sprites"][name] = {
        "file": os.path.basename(path),
        "x": round(px0 / per_k - hw + STAGE_W / 2.0, 3),
        "y": round(STAGE_H / 2.0 - (py1 / per_k - hh), 3),
        "w": round((px1 - px0) / per_k, 3),
        "h": round((py1 - py0) / per_k, 3),
        "pxPerK": round(per_k, 4),
    }
    print("SPRITE", name, MANIFEST["sprites"][name])


def render_soft(path, hide=(), blur=4.0, lift=30.0, percent=40, samples=320):
    """
    The table out of focus, for the letter to be read over. The lens is focused well above the
    table, so everything on it goes soft (by about `blur` stage units) and every light becomes a disc.
    """
    sc = bpy.context.scene
    cam = sc.camera.data
    for coll in bpy.data.collections:
        coll.hide_render = coll.name in hide
    cam.dof.use_dof = True
    cam.dof.focus_distance = CAM_DIST - lift
    # an orthographic lens opens to 1 / (2 f); what lies `lift` beyond its focus is spread by that times lift / focus
    radius = blur * K * (CAM_DIST - lift) / lift
    cam.dof.aperture_fstop = 1.0 / (2.0 * radius)
    cam.dof.aperture_blades = 0
    keep = (sc.render.resolution_percentage, sc.cycles.samples)
    sc.render.resolution_percentage = percent
    if samples:
        sc.cycles.samples = samples
    sc.render.film_transparent = False
    sc.render.use_border = False
    sc.render.use_compositing = True
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    sc.render.resolution_percentage, sc.cycles.samples = keep
    cam.dof.use_dof = False
    print("SOFT", path)


def anchor(name, world_point):
    """A point the gift needs to know (where a tag's words go, where a bone pivots), in stage units from the top left."""
    sx, sy = on_stage(Vector(world_point))
    MANIFEST["anchors"][name] = {"x": round(sx + STAGE_W / 2.0, 3), "y": round(STAGE_H / 2.0 - sy, 3)}


def catcher(z=0.0, size=80.0, name="catch", centre=(0.0, 0.0)):
    """A flat place for shadows to fall and nothing else: the table for most sprites, a lid for what lies on one."""
    layer(name)
    cx, cy = centre
    ob = mesh_obj(name, [(cx - size, cy - size, z), (cx + size, cy - size, z), (cx + size, cy + size, z), (cx - size, cy + size, z)], [(0, 1, 2, 3)], plain(name + "_mat", "#808080", 0.9), smooth=False)
    ob.is_shadow_catcher = True
    return ob


def save_manifest(path):
    """Written over what an earlier run left there, so one part (the sprites, the soft plates) can be rendered again by itself."""
    out = dict(MANIFEST)
    if os.path.exists(path):
        with open(path) as f:
            old = json.load(f)
        for key in ("sprites", "anchors"):
            merged = dict(old.get(key, {}))
            merged.update(MANIFEST[key])
            out[key] = merged
        if not MANIFEST["bulbs"]:
            out["bulbs"] = old.get("bulbs", [])
        for key, val in old.items():
            out.setdefault(key, val)
    with open(path, "w") as f:
        json.dump(out, f, indent=1)
    print("MANIFEST", path)
