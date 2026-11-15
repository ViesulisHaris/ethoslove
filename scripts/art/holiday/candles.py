"""
Light the Candles: a Thanksgiving table at dusk, five candles down its middle, seen across the table through a lens.

    blender --background --factory-startup --python candles.py -- --out <dir> [--preview] [--look harvest] [--only dark,lit,each]

Per look it renders the same view seven times: with no candle lit (the room by what is left of the day
through the window), with each candle alone lit, and with all five. pack.mjs turns each "alone" picture
into what that candle adds to the dark one, which the gift lays over it as the candle catches.
Lengths are in decimetres (a pumpkin of radius 1 is 10 cm), so the other scenes' props fit.
"""

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import kit  # noqa: E402
from kit import TAU, box, cloth, emissive, glow, lathe, layer, mesh_obj, parent, place, plain, reset, sphere, tube, wood  # noqa: E402
import persp  # noqa: E402
import props  # noqa: E402
import props_desk as desk  # noqa: E402

TABLE_Z = 7.5
ROW_Y = 3.5
# each candle: where along the table, its kind, its radius and its height
CANDLES = [(-1.75, "pillar", 0.27, 1.55), (-0.88, "taper", 0.105, 2.7), (0.0, "pillar", 0.34, 1.1), (0.88, "taper", 0.105, 3.1), (1.75, "pillar", 0.27, 1.95)]
HOLDER_H = 0.55

LOOKS = {
    "harvest": dict(wall="#20332f", wall2="#16241f", runner=("#a4472a", None, None), table=("#6a4426", "#3a2414"), pumpkins=["#d9702a", "#efe2c6", "#c8561a"], leaves=[("#b5341f", "#e07a2a"), ("#d9902a", "#f0c24a"), ("#8a2a1a", "#c4502a")], curtain="#6a2a1e"),
    "linen": dict(wall="#4a3d33", wall2="#352b23", runner=("#e6dcc6", None, None), table=("#8a6240", "#4e3420"), pumpkins=["#efe2c6", "#c9d2b0", "#e0b070"], leaves=[("#b98a3a", "#e3c26a"), ("#7a8a4a", "#b5b56a"), ("#c8703a", "#e3a25a")], curtain="#8a8a6a"),
    "plum": dict(wall="#3a1f30", wall2="#261220", runner=("#f1e6d2", "#6a1f2e", "#4a121e"), table=("#4a2c1c", "#26140c"), pumpkins=["#efe2c6", "#d9a441", "#c8692a"], leaves=[("#8a2a1a", "#c4502a"), ("#c98a2a", "#f0c24a"), ("#6a1f1a", "#a8402a")], curtain="#4a1a2a"),
}


def wax_material(name="wax", color="#f6ecd6"):
    m = kit.Mat(name)
    obj = m.coords("Object")
    n, _ = m.noise(obj, 6.0, 3.0, 0.6)
    m.set(base=color, rough=0.45, sss=0.9, sss_scale=0.25, spec=0.4, normal=m.bump(n, 0.05, 0.02))
    return m.mat


def flame_material(name="flame"):
    """A candle flame: blue where it leaves the wick, white hot in its body, orange at its tip. It is its own light."""
    m = kit.Mat(name)
    x, y, z = m.sep(m.coords("Object"))
    col = m.ramp(z, [(0.0, "#2a50ff"), (0.08, "#ffe9b0"), (0.3, "#fff6dc"), (0.5, "#ffb030"), (0.62, "#ff7a10")])
    m.set(base=(0, 0, 0, 1), emit=col, emit_strength=m.math("MULTIPLY", m.ramp(z, [(0.0, "#404040"), (0.2, "#ffffff"), (0.6, "#808080")]), 20.0), rough=1.0)
    return m.mat


def candle(i, x, kind, r, h, wax, brass):
    """One candle standing on the table, and (in a layer of its own) its flame and the light it gives."""
    base = Vector((x, ROW_Y, TABLE_Z))
    layer("table")
    parts = []
    foot = 0.0
    if kind == "taper":
        prof = [(0.0, 0.0), (0.42, 0.0), (0.45, 0.04), (0.2, 0.1), (0.1, 0.22), (0.09, 0.36), (0.2, 0.42), (0.21, 0.5), (0.16, HOLDER_H), (0.0, HOLDER_H)]
        parts.append(lathe("holder%d" % i, prof, 48, brass))
        foot = HOLDER_H - 0.06
        prof = [(0.0, 0.0), (r, 0.0), (r * 0.94, h * 0.6), (r * 0.62, h - 0.05), (r * 0.3, h), (0.0, h - 0.02)]
    else:
        # a pillar with a hollow burnt into its top, its rim uneven
        prof = [(0.0, 0.0), (r, 0.0), (r, h - 0.06), (r * 0.93, h), (r * 0.78, h - 0.02), (r * 0.5, h - 0.14), (0.0, h - 0.17)]
    body = lathe("candle%d" % i, prof, 48, wax)
    if kind == "pillar":
        kit.displace(body, 0.02, 0.6)
    place(body, (0, 0, foot))
    parts.append(body)
    top = foot + (h if kind == "taper" else h - 0.16)
    wick = tube("wick%d" % i, [Vector((0, 0, top - 0.03)), Vector((0.01, 0.0, top + 0.06)), Vector((0.025, 0.0, top + 0.12))], 0.012, 6, plain("wick", "#1a120a", 0.9))
    parts.append(wick)
    parent(parts, "candle_pivot%d" % i, base)
    tip = base + Vector((0.02, 0.0, top + 0.12))
    persp.anchor("wick%d" % i, tip + Vector((0, 0, 0.12)))
    persp.anchor("foot%d" % i, base)
    layer("flame%d" % i)
    f = lathe("flame%d" % i, [(0.0, 0.0), (0.035, 0.03), (0.06, 0.1), (0.064, 0.18), (0.045, 0.32), (0.02, 0.44), (0.0, 0.52)], 20, flame_material("flame_mat%d" % i))
    place(f, tip + Vector((0, 0, -0.02)))
    persp.point("glow%d" % i, tip + Vector((0, -0.02, 0.2)), CANDLE_W, (1.0, 0.62, 0.3), 0.05)


def table(look):
    L = LOOKS[look]
    layer("table")
    oak = wood("table_wood", L["table"][0], L["table"][1], 1.4, 0.62, along="X")
    # seen at a low angle, a varnished top would be a mirror for the window: this one is oiled, not varnished
    bsdf = next(n for n in oak.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Coat Weight"].default_value = 0.0
    bsdf.inputs["Specular IOR Level"].default_value = 0.2
    top = box("tabletop", (70.0, 15.0, 0.4), oak, 0.0, 0.03, 2)
    place(top, (0, 4.0, TABLE_Z - 0.4))
    c, check, check2 = L["runner"]
    mat = cloth("runner", c, 30.0, 0.9, 0.8, check, 0.35, check2) if check else cloth("runner", c, 30.0, 0.9, 0.8)
    run = desk.napkin("runner_cloth", mat, 70.0, 5.2)
    parent(run, "runner_pivot", Vector((0, ROW_Y + 0.2, TABLE_Z - 0.04)))


def dressing(look, seed=6):
    """What is on the table besides: little pumpkins, leaves, acorns, berries, boughs behind the candles, a matchbox; glasses and plates further along for wide screens."""
    L = LOOKS[look]
    rnd = random.Random(seed)
    layer("table")
    stem = plain("stem", "#6a5a30", 0.8)
    skins = [desk.pumpkin_material("pumpkin_skin%d" % i, c) for i, c in enumerate(L["pumpkins"])]
    for i, (x, y, r, k) in enumerate(((-2.75, 2.2, 0.62, 1), (2.8, 2.6, 0.72, 0), (-4.6, 4.2, 1.0, 0), (4.9, 3.6, 0.9, 2), (-7.5, 3.0, 0.8, 2), (8.0, 4.4, 1.1, 1), (-11.5, 4.0, 1.2, 0), (12.5, 3.0, 0.9, 0), (3.9, 1.2, 0.42, 1), (-1.2, 1.3, 0.36, 2))):
        parent(desk.pumpkin("pumpkin%d" % i, skins[k % len(skins)], stem, r, 9 if r > 0.6 else 8, 0.74, i + 3), "pumpkin_pivot%d" % i, Vector((x, y, TABLE_Z)), rnd.uniform(0, TAU))
    leaves = [desk.leaf_material("leaf_skin%d" % i, a, b) for i, (a, b) in enumerate(L["leaves"])]
    for i in range(46):
        x = rnd.uniform(-16, 16)
        y = rnd.uniform(-1.6, 6.5)
        if abs(x) < 2.4 and 2.9 < y < 4.1:
            continue
        parent(desk.maple_leaf("leaf%d" % i, leaves[i % len(leaves)], rnd.uniform(0.34, 0.6), i + 1), "leaf_pivot%d" % i, Vector((x, y, TABLE_Z + 0.01 + 0.01 * (i % 3))), rnd.uniform(0, TAU))
    nut = plain("acorn_nut", "#8a5a2a", 0.4, coat=0.3)
    cup = plain("acorn_cap", "#5a3c1c", 0.9)
    for i in range(12):
        parent(desk.acorn("acorn%d" % i, nut, cup, 0.62), "acorn_pivot%d" % i, Vector((rnd.uniform(-9, 9), rnd.uniform(-1.0, 2.6), TABLE_Z)), rnd.uniform(0, TAU))
    berry = props.glass_paint("cranberry", "#a01420", 0.2)
    for i in range(7):
        parent(desk.cranberries("cran%d" % i, berry, rnd.randint(3, 6), 0.075, 0.3, i + 2), "cran_pivot%d" % i, Vector((rnd.uniform(-7, 7), rnd.uniform(-0.6, 2.4), TABLE_Z)))
    # boughs laid along the runner behind and between the candles
    needles = props.needle_material("bough_needles", "#1c3320", "#3f5f3a")
    twig = plain("bough_stem", "#4a3422", 0.8)
    for i in range(9):
        b = props.pine_branch("bough%d" % i, needles, twig, 3.0, 20 + i, 7, 0.18, 1.0)
        parent(b, "bough_pivot%d" % i, Vector((-9.5 + i * 2.3, ROW_Y + 0.9 + 0.3 * math.sin(i * 1.9), TABLE_Z + 0.03)), math.radians(rnd.uniform(-14, 14)), 0.8)
    # a box of matches lying where the hand would reach for it
    card = plain("matchbox_card", "#b8322a", 0.6)
    tray = [box("matchbox", (0.95, 0.6, 0.26), card, 0.0, 0.02, 2), box("matchbox_strike", (0.95, 0.02, 0.2), plain("striker", "#4a2a20", 0.9), 0.03)]
    place(tray[1], (0, -0.3, 0))
    parent(tray, "matchbox_pivot", Vector((1.55, 0.7, TABLE_Z)), math.radians(-18))
    # for wide screens: a place setting either side, a glass of wine, a pie
    china = props.glass_paint("china", "#fbf6ec", 0.14)
    glass = desk.glass_material("wine_glass", "#ffffff", 0.02)
    wine = plain("wine", "#5a0f1e", 0.05, coat=0.5)
    for side in (-1, 1):
        parent(desk.plate("plate%d" % side, china, 1.35, kit.gold("gilt%d" % side, "#e8c06a", 0.25)), "plate_pivot%d" % side, Vector((side * 6.6, 0.4, TABLE_Z)))
        g = [lathe("glass%d" % side, [(0.0, 0.0), (0.32, 0.0), (0.33, 0.03), (0.04, 0.08), (0.035, 0.9), (0.3, 1.2), (0.42, 1.6), (0.4, 2.1), (0.385, 2.1), (0.4, 1.6), (0.28, 1.24), (0.0, 1.0)], 40, glass),
             lathe("wine%d" % side, [(0.0, 1.02), (0.27, 1.25), (0.39, 1.6), (0.0, 1.6)], 32, wine)]
        parent(g, "glass_pivot%d" % side, Vector((side * 5.2, 2.4, TABLE_Z)))
    pie = desk.pie("pie", desk.crust_material("crust"), plain("pie_filling", "#b5602a", 0.35, coat=0.3, sss=0.2), plain("pie_cream", "#fffaf0", 0.5, sss=0.5, sss_scale=0.2), plain("pie_tin", "#b9bcc2", 0.3, 1.0), 1.5)
    parent(pie, "pie_pivot", Vector((-9.6, 2.2, TABLE_Z)))


def room(look):
    """Behind the table: a dark wall, a tall window with the last of the day in it, curtains, a string of small lights round the frame."""
    L = LOOKS[look]
    layer("table")
    m = kit.Mat("wall")
    obj = m.coords("Object")
    n, _ = m.noise(obj, 0.3, 4.0, 0.6)
    m.set(base=m.ramp(n, [(0.3, L["wall2"]), (0.7, L["wall"])]), rough=0.9)
    wy = 24.0
    x0, x1, z0, z1 = -5.2, 5.2, 9.2, 26.0
    for (name, a, b, c, d) in (("wall_l", -80, x0, -5, 40), ("wall_r", x1, 80, -5, 40), ("wall_t", x0, x1, z1, 40), ("wall_b", x0, x1, -5, z0)):
        mesh_obj(name, [(a, wy, c), (b, wy, c), (b, wy, d), (a, wy, d)], [(0, 1, 2, 3)], m.mat, smooth=False)
    # the sky in the window: night above, a band of orange where the sun went down
    sky = kit.Mat("dusk")
    sx, sy, sz = sky.sep(sky.coords("Object"))
    up = sky.math("DIVIDE", sky.math("SUBTRACT", sz, z0), z1 - z0)
    sky.set(base=(0, 0, 0, 1), emit=sky.ramp(up, [(0.0, "#f08a3a"), (0.13, "#b0507a"), (0.36, "#2a3a7a"), (1.0, "#0a1230")]), emit_strength=0.55, rough=1.0)
    mesh_obj("dusk_sky", [(x0 - 1, wy + 3.0, z0 - 1), (x1 + 1, wy + 3.0, z0 - 1), (x1 + 1, wy + 3.0, z1 + 1), (x0 - 1, wy + 3.0, z1 + 1)], [(0, 1, 2, 3)], sky.mat, smooth=False)
    # bare trees against it
    bark = plain("far_tree", "#0c0a10", 0.9)
    rnd = random.Random(4)
    for k in range(5):
        tx = x0 + (x1 - x0) * (k + 0.5) / 5 + rnd.uniform(-0.5, 0.5)
        trunk = [Vector((tx + 0.25 * math.sin(t * 2.0 + k), wy + 2.4, z0 - 1 + t * rnd.uniform(7, 11))) for t in [i / 8 for i in range(9)]]
        tube("far_trunk%d" % k, trunk, [0.22 * (1 - 0.8 * i / 8) for i in range(9)], 6, bark)
        for b in range(7):
            p = trunk[2 + b % 6]
            tip = p + Vector((rnd.uniform(-2.2, 2.2), 0, rnd.uniform(0.8, 3.0)))
            tube("far_branch%d_%d" % (k, b), [p, (p + tip) / 2 + Vector((0, 0, 0.3)), tip], [0.08, 0.05, 0.015], 5, bark)
    # the frame and its bars
    paint = plain("frame_paint", "#d9d2c4", 0.5)
    for (name, cx, cz, w, h) in (("fr_l", x0, (z0 + z1) / 2, 0.5, z1 - z0 + 0.5), ("fr_r", x1, (z0 + z1) / 2, 0.5, z1 - z0 + 0.5), ("fr_b", 0, z0, x1 - x0 + 0.5, 0.5), ("fr_t", 0, z1, x1 - x0 + 0.5, 0.5),
                                 ("bar_v", 0, (z0 + z1) / 2, 0.22, z1 - z0), ("bar_h1", 0, z0 + 5.6, x1 - x0, 0.22), ("bar_h2", 0, z0 + 11.2, x1 - x0, 0.22)):
        b = box(name, (w, 0.5, h), paint, cz - h / 2, 0.03, 1)
        place(b, (cx, wy - 0.1, 0))
    # curtains either side
    cur = cloth("curtain", L["curtain"], 26.0, 0.9, 0.9)
    for side in (-1, 1):
        nx, ny = 30, 30
        verts = []
        for j in range(ny + 1):
            v = j / ny
            zz = 30.0 - 26.0 * v
            for i in range(nx + 1):
                u = i / nx
                verts.append((side * (x1 + 0.4 + u * 5.5), wy - 0.8 - 0.35 * math.sin(u * TAU * 4.0 + v), zz))
        faces = [(j * (nx + 1) + i, j * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i) for j in range(ny) for i in range(nx)]
        mesh_obj("curtain%d" % side, verts, faces, cur, True)
    # a string of small warm lights round the window, always on: far enough back to be soft discs
    wire = plain("wire", "#1a160e", 0.6)
    bulb = emissive("bulb", "#ffc878", 14.0)
    socket = plain("socket", "#2a2418", 0.5)
    pts = [Vector((x0 - 1.4, wy - 1.2, z0 + 1.0)), Vector((x0 - 1.0, wy - 1.2, z0 + 8.0)), Vector((x0 - 1.2, wy - 1.2, 22.0)), Vector((-2.5, wy - 1.2, 24.6)), Vector((0, wy - 1.2, 23.6)), Vector((2.5, wy - 1.2, 24.6)), Vector((x1 + 1.2, wy - 1.2, 22.0)), Vector((x1 + 1.0, wy - 1.2, z0 + 8.0)), Vector((x1 + 1.4, wy - 1.2, z0 + 1.0))]
    props.fairy_lights("window_lights", pts, wire, bulb, socket, 1.3, 0.11, 9)


CANDLE_W = 800.0
OPT = kit.cli()
CAM_AT = (0.0, -14.4, 10.9)
LOOK_AT = (0.0, ROW_Y, 9.95)
FLAMES = tuple("flame%d" % i for i in range(len(CANDLES)))


def build(look):
    reset()
    kit.MANIFEST["bulbs"] = []
    persp.setup(CAM_AT, LOOK_AT, lens=35.0, ppk=10.0, samples=OPT["samples"] or 260, preview=OPT["preview"], exposure=0.6, fstop=0.22, focus=(0.0, ROW_Y - 0.3, 9.0))
    persp.world_night("#0c1230", "#1a2040", 0.12)
    layer("lights")
    # what is left of the day, through the window and down onto the table from behind; and a breath of it from the room
    persp.area("window_light", (0.0, 20.0, 19.0), (0.0, 2.0, TABLE_Z), 2000.0, 9.0, (0.5, 0.62, 1.0))
    persp.area("room_fill", (-8.0, -14.0, 16.0), (0.0, 3.0, 8.5), 170.0, 14.0, (0.7, 0.78, 1.0), shadow=False)
    table(look)
    room(look)
    dressing(look)
    wax = wax_material()
    brass = plain("brass", "#c9a050", 0.28, 1.0)
    for i, (x, kind, r, h) in enumerate(CANDLES):
        candle(i, x, kind, r, h, wax, brass)
    glow(2.2, 7)


def main():
    out = OPT["out"]
    looks = OPT["look"] or list(LOOKS)
    only = OPT["only"] or ["dark", "each", "lit"]
    for look in looks:
        build(look)
        if "dark" in only:
            persp.render(os.path.join(out, "plate-%s-dark-wide.png" % look), hide=FLAMES)
        if "each" in only:
            for i in range(len(CANDLES)):
                persp.render(os.path.join(out, "only-%s-%d.png" % (look, i)), hide=tuple(f for k, f in enumerate(FLAMES) if k != i))
        if "lit" in only:
            persp.render(os.path.join(out, "plate-%s-lit-wide.png" % look))
    persp.save(os.path.join(out, "manifest.json"), lights={look: ["only-%s-%d" % (look, i) for i in range(len(CANDLES))] for look in LOOKS}, persp=True)


main()
