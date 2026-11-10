"""The things on Santa's desk and on the Thanksgiving table: scroll and stamp, glasses and ink, plate and bone, pumpkins and pie."""

import math
import random

import bpy
from mathutils import Vector
from mathutils import noise as mnoise

from kit import (TAU, Mat, bevel, box, gold, lathe, lin, link, mesh_obj, place, plain, prism, rounded_rect, solidify, sphere, strip,
                 subsurf, tube)

Z = Vector((0, 0, 1))


# ------------------------------------------------------------------------------------ the scroll

def turned_wood(name, color="#6a4226", dark="#3a2212", rough=0.38):
    """Wood for something turned on a lathe: grain running along its length (X), polished."""
    m = Mat(name)
    obj = m.coords("Object")
    grain, _ = m.noise(m.mapping(obj, (0.35, 6.0, 6.0)), 3.0, 6.0, 0.6, 0.6)
    col = m.ramp(grain, [(0.3, dark), (0.55, color), (0.8, dark)])
    m.set(base=col, rough=rough, coat=0.4, coat_rough=0.2, normal=m.bump(grain, 0.15, 0.01))
    return m.mat


def parchment(name="parchment", light="#f7ecd0", mid="#efdcb2", stain="#dcc08a", edge="#c9a468", half_w=3.8):
    """Old paper: clouds of tea-coloured staining, darker towards its long edges, a fine fibre in it."""
    m = Mat(name)
    obj = m.coords("Object")
    x, y, z = m.sep(obj)
    big, _ = m.noise(obj, 0.55, 5.0, 0.62)
    small, _ = m.noise(obj, 5.0, 4.0, 0.6)
    tone = m.math("ADD", m.math("MULTIPLY", big, 0.75), m.math("MULTIPLY", small, 0.25))
    col = m.ramp(tone, [(0.3, stain), (0.5, mid), (0.7, light)])
    near_edge = m.math("SMOOTHSTEP", m.math("ABSOLUTE", x), half_w - 0.75, half_w)
    col = m.mix(m.math("MULTIPLY", near_edge, 0.6), col, edge)
    fibre, _ = m.noise(obj, 34.0, 3.0, 0.6)
    m.set(base=col, rough=0.78, sss=0.08, sss_scale=0.05, spec=0.25, normal=m.bump(m.math("ADD", fibre, m.math("MULTIPLY", small, 0.6)), 0.1, 0.006))
    return m.mat


def paper_sheet(name, mat, width, length, seed=5):
    """The unrolled part of the scroll, lying on the desk from y = 0 down to -length: a little wavy, its long edges not quite straight and lifting a hair."""
    nx, ny = 40, int(length / 0.12)
    verts = []
    for j in range(ny + 1):
        y = -length * j / ny
        for i in range(nx + 1):
            u = i / nx * 2.0 - 1.0
            wob = 0.03 * mnoise.noise(Vector((u * 9.0, y * 1.3, seed))) * abs(u) ** 6
            x = (width / 2.0) * u + wob
            zz = 0.012 + 0.018 * (0.5 + 0.5 * mnoise.noise(Vector((x * 0.9, y * 0.7, seed + 2.0)))) + 0.05 * abs(u) ** 8
            verts.append((x, y, zz))
    faces = [(j * (nx + 1) + i, (j + 1) * (nx + 1) + i, (j + 1) * (nx + 1) + i + 1, j * (nx + 1) + i + 1) for j in range(ny) for i in range(nx)]
    return mesh_obj(name, verts, faces, mat, True)


def rod(name, length, r, wood_mat, metal_mat, knob=0.3):
    """A roller for the scroll, lying along X at height r: a turned rod with a brass finial at each end."""
    parts = []
    body = tube(name, [Vector((-length / 2, 0, r)), Vector((length / 2, 0, r))], r, 24, wood_mat)
    parts.append(body)
    prof = [(0.0, 0.0), (r * 1.25, 0.0), (r * 1.3, 0.05), (r * 1.25, 0.1), (r * 0.7, 0.14), (knob * 0.55, 0.2), (knob, 0.36), (knob * 0.92, 0.5), (knob * 0.5, 0.6), (0.0, 0.63)]
    for side in (-1, 1):
        fin = lathe("%s_fin%d" % (name, side), prof, 28, metal_mat)
        place(fin, (side * length / 2, 0, r), rot=(0, side * math.pi / 2, 0))
        parts.append(fin)
    return parts


def rolled_parchment(name="rolled_parchment", half_w=3.8, depth=0.6, power=1.5, shade="#8a6234"):
    """The same paper rolled up: drawn darker where it curves away from the eye, so a roll of it reads as round from straight above."""
    mat = parchment(name, half_w=half_w)
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    src = bsdf.inputs["Base Color"].links[0].from_socket
    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.5
    pw = nt.nodes.new("ShaderNodeMath")
    pw.operation = "POWER"
    nt.links.new(lw.outputs["Facing"], pw.inputs[0])
    pw.inputs[1].default_value = power
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mul.use_clamp = True
    nt.links.new(pw.outputs[0], mul.inputs[0])
    mul.inputs[1].default_value = depth
    mix = nt.nodes.new("ShaderNodeMixRGB")
    mix.blend_type = "MULTIPLY"
    nt.links.new(mul.outputs[0], mix.inputs["Fac"])
    nt.links.new(src, mix.inputs["Color1"])
    mix.inputs["Color2"].default_value = lin(shade)
    nt.links.new(mix.outputs[0], bsdf.inputs["Base Color"])
    return mat


def paper_roll(name, length, r, paper_mat, wood_mat, metal_mat, rod_r=0.17, seed=3):
    """The rest of the scroll, still rolled round its rod: a fat roll of paper, not quite even, its turns stepping in towards each end, the rod and its finials beyond them."""
    parts = rod(name + "_rod", length + 0.5, rod_r, wood_mat, metal_mat, 0.28)
    for p in parts:
        p.location.z += r - rod_r
    n = 28
    # three turns of the paper, each a little shorter than the one inside it
    for k, (shrink, inset) in enumerate(((0.0, 0.2), (0.035, 0.09), (0.07, 0.0))):
        half = length / 2 - inset
        pts, radii = [], []
        for i in range(n + 1):
            x = -half + 2 * half * i / n
            pts.append(Vector((x, 0, r)))
            wob = mnoise.noise(Vector((x * 0.9, k * 3.1, seed))) * 0.014 + mnoise.noise(Vector((x * 3.3, k * 1.7, seed + 4.0))) * 0.005
            radii.append((r - shrink) * (1.0 + wob * (1.0 if k == 0 else 0.5)))
        parts.append(tube(name if k == 0 else "%s_turn%d" % (name, k), pts, radii, 48, paper_mat))
    return parts


def paper_clip(name, mat, length=2.4, wire=0.045):
    """
    A paper clip on the sheet it holds, its long way along Y: only what shows from the front, which is
    its long loop, and the bend that goes over the top of the sheet. Returns its parts and how far up
    it (from its middle) the sheet ends.
    """
    L = length
    r1, r2 = 0.13 * L, 0.105 * L
    yb = -L / 2 + r1
    yt = L / 2 - r2
    cx = r1 - r2
    pts = [Vector((-r1, 0.2 * L, wire))]
    pts.append(Vector((-r1, yb, wire)))
    for i in range(1, 25):
        a = math.pi + math.pi * i / 24
        pts.append(Vector((r1 * math.cos(a), yb + r1 * math.sin(a), wire)))
    pts.append(Vector((r1, yt, wire)))
    for i in range(1, 25):
        a = math.pi * i / 24
        # over the top of the sheet and down behind it
        pts.append(Vector((cx + r2 * math.cos(a), yt + r2 * math.sin(a), wire - 0.6 * wire * (i / 24) ** 2)))
    body = tube(name, pts, wire, 14, mat)
    return [body], yt


def band_round(name, mat, cy, cz, ay, az, half_w, thickness=0.03):
    """A ribbon tied round a bundle lying along X: a band in the plane across it, hugging an ellipse of half-axes ay and az."""
    stations = []
    n = 36
    for i in range(n + 1):
        th = TAU * i / n
        c = Vector((0.0, cy + ay * math.cos(th), max(0.012, cz + az * math.sin(th))))
        out = Vector((0.0, math.cos(th) / ay, math.sin(th) / az)).normalized()
        stations.append((c, Vector((1, 0, 0)), half_w, out, 0.02))
    return strip(name, stations, mat, thickness, 2)


# --------------------------------------------------------------------------------- stamp and ink

def stamp_tool(name, wood_mat, metal_mat, rubber_mat, w=2.3, d=1.15):
    """A rubber stamp standing on its face: a block, a brass collar, and a turned handle with a ball top."""
    parts = []
    rubber = box(name + "_rubber", (w, d, 0.1), rubber_mat, 0.0, 0.02, 2)
    block = box(name + "_block", (w + 0.1, d + 0.1, 0.42), wood_mat, 0.1, 0.06, 3)
    collar = lathe(name + "_collar", [(0.0, 0.52), (0.36, 0.52), (0.38, 0.56), (0.36, 0.62), (0.0, 0.62)], 32, metal_mat)
    handle = lathe(name + "_handle", [(0.0, 0.6), (0.28, 0.6), (0.2, 0.8), (0.17, 1.05), (0.24, 1.3), (0.4, 1.55), (0.46, 1.78), (0.4, 2.0), (0.22, 2.14), (0.0, 2.18)], 36, wood_mat)
    parts += [rubber, block, collar, handle]
    return parts


def ink_pad(name, tin_mat, felt_color, w=2.9, d=2.0):
    """An ink pad with its lid off: a shallow tin, and the inked felt in it."""
    tin = box(name, (w, d, 0.26), tin_mat, 0.0, 0.07, 3)
    rim = prism(name + "_rim", rounded_rect(w - 0.16, d - 0.16, 0.12), 0.02, tin_mat, 0.262, 0.0)
    fm = Mat(name + "_felt")
    n, _ = fm.noise(fm.coords("Object"), 40.0, 2.0, 0.5)
    fm.set(base=felt_color, rough=0.9, sheen=0.9, sheen_rough=0.4, normal=fm.bump(n, 0.3, 0.004))
    felt = prism(name + "_felt", rounded_rect(w - 0.34, d - 0.34, 0.1), 0.03, fm.mat, 0.262, 0.012, 2)
    return [tin, rim, felt]


def inkwell(name, glass_mat, metal_mat, ink_mat):
    """A squat glass inkwell with a brass collar, full of ink."""
    body = lathe(name, [(0.0, 0.0), (0.7, 0.0), (0.78, 0.06), (0.78, 0.5), (0.6, 0.72), (0.34, 0.8), (0.34, 0.9), (0.26, 0.9), (0.26, 0.74), (0.0, 0.74)], 40, glass_mat)
    collar = lathe(name + "_collar", [(0.25, 0.86), (0.4, 0.86), (0.42, 0.92), (0.4, 0.98), (0.25, 0.98)], 32, metal_mat)
    ink = lathe(name + "_ink", [(0.0, 0.93), (0.25, 0.93)], 24, ink_mat)
    return [body, collar, ink]


def quill(name, vane_mat, shaft_mat, length=4.2):
    """A feather pen lying along +X, nib at the origin: a shaft, and a vane a little wider on one side, cupped."""
    shaft = tube(name + "_shaft", [Vector((length * t, 0.0, 0.03 + 0.1 * math.sin(math.pi * t))) for t in [i / 16 for i in range(17)]], [0.028 - 0.016 * i / 16 for i in range(17)], 8, shaft_mat)
    verts, faces = [], []
    n = 40
    for i in range(n + 1):
        t = i / n
        x = length * (0.2 + 0.8 * t)
        zc = 0.035 + 0.1 * math.sin(math.pi * (0.2 + 0.8 * t))
        env = math.sin(math.pi * t) ** 0.55
        notch = 1.0 - 0.3 * max(0.0, math.sin(t * 27.0)) ** 8
        up = 0.4 * env * notch
        dn = 0.27 * env * (1.0 - 0.25 * max(0.0, math.sin(t * 19.0 + 1.0)) ** 8)
        verts += [(x - 0.14 * up, up, zc + 0.1 * up), (x, 0.0, zc), (x - 0.1 * dn, -dn, zc + 0.08 * dn)]
    for i in range(n):
        a = i * 3
        faces += [(a, a + 1, a + 4, a + 3), (a + 1, a + 2, a + 5, a + 4)]
    vane = mesh_obj(name + "_vane", verts, faces, vane_mat, True)
    solidify(vane, 0.012, 0.0)
    subsurf(vane, 1)
    return [shaft, vane]


def feather_material(name="feather", color="#fbf7ee"):
    m = Mat(name)
    x, y, z = m.sep(m.coords("Object"))
    barbs = m.math("SINE", m.math("MULTIPLY", m.math("ADD", m.math("MULTIPLY", x, 1.0), m.math("ABSOLUTE", y)), 150.0))
    m.set(base=color, rough=0.6, sheen=0.6, sss=0.2, sss_scale=0.05, normal=m.bump(barbs, 0.35, 0.004))
    return m.mat


def glass_material(name="glass", tint="#ffffff", rough=0.02):
    """Clear glass that lets light through to what is under it: in its own shadow it is simply not there."""
    m = Mat(name)
    m.set(base=tint, rough=rough, trans=1.0, ior=1.45, spec=0.5)
    clear = m.node("ShaderNodeBsdfTransparent")
    path = m.node("ShaderNodeLightPath")
    mixer = m.node("ShaderNodeMixShader")
    m.nt.links.new(path.outputs["Is Shadow Ray"], mixer.inputs[0])
    m.nt.links.new(m.bsdf.outputs[0], mixer.inputs[1])
    m.nt.links.new(clear.outputs[0], mixer.inputs[2])
    m.nt.links.new(mixer.outputs[0], m.out.inputs["Surface"])
    return m.mat


def spectacles(name, metal_mat, lens_mat, r=0.56):
    """Round wire spectacles lying open on the desk, lenses up, arms folded behind them."""
    parts = []
    gap = 0.2
    for side in (-1, 1):
        cx = side * (r + gap / 2)
        rim = tube("%s_rim%d" % (name, side), [Vector((cx + r * math.cos(TAU * i / 40), r * math.sin(TAU * i / 40), 0.07)) for i in range(41)], 0.03, 8, metal_mat, cap=False)
        lens = lathe("%s_lens%d" % (name, side), [(0.0, 0.085), (r * 0.6, 0.08), (r - 0.02, 0.066), (r - 0.02, 0.058), (0.0, 0.058)], 40, lens_mat)
        place(lens, (cx, 0.0, 0.0))
        arm = tube("%s_arm%d" % (name, side), [Vector((side * (2 * r + gap / 2), 0.0, 0.07)), Vector((side * (2 * r + gap / 2 + 0.1), 0.18, 0.07)), Vector((side * (2 * r + gap / 2 - 0.25), 0.5, 0.05)),
                                                Vector((side * (0.5), 0.74, 0.04 + 0.03 * (side + 1))), Vector((side * (-0.9), 0.86, 0.04 + 0.03 * (side + 1))), Vector((side * (-1.4), 0.78, 0.03 + 0.03 * (side + 1)))], 0.024, 8, metal_mat)
        parts += [rim, lens, arm]
    bridge = tube(name + "_bridge", [Vector((gap / 2 * math.cos(math.pi * i / 10) * -1, 0.1 + 0.1 * math.sin(math.pi * i / 10), 0.07 + 0.04 * math.sin(math.pi * i / 10))) for i in range(11)], 0.028, 8, metal_mat)
    parts.append(bridge)
    return parts


def milk_glass(name, glass_mat, milk_mat, r=0.72, h=1.9):
    wall = 0.06
    body = lathe(name, [(0.0, 0.0), (r * 0.86, 0.0), (r * 0.9, 0.05), (r, h), (r - wall, h), (r * 0.9 - wall, 0.2), (0.0, 0.2)], 48, glass_mat)
    milk = lathe(name + "_milk", [(0.0, 0.21), (r * 0.9 - wall - 0.004, 0.21), (r - wall - 0.012, h * 0.82), (0.0, h * 0.82)], 40, milk_mat)
    return [body, milk]


def plate(name, mat, r=2.4, rim_mat=None, depth=0.16):
    """A plate: a flat well, a raised rim, glazed; an optional gilt line near its edge."""
    prof = [(0.0, 0.04), (r * 0.6, 0.04), (r * 0.66, 0.06), (r * 0.97, depth), (r, depth + 0.02), (r * 0.985, depth + 0.045), (r * 0.66, 0.1), (r * 0.6, 0.085), (0.0, 0.085)]
    prof = [(0.0, 0.0), (r * 0.62, 0.0), (r * 0.68, 0.03), (r * 0.985, depth), (r, depth + 0.025), (r * 0.975, depth + 0.045), (r * 0.67, 0.075), (r * 0.6, 0.05), (0.0, 0.05)]
    parts = [lathe(name, prof, 72, mat)]
    if rim_mat is not None:
        rr = r * 0.955
        zz = depth + 0.036
        parts.append(tube(name + "_gilt", [Vector((rr * math.cos(TAU * i / 96), rr * math.sin(TAU * i / 96), zz)) for i in range(97)], 0.016, 6, rim_mat, cap=False))
    return parts


def envelope(name, paper_mat, seal_mat, w=2.7, h=1.8):
    """A sealed letter lying face down: its flap a low triangle, a wax seal on the point."""
    body = prism(name, rounded_rect(w, h, 0.05), 0.035, paper_mat, 0.0, 0.006, 2)
    flap = mesh_obj(name + "_flap", [(-w / 2 + 0.03, h / 2 - 0.03, 0.036), (w / 2 - 0.03, h / 2 - 0.03, 0.036), (0.0, -h * 0.12, 0.052)], [(0, 2, 1)], paper_mat, False)
    solidify(flap, 0.012, 1.0)
    seal = lathe(name + "_seal", [(0.0, 0.05), (0.2, 0.05), (0.26, 0.07), (0.25, 0.1), (0.15, 0.115), (0.13, 0.1), (0.0, 0.1)], 24, seal_mat)
    place(seal, (0.0, -h * 0.12, 0.0))
    return [body, flap, seal]


def sleigh_bell(name, mat, dark_mat, r=0.42):
    ball = sphere(name, r, mat, 32, 16)
    place(ball, (0, 0, r))
    slit_a = box(name + "_slit_a", (r * 1.5, r * 0.11, 0.02), dark_mat, 0.0)
    place(slit_a, (0, -r * 0.3, 2 * r - 0.06), rot=(math.radians(-16), 0, 0))
    slit_b = box(name + "_slit_b", (r * 0.11, r * 1.1, 0.02), dark_mat, 0.0)
    place(slit_b, (0, -r * 0.3, 2 * r - 0.06), rot=(math.radians(-16), 0, 0))
    loop = tube(name + "_loop", [Vector((0.12 * r * math.cos(TAU * i / 16), r * 1.06 + 0.16 * r * math.sin(TAU * i / 16), r)) for i in range(17)], 0.03, 6, mat, cap=False)
    return [ball, slit_a, slit_b, loop]


def wax_seal(name, mat, r=0.5, emblem="heart"):
    """A blob of sealing wax pressed with a seal: a thick, soft, uneven rim, a flat middle, and a heart standing in it."""
    seg = 64
    verts, faces = [(0.0, 0.0, 0.05)], []
    rings = [(0.5, 0.05), (0.62, 0.052), (0.7, 0.085), (0.82, 0.1), (0.95, 0.085), (1.03, 0.045), (1.05, 0.0)]
    for (fr, zz) in rings:
        for j in range(seg):
            a_ = TAU * j / seg
            k = 1.0 + (0.06 * math.sin(5 * a_ + 0.7) + 0.035 * math.sin(8 * a_ + 2.1) + 0.02 * math.sin(13 * a_)) * (fr ** 3)
            verts.append((r * fr * k * math.cos(a_), r * fr * k * math.sin(a_), zz))
    for j in range(seg):
        faces.append((0, 1 + j, 1 + (j + 1) % seg))
    for ri in range(len(rings) - 1):
        for j in range(seg):
            a_, b_ = 1 + ri * seg + j, 1 + ri * seg + (j + 1) % seg
            faces.append((a_, a_ + seg, b_ + seg, b_))
    blob = mesh_obj(name, verts, faces, mat, True)
    parts = [blob]
    if emblem == "heart":
        pts = []
        for i in range(48):
            t = TAU * i / 48
            pts.append((0.0125 * r * 16 * math.sin(t) ** 3, 0.0125 * r * (13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)) + 0.03 * r))
        pts.reverse()
        heart = prism(name + "_heart", pts, 0.04, mat, 0.045, 0.016, 3)
        parts.append(heart)
    return parts


def leather(name, color, rough=0.5):
    m = Mat(name)
    obj = m.coords("Object")
    cells, _ = m.voronoi(obj, 26.0, "DISTANCE_TO_EDGE")
    soft, _ = m.noise(obj, 1.2, 3.0, 0.5)
    col = m.mix(m.math("MULTIPLY", soft, 0.18), color, (0.0, 0.0, 0.0, 1.0))
    m.set(base=col, rough=rough, coat=0.15, coat_rough=0.4, sheen=0.25, normal=m.bump(cells, 0.22, 0.004), spec=0.4)
    return m.mat


def desk_pad(name, w, d, mat, line_mat, inset=0.34, r=0.22):
    """A leather desk pad with a tooled gilt line just inside its edge."""
    pad = prism(name, rounded_rect(w, d, r, 8), 0.045, mat, 0.0, 0.012, 2)
    parts = [pad]
    outer = rounded_rect(w - 2 * inset, d - 2 * inset, r * 0.6, 8)
    inner = rounded_rect(w - 2 * inset - 0.07, d - 2 * inset - 0.07, r * 0.6 - 0.035, 8)
    n = len(outer)
    verts = [(x, y, 0.0462) for (x, y) in outer] + [(x, y, 0.0462) for (x, y) in inner]
    faces = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    parts.append(mesh_obj(name + "_line", verts, faces, line_mat, False))
    return parts


# --------------------------------------------------------------------------- the Thanksgiving table

def pumpkin(name, mat, stem_mat, r=1.0, lobes=9, squash=0.72, seed=1):
    """A little pumpkin: ribbed, flattened, dimpled where the stem grows, and the stem itself, twisted."""
    rnd = random.Random(seed)
    seg, rings = lobes * 8, 22
    verts, faces = [], []
    for i in range(rings + 1):
        v = i / rings
        phi = math.pi * v
        for j in range(seg):
            th = TAU * j / seg
            rib = 1.0 - 0.14 * abs(math.sin(lobes * th / 2.0)) ** 0.6 * math.sin(phi) ** 0.5
            rr = r * math.sin(phi) ** 0.82 * rib
            zz = r * squash * (-math.cos(phi)) * (1.0 - 0.16 * math.cos(phi) ** 8)
            if v > 0.86:
                zz -= r * 0.2 * ((v - 0.86) / 0.14) ** 2
            verts.append((rr * math.cos(th), rr * math.sin(th), zz + r * squash))
    for i in range(rings):
        for j in range(seg):
            a, b = i * seg + j, i * seg + (j + 1) % seg
            faces.append((a, b, b + seg, a + seg))
    body = mesh_obj(name, verts, faces, mat, True)
    top = r * squash * 2 - r * 0.2
    bend = rnd.uniform(-0.5, 0.5)
    path = [Vector((0.16 * r * math.sin(t * 2.2 + bend) * t, 0.2 * r * t * t, top - 0.05 * r + 0.62 * r * t)) for t in [i / 10 for i in range(11)]]
    stem = tube(name + "_stem", path, [0.17 * r * (1.0 - 0.5 * i / 10) for i in range(11)], 8, stem_mat)
    return [body, stem]


def pumpkin_material(name, color, dark=None):
    m = Mat(name)
    obj = m.coords("Object")
    n, _ = m.noise(obj, 3.0, 4.0, 0.6)
    col = m.mix(m.math("MULTIPLY", n, 0.3), color, dark or "#7a3a10")
    fine, _ = m.noise(obj, 30.0, 2.0, 0.5)
    m.set(base=col, rough=0.42, coat=0.25, coat_rough=0.3, sss=0.12, sss_scale=0.05, normal=m.bump(fine, 0.08, 0.004))
    return m.mat


MAPLE = [(0.0, -0.5), (0.05, -0.18), (0.3, -0.32), (0.26, -0.12), (0.56, -0.2), (0.48, 0.0), (0.72, 0.08), (0.44, 0.2), (0.5, 0.42), (0.26, 0.36), (0.2, 0.52), (0.08, 0.46), (0.0, 0.78)]


def maple_leaf(name, mat, size=1.0, seed=1):
    """A maple leaf, a little curled, its stalk behind it."""
    rnd = random.Random(seed)
    half = MAPLE[1:-1]
    outline = [MAPLE[0]] + half + [MAPLE[-1]] + [(-x, y) for (x, y) in reversed(half)]
    curl = rnd.uniform(0.12, 0.3)
    verts = [(0.0, 0.1 * size, 0.02)] + [(x * size, y * size, 0.02 + curl * size * (x * x + 0.4 * (y - 0.1) ** 2) + 0.03 * rnd.random()) for (x, y) in outline]
    n = len(outline)
    faces = [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)]
    leaf = mesh_obj(name, verts, faces, mat, True)
    solidify(leaf, 0.012, 0.0)
    stalk = tube(name + "_stalk", [Vector((0.0, -0.5 * size, 0.02)), Vector((0.02 * size, -0.72 * size, 0.03)), Vector((0.07 * size, -0.95 * size, 0.02))], 0.012 * size + 0.006, 6, mat)
    return [leaf, stalk]


def leaf_material(name, a, b):
    m = Mat(name)
    obj = m.coords("Object")
    n, _ = m.noise(obj, 4.0, 4.0, 0.6)
    x, y, z = m.sep(obj)
    vein = m.math("ABSOLUTE", m.math("SINE", m.math("MULTIPLY", m.math("ARCTAN2", m.math("ADD", y, 0.4), m.math("ABSOLUTE", x)), 9.0)))
    col = m.mix(n, a, b)
    m.set(base=col, rough=0.55, sss=0.2, sss_scale=0.03, normal=m.bump(vein, 0.12, 0.004))
    return m.mat


def acorn(name, nut_mat, cap_mat, s=1.0):
    nut = sphere(name, 0.2 * s, nut_mat, 20, 12, 1.35)
    place(nut, (0, 0, 0.2 * s), rot=(math.pi / 2, 0, 0))
    cap = lathe(name + "_cap", [(0.0, 0.0), (0.21 * s, 0.0), (0.225 * s, 0.07 * s), (0.18 * s, 0.16 * s), (0.06 * s, 0.2 * s), (0.03 * s, 0.26 * s), (0.0, 0.27 * s)], 20, cap_mat)
    place(cap, (0, 0.13 * s, 0.2 * s), rot=(-math.pi / 2, 0, 0))
    return [nut, cap]


def pie(name, crust_mat, filling_mat, cream_mat, tin_mat, r=2.6):
    """A pumpkin pie from above: a tin, a crimped crust, smooth filling, and a swirl of cream in the middle."""
    parts = []
    tin = lathe(name + "_tin", [(0.0, 0.0), (r * 0.86, 0.0), (r * 1.02, 0.42), (r * 1.06, 0.44), (r * 1.06, 0.47), (r * 1.0, 0.47), (r * 0.85, 0.05), (0.0, 0.05)], 64, tin_mat)
    parts.append(tin)
    seg = 96
    crimps = 30
    verts, faces = [], []
    rings = [(0.84, 0.36), (0.9, 0.5), (0.97, 0.56), (1.04, 0.52), (1.06, 0.44)]
    for (fr, zz) in rings:
        for j in range(seg):
            a = TAU * j / seg
            wave = 1.0 + 0.035 * math.sin(crimps * a) * (1.0 if fr > 0.88 else 0.2)
            verts.append((r * fr * wave * math.cos(a), r * fr * wave * math.sin(a), zz + 0.05 * math.sin(crimps * a) * (1.0 if 0.88 < fr < 1.05 else 0.0)))
    for ri in range(len(rings) - 1):
        for j in range(seg):
            a, b = ri * seg + j, ri * seg + (j + 1) % seg
            faces.append((a, b, b + seg, a + seg))
    parts.append(mesh_obj(name + "_crust", verts, faces, crust_mat, True))
    fill = lathe(name + "_filling", [(0.0, 0.4), (r * 0.5, 0.4), (r * 0.8, 0.39), (r * 0.87, 0.37)], 64, filling_mat)
    parts.append(fill)
    # the cream: a soft swirl, wide at the bottom, a peak in the middle
    cv, cf = [], []
    cseg, layers = 40, 14
    for li in range(layers + 1):
        t = li / layers
        rr = r * 0.3 * (1.0 - t) ** 0.8
        for j in range(cseg):
            a = TAU * j / cseg + t * 2.6
            flute = 1.0 + 0.16 * math.sin(7 * (TAU * j / cseg))
            cv.append((rr * flute * math.cos(a), rr * flute * math.sin(a), 0.4 + 0.55 * r * 0.3 * t ** 0.8))
    for li in range(layers):
        for j in range(cseg):
            a, b = li * cseg + j, li * cseg + (j + 1) % cseg
            cf.append((a, b, b + cseg, a + cseg))
    parts.append(mesh_obj(name + "_cream", cv, cf, cream_mat, True))
    return parts


def crust_material(name="crust"):
    m = Mat(name)
    obj = m.coords("Object")
    n, _ = m.noise(obj, 5.0, 4.0, 0.6)
    col = m.ramp(n, [(0.3, "#b8773a"), (0.55, "#e0a85e"), (0.8, "#c98a44")])
    m.set(base=col, rough=0.75, sss=0.2, sss_scale=0.04, normal=m.bump(n, 0.4, 0.02))
    return m.mat


def cutlery(name, mat, kind="fork", length=4.6):
    """A fork or a knife lying along Y, its head up the table."""
    if kind == "fork":
        hw, tw = 0.16, 0.3
        outline = [(-0.1, -length / 2), (0.1, -length / 2), (hw * 0.6, length * 0.05), (0.09, length * 0.2), (tw, length * 0.28)]
        tines = 4
        gap = (2 * tw) / (tines * 2 - 1)
        top = length / 2
        for k in range(tines):
            x_r = tw - k * 2 * gap
            x_l = x_r - gap
            outline += [(x_r, top - 0.06), (x_r - gap * 0.2, top), (x_l + gap * 0.2, top), (x_l, top - 0.06)]
            if k < tines - 1:
                outline += [(x_l, length * 0.32), (x_l - gap, length * 0.32)]
        outline += [(-tw, length * 0.28), (-0.09, length * 0.2), (-hw * 0.6, length * 0.05)]
    else:
        outline = [(-0.11, -length / 2), (0.11, -length / 2), (0.14, -length * 0.05), (0.12, 0.0), (0.2, length * 0.04)]
        for i in range(13):
            t = i / 12
            outline.append((0.2 - 0.03 * t - 0.3 * t ** 5, length * (0.04 + 0.46 * t)))
        outline += [(-0.13, length * 0.5 - 0.1), (-0.13, 0.0)]
    ob = prism(name, outline, 0.045, mat, 0.0, 0.014, 2)
    return [ob]


def napkin(name, mat, w=2.6, h=4.4):
    """A folded linen napkin: a soft rectangle, a fold line down it, its corners not quite square."""
    nx, ny = 24, 40
    verts = []
    for j in range(ny + 1):
        for i in range(nx + 1):
            u, v = i / nx * 2 - 1, j / ny * 2 - 1
            x = (w / 2) * u * (1.0 + 0.012 * math.sin(v * 5.0))
            y = (h / 2) * v * (1.0 + 0.01 * math.sin(u * 4.0))
            zz = 0.05 + 0.03 * mnoise.noise(Vector((x * 0.8, y * 0.8, 1.7))) + 0.035 * (1 - abs(u) ** 6) * (1 - abs(v) ** 8) + 0.02 * math.exp(-((u - 0.25) * 9) ** 2)
            verts.append((x, y, zz))
    faces = [(j * (nx + 1) + i, j * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i) for j in range(ny) for i in range(nx)]
    ob = mesh_obj(name, verts, faces, mat, True)
    solidify(ob, 0.05, 1.0)
    return [ob]


def tealight(name, cup_mat, wax_mat, flame_mat, wick_mat, r=0.5):
    """A tealight: a little metal cup of wax, a wick, and a flame."""
    cup = lathe(name, [(0.0, 0.0), (r, 0.0), (r, 0.36), (r - 0.025, 0.36), (r - 0.025, 0.03), (0.0, 0.03)], 36, cup_mat)
    wax = lathe(name + "_wax", [(0.0, 0.3), (r * 0.5, 0.29), (r - 0.03, 0.31)], 32, wax_mat)
    wick = tube(name + "_wick", [Vector((0, 0, 0.29)), Vector((0.01, 0, 0.42))], 0.012, 6, wick_mat)
    flame = lathe(name + "_flame", [(0.0, 0.4), (0.06, 0.44), (0.085, 0.52), (0.06, 0.64), (0.025, 0.74), (0.0, 0.8)], 16, flame_mat)
    return [cup, wax, wick, flame]


def wishbone_point(side, t, arm=4.6, spread=2.35, r=0.13):
    """Where an arm's middle line is, `t` of the way from inside the head (0) to its tip (1); `side` is -1 for the left arm."""
    return Vector((side * (0.12 + spread * t ** 1.2 + 0.3 * math.sin(math.pi * t)), 0.12 - (arm + 0.12) * t, r * 1.02 + 0.02 * math.sin(math.pi * t)))


def wishbone_parts(name, mat, arm=4.6, spread=2.35, r=0.13):
    """
    A wishbone lying on a plate, its joint up the table, in three pieces that are rendered apart: the
    head (the flat blade the two arms grow from) and each arm whole, from inside the head to its tip.
    Built round the joint (0, 0). Returns (head parts, left arm, right arm, the two tips).
    """
    n = 33
    radii = []
    for i in range(n):
        t = i / (n - 1)
        # thick where it leaves the head, slender along its length, a small knuckle at the tip
        knuckle = 0.5 * math.exp(-((t - 0.965) / 0.045) ** 2)
        radii.append(r * (1.25 - 0.4 * t ** 0.5 + knuckle))
    arms, tips = [], []
    for side in (-1, 1):
        path = [wishbone_point(side, i / (n - 1), arm, spread, r) for i in range(n)]
        arms.append(tube("%s_arm%d" % (name, side), path, radii, 16, mat, flat=0.85))
        tips.append(path[-1])
    blade = sphere(name + "_blade", 1.0, mat, 32, 16)
    place(blade, (0.0, 0.34, r * 1.0), scale=(0.36, 0.56, r * 1.1))
    crest = sphere(name + "_crest", 1.0, mat, 24, 12)
    place(crest, (0.0, 0.94, r * 0.85), scale=(0.15, 0.34, r * 0.8))
    return [blade, crest], arms[0], arms[1], tips


def bone_material(name="bone"):
    """A dried wishbone: ivory gone a little tan, smooth, faintly see-through at its thin places."""
    m = Mat(name)
    obj = m.coords("Object")
    n, _ = m.noise(obj, 2.2, 4.0, 0.6)
    fine, _ = m.noise(obj, 40.0, 2.0, 0.5)
    col = m.ramp(n, [(0.3, "#d8bf92"), (0.6, "#eedfba"), (0.85, "#e0ca9c")])
    m.set(base=col, rough=0.36, sss=0.3, sss_scale=0.08, coat=0.3, coat_rough=0.25, normal=m.bump(fine, 0.06, 0.003))
    return m.mat


def woven_mat(name, color="#c9a56a", dark="#9a7440"):
    """A round woven placemat: rings of plaited fibre."""
    m = Mat(name)
    x, y, z = m.sep(m.coords("Object"))
    rad = m.math("SQRT", m.math("ADD", m.math("MULTIPLY", x, x), m.math("MULTIPLY", y, y)))
    ang = m.math("ARCTAN2", y, x)
    rings = m.math("SINE", m.math("MULTIPLY", rad, 26.0))
    plait = m.math("SINE", m.math("ADD", m.math("MULTIPLY", ang, 90.0), m.math("MULTIPLY", m.math("FLOOR", m.math("MULTIPLY", rad, 26.0 / TAU)), 1.7)))
    h = m.math("ADD", m.math("MULTIPLY", rings, 0.6), m.math("MULTIPLY", plait, 0.4))
    col = m.mix(m.math("MULTIPLY", m.math("ADD", h, 1.0), 0.5), dark, color)
    m.set(base=col, rough=0.8, sheen=0.3, normal=m.bump(h, 0.6, 0.02))
    return m.mat


def cranberries(name, mat, n=7, r=0.16, spread=0.7, seed=2):
    rnd = random.Random(seed)
    parts = []
    for i in range(n):
        a = rnd.uniform(0, TAU)
        d = rnd.uniform(0.0, spread)
        b = sphere("%s_%d" % (name, i), r * rnd.uniform(0.85, 1.1), mat, 18, 10)
        place(b, (d * math.cos(a), d * math.sin(a), r))
        parts.append(b)
    return parts


# ------------------------------------------------------------------------------ the note's paper

def letter_paper(name="letter_paper", base="#fbf5e8", warm="#f1e6cf"):
    """Heavy cream writing paper: nearly even, a faint cloud in its tone and a fine tooth."""
    m = Mat(name)
    obj = m.coords("Object")
    big, _ = m.noise(obj, 0.5, 4.0, 0.6)
    col = m.ramp(big, [(0.35, warm), (0.65, base)])
    fibre, _ = m.noise(obj, 40.0, 3.0, 0.6)
    m.set(base=col, rough=0.72, sss=0.06, sss_scale=0.05, spec=0.3, normal=m.bump(fibre, 0.08, 0.004))
    return m.mat


def letter_sheet(name, mat, width, length, line_mat=None, inset=0.4, seed=7):
    """A sheet of writing paper lying from y = 0 down to -length: stiff, all but flat. With `line_mat`, a fine foil line runs round it a little inside its edge."""
    nx, ny = 24, int(length / 0.2)
    verts = []
    for j in range(ny + 1):
        y = -length * j / ny
        for i in range(nx + 1):
            u = i / nx * 2.0 - 1.0
            zz = 0.012 + 0.012 * (0.5 + 0.5 * mnoise.noise(Vector((u * 2.0, y * 0.35, seed))))
            verts.append(((width / 2.0) * u, y, zz))
    faces = [(j * (nx + 1) + i, (j + 1) * (nx + 1) + i, (j + 1) * (nx + 1) + i + 1, j * (nx + 1) + i + 1) for j in range(ny) for i in range(nx)]
    parts = [mesh_obj(name, verts, faces, mat, True)]
    if line_mat:
        outline = rounded_rect(width - 2 * inset, length - 2 * inset, 0.16, 6)
        path = [Vector((x, y - length / 2.0, 0.034)) for (x, y) in outline]
        path.append(path[0])
        parts.append(tube(name + "_line", path, 0.016, 6, line_mat, cap=False))
    return parts


def receipt_paper(name, mat, width, length, teeth=26, seed=9):
    """A till receipt lying from y = 0 down to -length: thin paper with a slow wave left in it by the roll, torn off against a saw edge at both ends."""
    nx = teeth * 2
    ny = int(length / 0.14)
    tooth = width / teeth * 0.5
    verts = []
    for j in range(ny + 1):
        t = j / ny
        y = -length * t
        for i in range(nx + 1):
            u = i / nx * 2.0 - 1.0
            yy = y
            if j == 0 and i % 2:
                yy += tooth
            if j == ny and i % 2:
                yy -= tooth
            wave = 0.03 * (0.5 + 0.5 * math.sin(t * TAU * 1.5 + 0.8))
            zz = 0.012 + wave + 0.01 * mnoise.noise(Vector((u * 1.5, y * 0.5, seed))) + 0.02 * abs(u) ** 6
            verts.append(((width / 2.0) * u, yy, zz))
    faces = [(j * (nx + 1) + i, (j + 1) * (nx + 1) + i, (j + 1) * (nx + 1) + i + 1, j * (nx + 1) + i + 1) for j in range(ny) for i in range(nx)]
    return [mesh_obj(name, verts, faces, mat, True)]


def foil_tape(name="foil_tape", color="#f6d488"):
    """Gold glitter tape: foil in a thousand small flakes, each turned its own way, so some of them always catch the light."""
    m = Mat(name)
    obj = m.coords("Object")
    flakes, _ = m.voronoi(obj, 150.0)
    crinkle, _ = m.noise(obj, 6.0, 3.0, 0.55)
    height = m.math("ADD", m.math("MULTIPLY", flakes, 0.8), m.math("MULTIPLY", crinkle, 0.4))
    m.set(base=color, metal=1.0, rough=0.24, normal=m.bump(height, 0.9, 0.006))
    return m.mat


def tape_strip(name, mat, length=2.4, width=0.62, teeth=6, seed=4):
    """A torn-off length of paper tape lying along X, its two ends cut on the dispenser's saw edge."""
    nx = 30
    ny = teeth * 2
    tooth = width / teeth * 0.5
    verts = []
    for i in range(nx + 1):
        x = -length / 2.0 + length * i / nx
        for j in range(ny + 1):
            v = j / ny * 2.0 - 1.0
            xx = x
            if i == 0 and j % 2:
                xx -= tooth
            if i == nx and j % 2:
                xx += tooth
            zz = 0.008 + 0.005 * (0.5 + 0.5 * mnoise.noise(Vector((x * 2.2, v * 1.5, seed))))
            verts.append((xx, (width / 2.0) * v, zz))
    faces = [(i * (ny + 1) + j, (i + 1) * (ny + 1) + j, (i + 1) * (ny + 1) + j + 1, i * (ny + 1) + j + 1) for i in range(nx) for j in range(ny)]
    return [mesh_obj(name, verts, faces, mat, True)]
