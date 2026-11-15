"""
Thankful Pie's table: a pumpkin pie cut in six on a Thanksgiving table, and a recipe card above it.

    blender --background --factory-startup --python thankful_pie.py -- --out <dir> [--preview] [--look linen] [--only beauty]

Makes, per look, the plate for phones and for wide screens (the empty tin in it, a smear of filling
and crumbs where the slices were) and the same table out of focus (for the note), and once for all
looks the sprites: each of the six slices with its own shadow, the note's paper, a pin of the pie's
own kind (a tiny wooden pick with a paper flag is too fussy: a strip of washi tape) for the photos.
"""

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402,F401
from mathutils import Vector  # noqa: E402

import kit  # noqa: E402
from kit import (TAU, anchor, at, box, catcher, cloth, emissive, glow, gold, lathe, layer, lights, mesh_obj, parent, place, plain,  # noqa: E402
                 render_plate, render_sprite, reset, save_manifest, setup, sphere, tube, wood)
import props  # noqa: E402
import props_desk as desk  # noqa: E402

UP = Vector((0, 0, 1))

# The pie, in stage units from the stage's middle; sizes in Blender units (ten stage units each).
PIE_AT = (0.0, -24.0)
PIE_R = 3.0
SLICES = 6
GAP = 0.018          # radians cut away either side of each slice: the knife's line
TIN_FLOOR = 0.05     # the tin's floor, above the board under it
BOARD_Z = 0.12       # the board the tin stands on
CARD_AT = (0.0, 44.0)
CARD_W, CARD_D = 8.6, 4.5
RULES = 7            # ruled lines on the card under its heading
RULE_GAP = 0.47

LOOKS = {
    "linen": dict(table=("cloth", "#efe6d6", None, None), board=("#c9a06a", "#9a7444"), napkin="#c8692a",
                  pumpkins=["#efe2c6", "#d9702a", "#e0b070"], leaves=[("#b5341f", "#e07a2a"), ("#d9902a", "#f0c24a"), ("#8a5a2a", "#c48a4a")], berry="#b01620"),
    "farmhouse": dict(table=("wood", "#6a4426", "#3a2414", None), board=("#d8b480", "#a9814e"), napkin="#f1e6cf",
                      pumpkins=["#d9702a", "#efe2c6", "#b8501a"], leaves=[("#c8561a", "#f0a030"), ("#8a2a1a", "#c4502a"), ("#d9902a", "#f0c24a")], berry="#8a1420"),
    "check": dict(table=("cloth", "#f3e9d8", "#3f6a48", "#2f5a3a"), board=("#c9a06a", "#9a7444"), napkin="#b3302a",
                  pumpkins=["#d9702a", "#efe2c6", "#e39a3a"], leaves=[("#b5341f", "#e07a2a"), ("#d9902a", "#f0c24a"), ("#8a2a1a", "#c4502a")], berry="#b01620"),
    "candlelit": dict(table=("cloth", "#2e2230", None, None), board=("#a9814e", "#6a4a26"), napkin="#7a2a3a",
                      pumpkins=["#efe2c6", "#d9a441", "#c8692a"], leaves=[("#8a2a1a", "#c4502a"), ("#c98a2a", "#f0c24a"), ("#6a1f1a", "#a8402a")], berry="#8a1420"),
}


def table(look):
    L = LOOKS[look]
    layer("table")
    kind, a, b, c = L["table"]
    if kind == "wood":
        mat = wood("table_wood", a, b, 2.3, 0.4)
    elif b:
        mat = cloth("table_cloth", a, 26.0, 0.9, 0.7, b, 0.62, c)
    else:
        mat = cloth("table_cloth", a, 26.0, 0.9, 0.8)
    mesh_obj("table", [(-60, -60, 0), (60, -60, 0), (60, 60, 0), (-60, 60, 0)], [(0, 1, 2, 3)], mat, smooth=False)
    # a round board under the pie
    centre = at(PIE_AT[0], PIE_AT[1])
    board_mat = desk.turned_wood("board_wood", L["board"][0], L["board"][1], 0.5)
    board = lathe("board", [(0.0, 0.0), (PIE_R * 1.36, 0.0), (PIE_R * 1.4, 0.04), (PIE_R * 1.4, BOARD_Z - 0.03), (PIE_R * 1.37, BOARD_Z), (0.0, BOARD_Z)], 96, board_mat)
    place(board, centre)


def recipe_card():
    """A lined index card, the kind a recipe is written on: a red line under its heading, blue lines under that."""
    layer("table")
    card = at(CARD_AT[0], CARD_AT[1])
    parts = [box("card", (CARD_W, CARD_D, 0.035), desk.letter_paper("card_paper", "#fcf7ec", "#f2e8d2"), 0.0, 0.025, 2)]
    blue = plain("rule_blue", "#8fb2d6", 0.6)
    red = plain("rule_red", "#d9706a", 0.6)
    top = CARD_D / 2 - 1.05
    parts.append(box("card_red", (CARD_W - 0.02, 0.022, 0.004), red, 0.035))
    place(parts[-1], (0.0, top, 0.0))
    for i in range(RULES):
        y = top - RULE_GAP * (i + 1)
        line = box("card_rule%d" % i, (CARD_W - 0.02, 0.014, 0.004), blue, 0.035)
        place(line, (0.0, y, 0.0))
        parts.append(line)
    # the margin line down its left
    margin = box("card_margin", (0.014, CARD_D - 0.02, 0.004), red, 0.035)
    place(margin, (-CARD_W / 2 + 0.95, 0.0, 0.0))
    parts.append(margin)
    parent(parts, "card_pivot", card, math.radians(-1.2))
    # where the gift writes: the heading's line, each rule, and the card's corners
    turn = math.radians(-1.2)

    def spot(x, y):
        return card + Vector((x * math.cos(turn) - y * math.sin(turn), x * math.sin(turn) + y * math.cos(turn), 0.04))

    anchor("cardTopLeft", spot(-CARD_W / 2, CARD_D / 2))
    anchor("cardBottomRight", spot(CARD_W / 2, -CARD_D / 2))
    anchor("cardHead", spot(0.0, top))
    anchor("cardMargin", spot(-CARD_W / 2 + 0.95, top))
    for i in range(RULES):
        anchor("rule%d" % i, spot(-CARD_W / 2 + 0.95, top - RULE_GAP * (i + 1)))


def filling_material():
    """Pumpkin custard: smooth, a little glossy, a darker skin where it baked against the heat."""
    m = kit.Mat("filling")
    obj = m.coords("Object")
    n, _ = m.noise(obj, 2.0, 4.0, 0.6)
    col = m.ramp(n, [(0.3, "#a9521e"), (0.6, "#c4672a"), (0.85, "#b85a22")])
    fine, _ = m.noise(obj, 26.0, 2.0, 0.5)
    m.set(base=col, rough=0.38, coat=0.25, coat_rough=0.35, sss=0.25, sss_scale=0.06, normal=m.bump(fine, 0.06, 0.003))
    return m.mat


def cut_material():
    """The custard where the knife went through: paler and matt, no skin on it."""
    m = kit.Mat("filling_cut")
    obj = m.coords("Object")
    n, _ = m.noise(obj, 9.0, 3.0, 0.6)
    m.set(base=m.ramp(n, [(0.3, "#d07a36"), (0.7, "#dd8a44")]), rough=0.62, sss=0.3, sss_scale=0.05, normal=m.bump(n, 0.1, 0.004))
    return m.mat


def cream_swirl(name, mat, r=0.4, h=0.42):
    """A piped rosette of whipped cream: wide at the bottom, its ridges twisting up to a peak."""
    cv, cf = [], []
    cseg, rows = 40, 14
    for li in range(rows + 1):
        t = li / rows
        rr = r * (1.0 - t) ** 0.8
        for j in range(cseg):
            a = TAU * j / cseg + t * 2.6
            flute = 1.0 + 0.16 * math.sin(7 * (TAU * j / cseg))
            cv.append((rr * flute * math.cos(a), rr * flute * math.sin(a), h * t ** 0.8))
    for li in range(rows):
        for j in range(cseg):
            a, b = li * cseg + j, li * cseg + (j + 1) % cseg
            cf.append((a, b, b + cseg, a + cseg))
    return mesh_obj(name, cv, cf, mat, True)


def slice_parts(name, i, crust_mat, fill_mat, cut_mat, cream_mat):
    """
    One slice, in place in the tin: a wedge of custard with its cut faces, the crimped crust round its
    back, and a rosette of cream. Built round the pie's middle, so it is drawn exactly where it sits.
    """
    r = PIE_R
    a0 = TAU * i / SLICES + GAP + math.pi / 2
    a1 = TAU * (i + 1) / SLICES - GAP + math.pi / 2
    n = 26
    angs = [a0 + (a1 - a0) * k / n for k in range(n + 1)]
    mid = (a0 + a1) / 2
    tip = Vector((math.cos(mid), math.sin(mid), 0.0)) * 0.06    # the point stops just short of the middle
    top_z, low_z, rf = 0.4, TIN_FLOOR + 0.02, r * 0.865
    parts = []
    # the custard: a fan on top, the same underneath, and the two cut faces between
    verts = [(tip.x, tip.y, top_z), (tip.x, tip.y, low_z)]
    for a in angs:
        verts.append((rf * math.cos(a), rf * math.sin(a), top_z - 0.01))
        verts.append((rf * math.cos(a) * 0.97, rf * math.sin(a) * 0.97, low_z))
    faces = []
    for k in range(n):
        t0, t1 = 2 + 2 * k, 2 + 2 * (k + 1)
        faces.append((0, t0, t1))
        faces.append((1, t1 + 1, t0 + 1))
        faces.append((t0, t0 + 1, t1 + 1, t1))
    parts.append(mesh_obj(name + "_custard", verts, faces, fill_mat, True))
    # the two faces the knife made, in the paler custard
    cut_faces = []
    cv = [(tip.x, tip.y, top_z - 0.005), (tip.x, tip.y, low_z)]
    for a in (a0, a1):
        cv.append((rf * math.cos(a), rf * math.sin(a), top_z - 0.015))
        cv.append((rf * math.cos(a) * 0.97, rf * math.sin(a) * 0.97, low_z))
    # nudge the cut faces a hair outward from the wedge, so they are what shows
    out0 = Vector((math.cos(a0 - math.pi / 2), math.sin(a0 - math.pi / 2), 0)) * 0.004
    out1 = Vector((math.cos(a1 + math.pi / 2), math.sin(a1 + math.pi / 2), 0)) * 0.004
    cv = [tuple(Vector(v) + (out0 if k in (2, 3) else out1 if k in (4, 5) else (out0 + out1) / 2)) for k, v in enumerate(cv)]
    cut_faces.append((0, 1, 3, 2))
    cut_faces.append((0, 4, 5, 1))
    parts.append(mesh_obj(name + "_cut", cv, cut_faces, cut_mat, False))
    # the crust round its back: the pie's crimped rim, only this slice's length of it, closed at both ends
    rings = [(0.835, 0.34), (0.9, 0.5), (0.97, 0.56), (1.04, 0.52), (1.06, 0.44), (1.03, 0.14), (0.95, TIN_FLOOR + 0.02), (0.84, TIN_FLOOR + 0.02)]
    crimps = 30
    seg = 34
    cang = [a0 + (a1 - a0) * k / seg for k in range(seg + 1)]
    v2 = []
    for (fr, zz) in rings:
        for a in cang:
            wave = 1.0 + 0.035 * math.sin(crimps * a) * (1.0 if fr > 0.88 else 0.2)
            bump = 0.05 * math.sin(crimps * a) * (1.0 if 0.88 < fr < 1.05 else 0.0)
            v2.append((r * fr * wave * math.cos(a), r * fr * wave * math.sin(a), zz + bump))
    f2 = []
    w = seg + 1
    for ri in range(len(rings) - 1):
        for k in range(seg):
            a, b = ri * w + k, ri * w + k + 1
            f2.append((a, b, b + w, a + w))
    # close the ring's ends
    f2.append(tuple(ri * w for ri in range(len(rings))))
    f2.append(tuple(ri * w + seg for ri in reversed(range(len(rings)))))
    parts.append(mesh_obj(name + "_crust", v2, f2, crust_mat, True))
    # a rosette of cream two-thirds of the way out
    rose = cream_swirl(name + "_cream", cream_mat, 0.36, 0.4)
    place(rose, (math.cos(mid) * r * 0.58, math.sin(mid) * r * 0.58, top_z - 0.02))
    parts.append(rose)
    return parts, mid


def pie(look):
    """The tin (in the plate: it stays when the slices go, with a smear of custard and crumbs in it) and the six slices, each its own layer."""
    centre = at(PIE_AT[0], PIE_AT[1], BOARD_Z)
    r = PIE_R
    layer("tin")
    tin_mat = plain("pie_tin", "#d4d6da", 0.55, 1.0)
    tin = lathe("tin", [(0.0, 0.0), (r * 0.86, 0.0), (r * 1.02, 0.42), (r * 1.08, 0.44), (r * 1.08, 0.47), (r * 1.0, 0.47), (r * 0.85, TIN_FLOOR), (0.0, TIN_FLOOR)], 96, tin_mat)
    place(tin, centre)
    # what a slice leaves behind: a thin skin of custard on the floor, a crumb or two
    smear = kit.Mat("smear")
    obj = smear.coords("Object")
    n, _ = smear.noise(obj, 1.6, 3.0, 0.55)
    smear.set(base="#c98a52", rough=0.6, alpha=smear.ramp(n, [(0.5, "#000000"), (0.68, "#8a8a8a")]))
    try:
        smear.mat.blend_method = "HASHED"
    except Exception:
        pass
    floor = lathe("smear", [(0.0, TIN_FLOOR + 0.004), (r * 0.82, TIN_FLOOR + 0.004)], 64, smear.mat)
    place(floor, centre)
    crumb = desk.crust_material("crumb")
    rnd = random.Random(8)
    for k in range(26):
        a = rnd.uniform(0, TAU)
        d = rnd.uniform(0.3, r * 0.8)
        c = sphere("crumb%d" % k, rnd.uniform(0.03, 0.07), crumb, 8, 5, 0.6)
        place(c, centre + Vector((d * math.cos(a), d * math.sin(a), TIN_FLOOR + 0.02)), rot=(0, 0, rnd.uniform(0, TAU)))
    crust_mat = desk.crust_material("crust")
    fill_mat = filling_material()
    cut_mat = cut_material()
    cream_mat = plain("cream", "#fffaf0", 0.5, sss=0.5, sss_scale=0.2)
    for i in range(SLICES):
        layer("slice%d" % i)
        parts, mid = slice_parts("slice%d" % i, i, crust_mat, fill_mat, cut_mat, cream_mat)
        parent(parts, "slice%d_pivot" % i, centre)
        # the middle of the slice (for the tap) and the way it comes out
        anchor("slice%d" % i, centre + Vector((math.cos(mid), math.sin(mid), 0.0)) * r * 0.6 + UP * 0.4)
        anchor("slice%dOut" % i, centre + Vector((math.cos(mid), math.sin(mid), 0.0)) * r * 1.6 + UP * 0.4)
    anchor("pie", centre + UP * 0.4)
    anchor("pieEdge", centre + Vector((r * 1.08, 0, 0.47)))


def dressing(look, seed=5):
    """What else is on the table: leaves, lights and little pumpkins round the edges; a server, a napkin and coffee by the pie."""
    L = LOOKS[look]
    rnd = random.Random(seed)
    layer("props")
    stem = plain("stem", "#6a5a30", 0.8)
    skins = [desk.pumpkin_material("pumpkin_skin%d" % i, c) for i, c in enumerate(L["pumpkins"])]
    for i, (sx, sy, r, k) in enumerate(((-40, 80, 0.8, 0), (41, 79, 0.65, 1), (44, -78, 1.05, 2), (-46, -66, 0.75, 1), (74, 22, 1.2, 0), (-72, -30, 0.95, 2), (66, -60, 0.7, 0), (-70, 74, 1.1, 1))):
        parent(desk.pumpkin("pumpkin%d" % i, skins[k % len(skins)], stem, r, 9 if r > 0.8 else 8, 0.72, i + 3), "pumpkin_pivot%d" % i, at(sx, sy), rnd.uniform(0, TAU))
    leaves = [desk.leaf_material("leaf_skin%d" % i, a, b) for i, (a, b) in enumerate(L["leaves"])]
    spots = [(-30, 86, 1.3), (-15, 90, 1.1), (2, 86, 1.25), (18, 91, 1.05), (30, 85, 1.3), (-52, 70, 1.2), (54, 66, 1.15),
             (-48, 8, 1.2), (49, 2, 1.1), (-30, -72, 1.25), (-12, -78, 1.1), (16, -76, 1.3), (32, -80, 1.15), (-60, 30, 1.3), (62, 40, 1.2), (-66, -62, 1.2), (72, -40, 1.1), (-56, -84, 1.2)]
    for i, (sx, sy, size) in enumerate(spots):
        parent(desk.maple_leaf("leaf%d" % i, leaves[i % len(leaves)], size, i + 1), "leaf_pivot%d" % i, at(sx, sy, 0.01 + 0.02 * (i % 3)), rnd.uniform(0, TAU))
    wire = plain("wire", "#2a2418", 0.6)
    bulb = emissive("bulb", "#ffd28a", 26.0)
    socket = plain("socket", "#3a3020", 0.5)
    props.fairy_lights("lights_top", [at(-88, 82, 0.3), at(-62, 76, 0.25), at(-36, 84, 0.34), at(-12, 78, 0.3), at(12, 85, 0.34), at(36, 77, 0.3), at(60, 83, 0.25), at(88, 76, 0.2)], wire, bulb, socket, 1.05, 0.105, 21)
    props.fairy_lights("lights_left", [at(-62, 76, 0.2), at(-49, 56, 0.12), at(-51, 26, 0.14), at(-48, -4, 0.14), at(-51, -34, 0.14), at(-48, -60, 0.12), at(-66, -84, 0.08)], wire, bulb, socket, 1.5, 0.105, 22)
    props.fairy_lights("lights_right", [at(60, 83, 0.2), at(49, 60, 0.12), at(51, 30, 0.14), at(48, 0, 0.14), at(51, -30, 0.14), at(48, -56, 0.12), at(70, -82, 0.08)], wire, bulb, socket, 1.5, 0.105, 23)
    berry = props.glass_paint("cranberry", L["berry"], 0.2)
    for i, (sx, sy, n) in enumerate(((-22, 80, 5), (24, 82, 4), (25, -70, 6), (-40, -76, 4), (58, 54, 5))):
        parent(desk.cranberries("cran%d" % i, berry, n, 0.15, 0.55, i + 2), "cran_pivot%d" % i, at(sx, sy))
    nut = plain("acorn_nut", "#8a5a2a", 0.4, coat=0.3)
    cup = plain("acorn_cap", "#5a3c1c", 0.9)
    for i, (sx, sy) in enumerate(((-7, 80), (10, 79), (-20, -72), (6, -82), (-57, 46), (58, 12))):
        parent(desk.acorn("acorn%d" % i, nut, cup, 1.25), "acorn_pivot%d" % i, at(sx, sy), rnd.uniform(0, TAU))
    # by the pie: a server, and for wide screens a napkin and fork, and a cup of coffee
    steel = plain("steel", "#e3e6ea", 0.42, 1.0)
    parent(desk.cutlery("server", steel, "knife", 5.0), "server_pivot", at(43, -40, 0.0), math.radians(-28))
    parent(desk.napkin("napkin", cloth("napkin_cloth", L["napkin"], 30.0, 0.9, 0.8), 2.6, 4.6), "napkin_pivot", at(-66, -6), math.radians(3))
    parent(desk.cutlery("fork", steel, "fork", 4.4), "fork_pivot", at(-66, -5, 0.14), math.radians(2))
    china = props.glass_paint("china", "#fbf6ec", 0.14)
    coffee = plain("coffee", "#3a1e10", 0.08, coat=0.6)
    cup_parts = props.mug("coffee_cup", china, coffee, [plain("foam", "#e8d2b0", 0.6)], 0.85, 1.1, seed=2)
    parent(cup_parts[:3], "cup_pivot", at(66, 50), math.radians(30))
    for extra in cup_parts[3:]:
        bpy.data.objects.remove(extra, do_unlink=True)
    lit = [(-24, -86), (28, -88), (-64, 60), (64, 64)]
    tin = plain("tea_cup", "#d9dde2", 0.25, 1.0)
    wax = plain("tea_wax", "#fbf1de", 0.5, sss=0.5, sss_scale=0.2)
    flame = emissive("flame", "#ffb85a", 60.0)
    wick = plain("wick", "#1a1208", 0.9)
    for i, (sx, sy) in enumerate(lit + ([(-36, 88), (36, 90)] if look == "candlelit" else [])):
        parent(desk.tealight("tea%d" % i, tin, wax, flame, wick, 0.5), "tea_pivot%d" % i, at(sx, sy))


NOTE = ("sheet", "catch_sheet", "tape")


def stationery():
    """The note's things, each on a place of its own above the table: the letter's paper (the card's, ruled) and a strip of washi tape for the photos."""
    layer("sheet")
    top = at(0, 60, 2.0)
    parent(desk.letter_sheet("sheet", desk.letter_paper("sheet_paper", "#fcf7ec", "#f2e8d2"), 7.6, 12.0, plain("sheet_line", "#d9706a", 0.6)), "sheet_pivot", top)
    catcher(2.0, 9.0, "catch_sheet", (top.x, top.y - 6.0))
    layer("tape")
    mid = at(0, -40, 5.0)
    tape = desk.tape_strip("tape", washi_material(), 2.4, 0.66)
    parent(tape, "tape_pivot", mid)


def washi_material():
    """Washi tape: thin paper, a little see-through, printed with small leaves in rust on cream."""
    m = kit.Mat("washi")
    obj = m.coords("Object")
    x, y, z = m.sep(obj)
    dots = m.math("SINE", m.math("MULTIPLY", x, 18.0))
    rows = m.math("SINE", m.math("MULTIPLY", y, 18.0))
    pattern = m.math("GREATER_THAN", m.math("MULTIPLY", dots, rows), 0.55)
    m.set(base=m.mix(pattern, "#f1e3c8", "#c8692a"), rough=0.7, alpha=0.88, sss=0.2, sss_scale=0.02)
    try:
        m.mat.blend_method = "BLEND"
    except Exception:
        pass
    return m.mat


WIDE = (160.0, 240.0, 10.0)
PHONE = (100.0, 240.0, 12.0)
OPT = kit.cli()
SLICE_LAYERS = tuple("slice%d" % i for i in range(SLICES))
MOVING = SLICE_LAYERS + NOTE


def build(look, view=WIDE, dress=True):
    reset()
    kit.MANIFEST["bulbs"] = []
    setup(view[0], view[1], view[2], OPT["samples"] or 220, OPT["preview"])
    lights(key=3300.0, world=0.2, hdri="studio.exr")
    table(look)
    recipe_card()
    if dress:
        dressing(look)
    pie(look)
    stationery()
    centre = at(PIE_AT[0], PIE_AT[1])
    catcher(BOARD_Z + TIN_FLOOR, 7.0, "catch_tin", (centre.x, centre.y))
    catcher()
    glow(1.4, 7)


def note_sprites(out):
    render_sprite("sheet", os.path.join(out, "sheet.png"), ["sheet"], catch=("catch_sheet",), pad=(1.5, 1.5, 3.0, 3.0), density=1.3)
    render_sprite("tape", os.path.join(out, "tape.png"), ["tape"], catch=(), pad=(0.5, 0.5, 0.5, 0.5), density=1.6)


def sprites(out):
    build("linen", WIDE, dress=False)
    # the whole pie in one picture, its shadow as it really falls: the gift cuts it into wedges, and only a slice on its way out is drawn by itself
    render_sprite("pie", os.path.join(out, "pie.png"), list(SLICE_LAYERS), catch=("catch_tin",), pad=(3.0, 3.0, 6.0, 6.0), density=1.4)
    for i in range(SLICES):
        render_sprite("slice%d" % i, os.path.join(out, "slice%d.png" % i), ["slice%d" % i], catch=("catch_tin",), pad=(2.0, 2.0, 4.0, 4.0), density=1.4)
    note_sprites(out)


def main():
    out = OPT["out"]
    looks = OPT["look"] or list(LOOKS)
    only = OPT["only"] or ["sprites", "plates", "soft"]
    if "beauty" in only:
        for look in looks:
            build(look)
            render_plate(os.path.join(out, "beauty-%s.png" % look), hide=("catch", "catch_tin") + NOTE)
    if "sprites" in only:
        sprites(out)
    elif "note" in only:
        build("linen", WIDE, dress=False)
        note_sprites(out)
    if "plates" in only:
        for look in looks:
            for (tag_, view) in (("wide", WIDE), ("phone", PHONE)):
                build(look, view)
                render_plate(os.path.join(out, "plate-%s-%s.png" % (look, tag_)), hide=("catch", "catch_tin") + MOVING)
    elif "sprites" in only:
        build(looks[0], WIDE)
    if "soft" in only:
        for look in looks:
            for (tag_, view) in (("wide", WIDE), ("phone", PHONE)):
                build(look, view)
                kit.render_soft(os.path.join(out, "soft-%s-%s.png" % (look, tag_)), hide=("catch", "catch_tin") + MOVING)
    kit.MANIFEST["sheets"] = {"letter": {"sprite": "sheet", "top": 0.12, "mid": 0.5, "bottom": 0.1, "gain": 1.05}}
    save_manifest(os.path.join(out, "manifest.json"))


main()
