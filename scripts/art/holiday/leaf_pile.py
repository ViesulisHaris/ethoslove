"""
Leaf Pile's ground: a card left on a porch in autumn, and the leaves that blew over it.

    blender --background --factory-startup --python leaf_pile.py -- --out <dir> [--preview] [--look deck] [--only beauty]

Makes, per look, the plate for phones and for wide screens (the card in the middle, bare; leaves
fallen round the edges; a rake, a mug, pumpkins) and the same ground out of focus (for the note), and
once for all looks the sprites: twelve loose leaves (three kinds in four colours), each lit from
straight above so that its soft shadow sits under it whichever way the gift turns it, the note's
paper, and a twig for holding the photos down.
"""

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402
from mathutils import noise as mnoise  # noqa: E402

import kit  # noqa: E402
from kit import (TAU, anchor, at, box, catcher, cloth, emissive, glow, lathe, layer, lights, mesh_obj, parent, place, plain,  # noqa: E402
                 render_plate, render_sprite, reset, save_manifest, setup, solidify, tube, wood)
import props  # noqa: E402
import props_desk as desk  # noqa: E402

UP = Vector((0, 0, 1))
CARD_AT = (0.0, 6.0)
CARD_W, CARD_D = 7.4, 5.0

LOOKS = {
    "deck": dict(ground=("wood", "#9a8068", "#5e4a3a"), dark=False),
    "porch": dict(ground=("wood", "#e6ebe8", "#b8c4c2"), dark=False),
    "stone": dict(ground=("stone", "#9a978e", "#6a675f"), dark=False),
    "evening": dict(ground=("wood", "#5a4434", "#2e2219"), dark=True),
}

# the leaves' colours, each a pair the noise runs between
PALETTE = {
    "red": ("#a8261a", "#d8542a"),
    "orange": ("#d0621e", "#f0a030"),
    "gold": ("#d9a024", "#f4d050"),
    "brown": ("#7a4a22", "#b07a3a"),
}
KINDS = ("maple", "oak", "beech")


def leaf_outline(kind, rnd):
    """A leaf's edge, as points round it from the stalk, in a box about one unit long (y up the leaf)."""
    if kind == "maple":
        half = desk.MAPLE[1:-1]
        return [desk.MAPLE[0]] + half + [desk.MAPLE[-1]] + [(-x, y) for (x, y) in reversed(half)]
    pts = []
    n = 44
    for k in range(n + 1):
        t = k / n                      # 0 at the stalk, 1 at the tip
        y = -0.5 + 1.25 * t
        if kind == "oak":
            body = 0.36 * math.sin(math.pi * t ** 0.85)
            lobes = 1.0 + 0.32 * math.sin(t * math.pi * 9.0 - 0.6)
            x = body * lobes
        else:   # beech: a long oval with a fine saw edge and a point
            body = 0.3 * math.sin(math.pi * t ** 0.9) ** 0.9
            x = body * (1.0 + 0.04 * (1 if k % 2 else -1))
        pts.append((x, y))
    right = pts
    left = [(-x, y) for (x, y) in reversed(pts[1:-1])]
    return right + left


def make_leaf(name, kind, mat, size=1.0, seed=1):
    """A fallen leaf: its outline filled from a point near the stalk, curled up at the edges, a midrib and a stalk."""
    rnd = random.Random(seed)
    outline = leaf_outline(kind, rnd)
    curl = rnd.uniform(0.14, 0.32)
    twist = rnd.uniform(-0.12, 0.12)
    verts = [(0.0, 0.1 * size, 0.03)]
    for (x, y) in outline:
        z = 0.03 + curl * size * (x * x * 1.6 + 0.25 * (y - 0.1) ** 2) + twist * x * y + 0.025 * mnoise.noise(Vector((x * 4, y * 4, seed)))
        verts.append((x * size, y * size, z))
    n = len(outline)
    faces = [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)]
    leaf = mesh_obj(name, verts, faces, mat, True)
    solidify(leaf, 0.012, 0.0)
    stalk = tube(name + "_stalk", [Vector((0.0, -0.5 * size, 0.04)), Vector((0.03 * size, -0.72 * size, 0.05)), Vector((0.08 * size, -0.92 * size, 0.035))], 0.014 * size + 0.006, 6, mat)
    return [leaf, stalk]


def leaf_skin(name, a, b):
    """A dry leaf: its two colours in clouds, darker towards the edge, veins fanning from the stalk drawn a shade darker, a few freckles."""
    m = kit.Mat(name)
    obj = m.coords("Object")
    n, _ = m.noise(obj, 3.5, 4.0, 0.6)
    n2, _ = m.noise(obj, 11.0, 3.0, 0.55)
    x, y, z = m.sep(obj)
    fan = m.math("ARCTAN2", m.math("ADD", y, 0.45), m.math("ABSOLUTE", x))
    vein = m.math("POWER", m.math("ABSOLUTE", m.math("SINE", m.math("MULTIPLY", fan, 10.0))), 14.0)
    rib = m.math("LESS_THAN", m.math("ABSOLUTE", x), 0.009)
    col = m.mix(m.math("ADD", m.math("MULTIPLY", n, 0.75), m.math("MULTIPLY", n2, 0.25)), a, b)
    edge = m.math("MULTIPLY", m.math("SUBTRACT", m.math("ADD", m.math("MULTIPLY", x, x), m.math("MULTIPLY", m.math("SUBTRACT", y, 0.12), m.math("SUBTRACT", y, 0.12))), 0.12), 1.4)
    col = m.mix(m.math("MINIMUM", m.math("MAXIMUM", edge, 0.0), 0.55), col, "#5a2a10")
    col = m.mix(m.math("MULTIPLY", vein, 0.28), col, "#4a2410")
    spots, _ = m.noise(obj, 14.0, 2.0, 0.5)
    col = m.mix(m.math("MULTIPLY", m.math("GREATER_THAN", spots, 0.7), 0.4), col, "#4a2a12")
    col = m.mix(m.math("MULTIPLY", rib, 0.22), col, "#e8c080")
    m.set(base=col, rough=0.8, sss=0.06, sss_scale=0.02, spec=0.22, normal=m.bump(m.math("ADD", m.math("MULTIPLY", vein, 0.6), m.math("ADD", rib, m.math("MULTIPLY", n2, 0.3))), 0.22, 0.004))
    return m.mat


def stone(name, light, dark):
    """Flagstones: irregular slabs, each its own grey, a dark joint between them."""
    m = kit.Mat(name)
    obj = m.coords("Object")
    cells = m.node("ShaderNodeTexVoronoi")
    cells.feature = "DISTANCE_TO_EDGE"
    m._in(cells.inputs["Vector"], obj)
    cells.inputs["Scale"].default_value = 0.32
    tone = m.node("ShaderNodeTexVoronoi")
    m._in(tone.inputs["Vector"], obj)
    tone.inputs["Scale"].default_value = 0.32
    n, _ = m.noise(obj, 3.0, 5.0, 0.6)
    col = m.mix(m.math("ADD", m.math("MULTIPLY", tone.outputs["Color"], 0.5), m.math("MULTIPLY", n, 0.5)), dark, light)
    joint = m.math("LESS_THAN", cells.outputs["Distance"], 0.012)
    col = m.mix(m.math("MULTIPLY", joint, 0.7), col, "#4a4740")
    m.set(base=col, rough=0.8, normal=m.bump(m.math("SUBTRACT", n, joint), 0.4, 0.03))
    return m.mat


def ground(look):
    L = LOOKS[look]
    layer("table")
    kind, a, b = L["ground"]
    mat = wood("boards", a, b, 1.5, 0.6) if kind == "wood" else stone("stone", a, b)
    mesh_obj("ground", [(-60, -60, 0), (60, -60, 0), (60, 60, 0), (-60, 60, 0)], [(0, 1, 2, 3)], mat, smooth=False)


def card():
    """The card in the middle: heavy cream stock with a deckled edge, on a kraft envelope set a little crooked under it."""
    layer("table")
    centre = at(CARD_AT[0], CARD_AT[1])
    env = desk.envelope("envelope", plain("kraft", "#b98a58", 0.8), desk.wax_seal_material() if hasattr(desk, "wax_seal_material") else plain("seal", "#8a1a1a", 0.35), 7.6, 5.0)
    bpy.data.objects.remove(env.pop(), do_unlink=True)   # its seal would come up through the card
    parent(env, "envelope_pivot", centre + Vector((0.5, 0.4, 0.0)), math.radians(7))
    w, d = CARD_W, CARD_D
    nx, ny = 46, 32
    verts = []
    for j in range(ny + 1):
        for i in range(nx + 1):
            u, v = i / nx * 2 - 1, j / ny * 2 - 1
            x, y = u * w / 2, v * d / 2
            # a deckled edge: the outermost row wanders in and out
            if i in (0, nx):
                x += 0.05 * mnoise.noise(Vector((y * 6, 1.3, 0)))
            if j in (0, ny):
                y += 0.05 * mnoise.noise(Vector((x * 6, 2.7, 0)))
            verts.append((x, y, 0.09 + 0.012 * mnoise.noise(Vector((x * 0.6, y * 0.6, 3.1))) + 0.03 * abs(u) ** 10))
    faces = [(j * (nx + 1) + i, j * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i) for j in range(ny) for i in range(nx)]
    c = mesh_obj("card", verts, faces, desk.letter_paper("card_paper", "#fcf6ea", "#f0e4cc"), True)
    solidify(c, 0.03, -1.0)
    turn = math.radians(-2.0)
    parent([c], "card_pivot", centre, turn)

    def spot(x, y):
        return centre + Vector((x * math.cos(turn) - y * math.sin(turn), x * math.sin(turn) + y * math.cos(turn), 0.1))

    anchor("card", spot(0, 0))
    anchor("cardTopLeft", spot(-w / 2, d / 2))
    anchor("cardBottomRight", spot(w / 2, -d / 2))


def dressing(look, seed=4):
    """Round the edges: leaves already fallen, a rake, a mug of cider, pumpkins and gourds, a plaid throw; lights on the evening porch."""
    L = LOOKS[look]
    rnd = random.Random(seed)
    layer("props")
    skins = [leaf_skin("ground_leaf%d" % i, *PALETTE[k]) for i, k in enumerate(PALETTE)]
    spots = []
    for i in range(150):
        # a ring round the edges of the view, thicker in the corners, clear of the card; further out for wide screens
        a = rnd.uniform(0, TAU)
        sx = math.cos(a) * rnd.uniform(48, 82) * (1.0 if i < 70 else 2.1)
        sy = math.sin(a) * rnd.uniform(70, 118)
        if abs(sx) < 46 and abs(sy - CARD_AT[1]) < 60:
            continue
        spots.append((sx, sy))
    for i, (sx, sy) in enumerate(spots):
        kind = KINDS[i % 3]
        parent(make_leaf("gleaf%d" % i, kind, skins[i % len(skins)], rnd.uniform(1.0, 1.5), i + 20), "gleaf_pivot%d" % i, at(sx, sy, 0.01 * (i % 4)), rnd.uniform(0, TAU))
    # a rake lying across the top right corner: a long handle, a fan of springy tines
    handle = desk.turned_wood("rake_handle", "#c8a070", "#8a6a44", 0.5)
    steel = plain("rake_tines", "#3e4a44", 0.5, 0.6)
    head = at(46, 92, 0.12)
    parts = [tube("rake_shaft", [Vector((0, 0, 0.12)), Vector((0, 16.0, 0.16))], 0.13, 14, handle)]
    for k in range(17):
        ang = math.radians(-50 + 100 * k / 16)
        tip = Vector((math.sin(ang) * 2.6, -math.cos(ang) * 2.6, 0.03))
        parts.append(tube("tine%d" % k, [Vector((0, 0, 0.1)), tip * 0.6 + Vector((0, 0, 0.06)), tip, tip + Vector((0, 0, 0.12))], 0.03, 6, steel))
    parts.append(tube("rake_bar", [Vector((math.sin(math.radians(-50 + 100 * k / 16)) * 1.0, -math.cos(math.radians(-50 + 100 * k / 16)) * 1.0, 0.08)) for k in range(17)], 0.05, 8, steel))
    parent(parts, "rake_pivot", head, math.radians(-150))
    # a mug of cider with a cinnamon stick, bottom right
    china = props.glass_paint("mug_glaze", "#c8502a" if look != "porch" else "#3f6a7a", 0.2)
    cider = plain("cider", "#a8561a", 0.08, coat=0.6, sss=0.3)
    mug = props.mug("mug", china, cider, [plain("foam", "#e8c79a", 0.6)], 0.9, 1.25, seed=3)
    for extra in mug[3:]:
        bpy.data.objects.remove(extra, do_unlink=True)
    parent(mug[:3], "mug_pivot", at(-50, -76), math.radians(200))
    parent(props.cinnamon("cinnamon", plain("cinnamon_bark", "#7a3e1a", 0.8)), "cinnamon_pivot", at(-50, -76, 1.2), math.radians(30))
    # pumpkins and gourds
    stem = plain("stem", "#6a5a30", 0.8)
    for i, (sx, sy, r, color) in enumerate(((52, -70, 1.25, "#d9702a"), (66, -50, 0.75, "#efe2c6"), (-62, 70, 0.95, "#e39a3a"), (-58, 90, 0.6, "#c8501a"))):
        parent(desk.pumpkin("pumpkin%d" % i, desk.pumpkin_material("pumpkin_skin%d" % i, color), stem, r, 9, 0.72, i + 2), "pumpkin_pivot%d" % i, at(sx, sy), rnd.uniform(0, TAU))
    # a plaid throw folded at the bottom left corner
    throw = cloth("throw", "#c8b48a", 18.0, 0.9, 0.8, "#7a2a22", 0.5, "#4a1a16")
    parent(desk.napkin("throw_fold", throw, 6.0, 4.0), "throw_pivot", at(-70, -102), math.radians(24))
    acorn_nut = plain("acorn_nut", "#8a5a2a", 0.4, coat=0.3)
    acorn_cap = plain("acorn_cap", "#5a3c1c", 0.9)
    for i, (sx, sy) in enumerate(((-38, -88), (34, 82), (58, -30), (-60, 30))):
        parent(desk.acorn("acorn%d" % i, acorn_nut, acorn_cap, 1.3), "acorn_pivot%d" % i, at(sx, sy), rnd.uniform(0, TAU))
    if L["dark"]:
        wire = plain("wire", "#2a2418", 0.6)
        bulb = emissive("bulb", "#ffd28a", 26.0)
        socket = plain("socket", "#3a3020", 0.5)
        props.fairy_lights("lights_top", [at(-90, 96, 0.3), at(-60, 88, 0.25), at(-30, 98, 0.34), at(0, 90, 0.3), at(30, 99, 0.34), at(60, 88, 0.3), at(90, 96, 0.2)], wire, bulb, socket, 1.1, 0.105, 21)
        props.fairy_lights("lights_bottom", [at(-90, -100, 0.3), at(-56, -108, 0.25), at(-20, -98, 0.34), at(16, -108, 0.3), at(50, -98, 0.34), at(90, -106, 0.2)], wire, bulb, socket, 1.1, 0.105, 22)
        tin = plain("tea_cup", "#d9dde2", 0.25, 1.0)
        wax = plain("tea_wax", "#fbf1de", 0.5, sss=0.5, sss_scale=0.2)
        flame = emissive("flame", "#ffb85a", 60.0)
        wick = plain("wick", "#1a1208", 0.9)
        for i, (sx, sy) in enumerate(((-40, -64), (62, 64), (-66, 52))):
            parent(desk.tealight("tea%d" % i, tin, wax, flame, wick, 0.55), "tea_pivot%d" % i, at(sx, sy))


LEAF_NAMES = ["leaf-%s-%s" % (kind, colour) for kind in KINDS for colour in PALETTE]


def loose_leaves():
    """The leaves the gift moves: one of each kind in each colour, all at the stage's middle, lifted a little so their shadow shows."""
    for i, name in enumerate(LEAF_NAMES):
        kind, colour = name.split("-")[1:]
        layer(name)
        parent(make_leaf(name.replace("-", "_"), kind, leaf_skin(name + "_skin", *PALETTE[colour]), 1.25, 100 + i), name + "_pivot", at(0, 0, 0.22))


NOTE = ("sheet", "catch_sheet", "twig")


def stationery():
    """The note's things, each on a place of its own above the ground: the letter's paper and a twig to hold the photos down."""
    layer("sheet")
    top = at(0, 60, 2.0)
    parent(desk.letter_sheet("sheet", desk.letter_paper("sheet_paper", "#fcf6ea", "#f0e4cc"), 7.6, 12.0, plain("sheet_line", "#c8692a", 0.5)), "sheet_pivot", top)
    catcher(2.0, 9.0, "catch_sheet", (top.x, top.y - 6.0))
    layer("twig")
    bark = plain("bark", "#5a4030", 0.85)
    mid = at(0, -40, 5.0)
    path = [Vector((-2.2 + 4.4 * i / 12, 0.06 * math.sin(i * 1.3), 0.0)) for i in range(13)]
    twig = [tube("twig", path, [0.09 - 0.004 * i for i in range(13)], 10, bark)]
    twig.append(tube("twig_fork", [Vector((0.6, 0.0, 0)), Vector((1.2, 0.35, 0.02)), Vector((1.6, 0.52, 0.04))], 0.05, 8, bark))
    twig += make_leaf("twig_leaf", "beech", leaf_skin("twig_leaf_skin", *PALETTE["gold"]), 0.8, 7)
    place(twig[-2], Vector((1.7, 0.6, 0.02)), rot=(0, 0, math.radians(-40)))
    place(twig[-1], Vector((1.7, 0.6, 0.02)), rot=(0, 0, math.radians(-40)))
    parent(twig, "twig_pivot", mid)


WIDE = (360.0, 240.0, 7.0)   # wide enough for a 16:9 screen without a mirrored copy at its sides
PHONE = (100.0, 240.0, 12.0)
SPRITE_VIEW = (160.0, 240.0, 10.0)   # sprites keep the sharpness they were tuned at
OPT = kit.cli()
MOVING = tuple(LEAF_NAMES) + NOTE


def build(look, view=WIDE, dress=True, overhead=False):
    reset()
    kit.MANIFEST["bulbs"] = []
    setup(view[0], view[1], view[2], OPT["samples"] or 220, OPT["preview"])
    key = lights(key=3300.0 if not LOOKS[look]["dark"] else 1500.0, world=0.2 if not LOOKS[look]["dark"] else 0.08, hdri="studio.exr")
    if overhead:
        key.location = Vector((0.0, -2.0, 24.0))
        key.rotation_euler = (Vector((0, 0, 0)) - key.location).to_track_quat("-Z", "Y").to_euler()
    ground(look)
    card()
    if dress:
        dressing(look)
    loose_leaves()
    stationery()
    catcher()
    glow(1.4, 7)


def note_sprites(out):
    render_sprite("sheet", os.path.join(out, "sheet.png"), ["sheet"], catch=("catch_sheet",), pad=(1.5, 1.5, 3.0, 3.0), density=1.3)
    render_sprite("twig", os.path.join(out, "twig.png"), ["twig"], catch=(), pad=(0.5, 0.5, 0.5, 0.5), density=1.6)


def sprites(out):
    build("deck", SPRITE_VIEW, dress=False, overhead=True)
    for name in LEAF_NAMES:
        render_sprite(name, os.path.join(out, name + ".png"), [name], catch=("catch",), pad=(2.0, 2.0, 2.0, 2.0), density=1.5)
    build("deck", SPRITE_VIEW, dress=False)
    note_sprites(out)


def main():
    out = OPT["out"]
    looks = OPT["look"] or list(LOOKS)
    only = OPT["only"] or ["sprites", "plates", "soft"]
    if "beauty" in only:
        for look in looks:
            build(look)
            render_plate(os.path.join(out, "beauty-%s.png" % look), hide=("catch",) + NOTE)
    if "sprites" in only:
        sprites(out)
    if "plates" in only:
        for look in looks:
            for (tag_, view) in (("wide", WIDE), ("phone", PHONE)):
                build(look, view)
                render_plate(os.path.join(out, "plate-%s-%s.png" % (look, tag_)), hide=("catch",) + MOVING)
    elif "sprites" in only:
        build(looks[0], WIDE)
    if "soft" in only:
        for look in looks:
            for (tag_, view) in (("wide", WIDE), ("phone", PHONE)):
                build(look, view)
                kit.render_soft(os.path.join(out, "soft-%s-%s.png" % (look, tag_)), hide=("catch",) + MOVING)
    kit.MANIFEST["sheets"] = {"letter": {"sprite": "sheet", "top": 0.12, "mid": 0.5, "bottom": 0.1, "gain": 1.05}}
    save_manifest(os.path.join(out, "manifest.json"))


main()
