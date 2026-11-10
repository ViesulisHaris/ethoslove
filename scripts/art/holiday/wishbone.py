"""
Wishbone's table: a Thanksgiving place setting from above, the wishbone on its plate.

    blender --background --factory-startup --python wishbone.py -- --out <dir> [--preview] [--look gingham] [--only beauty]

Makes, per look, the plate for phones and for wide screens and the same table out of focus (for the
note), and once for all looks the sprites: the wishbone in three pieces (its head, and each arm with
the name tag tied to it), the note's paper, a clothes peg and a length of twine for the photos.
"""

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import kit  # noqa: E402
from kit import (TAU, Mat, anchor, at, box, catcher, cloth, emissive, glow, gold, lathe, layer, lights, mesh_obj, parent, place, plain,  # noqa: E402
                 render_plate, render_sprite, reset, rounded_rect, save_manifest, setup, tube, wood)
import props  # noqa: E402
import props_desk as desk  # noqa: E402

# The place setting, in stage units from the stage's middle; sizes in Blender units (ten stage units each).
PLATE_AT = (0.0, -8.0)
PLATE_R = 4.3
MAT_R = 5.3
JOINT_AT = (0.0, 14.0)
ARM, SPREAD, BONE_R = 4.0, 2.0, 0.17
CARD_AT = (0.0, 66.0)   # the place card the title is written on
WELL = 0.10      # the plate's flat middle, above the table (the mat under it and all)
RIM = 0.235      # just clear of the plate's rim
UP = Vector((0, 0, 1))

LOOKS = {
    "gingham": dict(table=("cloth", "#fbf3e6", "#d6554c", "#b3302a"), mat=("#d2ad72", "#a07a44"), plate="#fffdf8", napkin="#c4302a",
                    pumpkins=["#d9702a", "#efe2c6", "#e39a3a"], leaves=[("#b5341f", "#e07a2a"), ("#d9902a", "#f0c24a"), ("#8a2a1a", "#c4502a")], berry="#b01620", candle="#fbf3e3"),
    "harvest": dict(table=("wood", "#5a3620", "#2c190d", None), mat=("#b98a4e", "#7a5428"), plate="#fbf4e6", napkin="#c8692a",
                    pumpkins=["#d9702a", "#b8501a", "#efe2c6"], leaves=[("#c8561a", "#f0a030"), ("#8a2a1a", "#c4502a"), ("#d9902a", "#f0c24a")], berry="#8a1420", candle="#fbf1de"),
    "sage": dict(table=("cloth", "#a9b994", None, None), mat=("#e3d3b0", "#b9a47a"), plate="#fffdf6", napkin="#f6f1e4",
                 pumpkins=["#efe2c6", "#c9d2b0", "#e0b070"], leaves=[("#b98a3a", "#e3c26a"), ("#7a8a4a", "#b5b56a"), ("#c8703a", "#e3a25a")], berry="#b23a3a", candle="#fffaf0"),
    "candlelit": dict(table=("cloth", "#3b1f2b", None, None), mat=("#9a7440", "#5e4220"), plate="#fbf4e6", napkin="#7a2a3a",
                      pumpkins=["#efe2c6", "#d9a441", "#c8692a"], leaves=[("#8a2a1a", "#c4502a"), ("#c98a2a", "#f0c24a"), ("#6a1f1a", "#a8402a")], berry="#8a1420", candle="#fbf1de"),
}


def move(objs, name):
    """Takes things out of the layer they were built in and puts them in `name`."""
    coll = layer(name)
    for ob in objs:
        for c in list(ob.users_collection):
            c.objects.unlink(ob)
        coll.objects.link(ob)


def coupe_plate(name, mat, r, rim_mat=None):
    """A dinner plate with a wide flat middle and a low rolled rim, a gilt line just inside its edge."""
    prof = [(0.0, 0.0), (r * 0.8, 0.0), (r * 0.9, 0.035), (r * 0.985, 0.13), (r, 0.16), (r * 0.985, 0.185), (r * 0.9, 0.1), (r * 0.8, 0.06), (0.0, 0.06)]
    parts = [lathe(name, prof, 96, mat)]
    if rim_mat:
        parts.append(tube(name + "_gilt", [Vector((r * 0.955 * math.cos(TAU * i / 96), r * 0.955 * math.sin(TAU * i / 96), 0.16)) for i in range(97)], 0.016, 6, rim_mat, cap=False))
    return parts


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
    centre = at(PLATE_AT[0], PLATE_AT[1])
    placemat = lathe("placemat", [(0.0, 0.0), (MAT_R, 0.0), (MAT_R + 0.05, 0.02), (MAT_R, 0.04), (0.0, 0.04)], 96, desk.woven_mat("placemat_fibre", L["mat"][0], L["mat"][1]))
    place(placemat, centre)
    china = props.glass_paint("china", L["plate"], 0.14)
    parent(coupe_plate("dinner_plate", china, PLATE_R, gold("gilt", "#e8c06a", 0.25)), "plate_pivot", centre + UP * 0.04)
    # the place card at the head of the table: heavy cream stock with a foil line, the title written on it
    card = at(CARD_AT[0], CARD_AT[1])
    w, d = 6.9, 2.6
    parts = [box("place_card", (w, d, 0.05), desk.letter_paper("card_paper", "#fbf4e4", "#f0e2c6"), 0.0, 0.03, 2)]
    line = [Vector((x, y, 0.058)) for (x, y) in rounded_rect(w - 0.5, d - 0.5, 0.12, 6)]
    line.append(line[0])
    parts.append(tube("place_card_line", line, 0.014, 6, gold("card_line", "#e0a860", 0.3), cap=False))
    parent(parts, "card_pivot", card, math.radians(-1.5))
    anchor("card", card + UP * 0.06)


def arm_point(side, t):
    """Where an arm's middle line is, `t` of the way from inside the head to its tip: the curve the bone is built on."""
    return desk.wishbone_point(side, t, ARM, SPREAD, BONE_R)


def bone():
    """The wishbone on the plate, in three layers that are rendered apart: its head, and each arm with the name tag tied to its end."""
    joint = at(JOINT_AT[0], JOINT_AT[1], WELL)
    twine = plain("twine", "#b8905a", 0.8)
    tag_paper = plain("tag_paper", "#cfa873", 0.75)
    layer("head")
    head, left, right, ends = desk.wishbone_parts("bone", desk.bone_material("bone"), ARM, SPREAD, BONE_R)
    parent(head, "head_pivot", joint)
    for side, arm, name in ((-1, left, "arm_l"), (1, right, "arm_r")):
        move([arm], name)
        parent([arm], name + "_pivot", joint)
        # the twine round the arm near its end
        c = joint + arm_point(side, 0.9)
        d = (arm_point(side, 0.95) - arm_point(side, 0.85)).normalized()
        across = d.cross(UP).normalized()
        rr = BONE_R * 1.2
        tube(name + "_loop", [c + across * (rr * math.cos(TAU * i / 32)) + UP * (rr * 0.92 * math.sin(TAU * i / 32)) for i in range(33)], 0.024, 6, twine, cap=False)
        # and the tag on it, lying over the rim, its eyelet towards the bone
        centre = joint + ends[0 if side < 0 else 1] + Vector((side * 0.9, -1.0, 0.0))
        centre.z = RIM
        rot = math.radians(5.0 * side) + (math.pi if side < 0 else 0.0)
        to = c + UP * rr - centre
        local = (to.x * math.cos(-rot) - to.y * math.sin(-rot), to.x * math.sin(-rot) + to.y * math.cos(-rot), to.z)
        t = props.tag(name + "_tag", tag_paper, 2.0, 0.92, string_to=local, string_mat=twine, ring_mat=gold(name + "_eyelet", "#e8c06a", 0.3))
        parent(t, name + "_tag_pivot", centre, rot)
        words = centre + Vector((0.14 * math.cos(rot), 0.14 * math.sin(rot), 0.03))
        anchor("tagLeft" if side < 0 else "tagRight", words)
        anchor("endLeft" if side < 0 else "endRight", joint + ends[0 if side < 0 else 1])
        anchor("breakLeft" if side < 0 else "breakRight", joint + arm_point(side, 0.12))
    anchor("joint", joint + Vector((0.0, 0.12, BONE_R)))
    anchor("plate", at(PLATE_AT[0], PLATE_AT[1], WELL))


def dressing(look, seed=5):
    """What else is on the table: leaves and lights across its head, little pumpkins, acorns, cranberries, tealights, a pie; cutlery, a napkin and cider for wide screens."""
    L = LOOKS[look]
    rnd = random.Random(seed)
    layer("props")
    stem = plain("stem", "#6a5a30", 0.8)
    skins = [desk.pumpkin_material("pumpkin_skin%d" % i, c) for i, c in enumerate(L["pumpkins"])]
    for i, (sx, sy, r, k) in enumerate(((-37, 98, 0.95, 0), (33, 100, 0.7, 1), (42, -95, 1.05, 1), (-47, -78, 0.6, 2), (73, 20, 1.2, 0), (-72, -34, 0.9, 2), (64, -64, 0.7, 0), (-70, 86, 1.1, 1))):
        parent(desk.pumpkin("pumpkin%d" % i, skins[k % len(skins)], stem, r, 9 if r > 0.8 else 8, 0.72, i + 3), "pumpkin_pivot%d" % i, at(sx, sy), rnd.uniform(0, TAU))

    leaves = [desk.leaf_material("leaf_skin%d" % i, a, b) for i, (a, b) in enumerate(L["leaves"])]
    spots = [(-46, 102, 1.5), (-29, 105, 1.2), (-18, 97, 1.35), (-5, 104, 1.15), (8, 98, 1.4), (20, 105, 1.2), (45, 92, 1.3), (50, 103, 1.45), (-54, 90, 1.1), (58, 88, 1.2),
             (-45, -90, 1.3), (-29, -106, 1.1), (24, -108, 1.25), (52, -102, 1.2), (-60, 22, 1.3), (62, -12, 1.2), (-68, 60, 1.4), (72, 70, 1.3), (-64, -72, 1.2), (74, -42, 1.1)]
    for i, (sx, sy, size) in enumerate(spots):
        parent(desk.maple_leaf("leaf%d" % i, leaves[i % len(leaves)], size, i + 1), "leaf_pivot%d" % i, at(sx, sy, 0.01 + 0.02 * (i % 3)), rnd.uniform(0, TAU))

    wire = plain("wire", "#2a2418", 0.6)
    bulb = emissive("bulb", "#ffd28a", 26.0)
    socket = plain("socket", "#3a3020", 0.5)
    props.fairy_lights("lights_top", [at(-88, 100, 0.3), at(-62, 92, 0.25), at(-36, 101, 0.34), at(-12, 94, 0.3), at(12, 102, 0.34), at(36, 93, 0.3), at(60, 100, 0.25), at(88, 93, 0.2)], wire, bulb, socket, 1.05, 0.105, 21)
    props.fairy_lights("lights_left", [at(-62, 92, 0.2), at(-48, 74, 0.12), at(-50.5, 46, 0.14), at(-47.5, 18, 0.14), at(-50.5, -12, 0.14), at(-47.5, -42, 0.14), at(-51, -66, 0.12), at(-70, -84, 0.08)], wire, bulb, socket, 1.5, 0.105, 22)
    props.fairy_lights("lights_right", [at(60, 100, 0.2), at(48.5, 78, 0.12), at(50.5, 50, 0.14), at(47.5, 22, 0.14), at(50.5, -8, 0.14), at(47.5, -38, 0.14), at(51, -62, 0.12), at(72, -82, 0.08)], wire, bulb, socket, 1.5, 0.105, 23)

    berry = props.glass_paint("cranberry", L["berry"], 0.2)
    for i, (sx, sy, n) in enumerate(((-22, 92, 5), (16, 90, 4), (27, -86, 6), (-52, -62, 4), (60, 60, 5))):
        parent(desk.cranberries("cran%d" % i, berry, n, 0.15, 0.55, i + 2), "cran_pivot%d" % i, at(sx, sy))
    nut = plain("acorn_nut", "#8a5a2a", 0.4, coat=0.3)
    cup = plain("acorn_cap", "#5a3c1c", 0.9)
    for i, (sx, sy) in enumerate(((-9, 91), (27, 95), (-22, -84), (12, -93), (-57, 42), (59, 4))):
        parent(desk.acorn("acorn%d" % i, nut, cup, 1.25), "acorn_pivot%d" % i, at(sx, sy), rnd.uniform(0, TAU))

    tin = plain("tea_cup", "#d9dde2", 0.25, 1.0)
    wax = plain("tea_wax", L["candle"], 0.5, sss=0.5, sss_scale=0.2)
    flame = emissive("flame", "#ffb85a", 60.0)
    wick = plain("wick", "#1a1208", 0.9)
    lit = [(-13, -99), (7, -105), (-61, 78), (63, 84)] + ([(-29, -86), (36, -82), (-40, 88), (40, 86)] if look == "candlelit" else [])
    for i, (sx, sy) in enumerate(lit):
        parent(desk.tealight("tea%d" % i, tin, wax, flame, wick, 0.5), "tea_pivot%d" % i, at(sx, sy))

    pie = desk.pie("pie", desk.crust_material("crust"), plain("pie_filling", "#b5602a", 0.35, coat=0.3, sss=0.2), plain("pie_cream", "#fffaf0", 0.5, sss=0.5, sss_scale=0.2), plain("pie_tin", "#b9bcc2", 0.3, 1.0), 2.4)
    parent(pie, "pie_pivot", at(-39, -108))

    # for wide screens: a napkin and a fork to the left, a knife and a glass of cider to the right
    steel = plain("steel", "#e3e6ea", 0.42, 1.0)
    parent(desk.napkin("napkin", cloth("napkin_cloth", L["napkin"], 30.0, 0.9, 0.8), 2.6, 4.6), "napkin_pivot", at(-65, -10), math.radians(3))
    parent(desk.cutlery("fork", steel, "fork", 4.4), "fork_pivot", at(-65, -9, 0.14), math.radians(2))
    parent(desk.cutlery("knife", steel, "knife", 4.6), "knife_pivot", at(63, -9), math.radians(-2))
    parent(desk.milk_glass("cider", desk.glass_material("tumbler", "#ffffff", 0.02), plain("cider_drink", "#c9762a", 0.1, coat=0.5, sss=0.3), 0.8, 2.0), "cider_pivot", at(67, 46))


def clothes_peg(name, wood_mat, wire_mat, length=2.6, width=0.46):
    """A wooden clothes peg seen flat on, lying along X with its jaws at -X: one stick of wood and the spring wire across it."""
    body = box(name, (length, width, 0.16), wood_mat, 0.0, 0.05, 3)
    x0 = length * 0.06
    half = width / 2 + 0.02
    wire = tube(name + "_wire", [Vector((x0, -half, 0.04)), Vector((x0, -half, 0.19)), Vector((x0 + 0.24, half, 0.19)), Vector((x0 + 0.24, half, 0.04))], 0.026, 8, wire_mat)
    return [body, wire]


def twine_fibre(name="twine_fibre", a="#c9a56c", b="#9a7a48"):
    """Jute twine: two tans, twisted round its length (X)."""
    m = Mat(name)
    x, y, z = m.sep(m.coords("Object"))
    twist = m.math("SINE", m.math("ADD", m.math("MULTIPLY", x, 60.0), m.math("MULTIPLY", m.math("ARCTAN2", z, y), 2.0)))
    fuzz, _ = m.noise(m.coords("Object"), 50.0, 2.0, 0.5)
    m.set(base=m.mix(m.math("MULTIPLY", m.math("ADD", twist, 1.0), 0.5), a, b), rough=0.9, sheen=0.6, normal=m.bump(m.math("ADD", twist, m.math("MULTIPLY", fuzz, 0.5)), 0.5, 0.01))
    return m.mat


NOTE = ("sheet", "catch_sheet", "peg", "catch_peg", "twine")


def stationery():
    """The note's things, each on a place of its own above the table: the letter's paper, a peg for the photos, the twine they hang from."""
    layer("sheet")
    top = at(0, 60, 2.0)
    parent(desk.letter_sheet("sheet", desk.letter_paper("sheet_paper", "#fbf4e4", "#f0e2c6"), 7.6, 12.0, gold("sheet_line", "#e0a860", 0.3)), "sheet_pivot", top)
    catcher(2.0, 9.0, "catch_sheet", (top.x, top.y - 6.0))
    layer("peg")
    mid = at(0, 0, 5.0)
    length = 2.6
    parent(clothes_peg("peg", desk.turned_wood("peg_wood", "#e3c79a", "#c2a070", 0.62), plain("peg_wire", "#c9ccd2", 0.25, 1.0), length), "peg_pivot", mid, math.pi / 2)
    # Turned a quarter, its jaws point down the stage: they hold the top third of... the sheet, which ends this far up it.
    edge = -length / 2 + length * 0.36
    catcher(5.0, 3.0, "catch_peg", (mid.x, mid.y + edge - 3.0))
    anchor("pegEdge", mid + Vector((0, edge, 0)))
    layer("twine")
    line = at(0, -40, 5.0)
    strand = tube("twine", [Vector((-4.0 + 8.0 * i / 16, 0.0, 0.0)) for i in range(17)], 0.045, 10, twine_fibre())
    place(strand, line)


WIDE = (160.0, 240.0, 10.0)
PHONE = (100.0, 240.0, 12.0)
OPT = kit.cli()
MOVING = ("head", "arm_l", "arm_r", "catch_plate") + NOTE


def build(look, view=WIDE, dress=True):
    reset()
    kit.MANIFEST["bulbs"] = []
    setup(view[0], view[1], view[2], OPT["samples"] or 220, OPT["preview"])
    lights(key=3300.0, world=0.2, hdri="studio.exr")
    table(look)
    if dress:
        dressing(look)
    bone()
    stationery()
    centre = at(PLATE_AT[0], PLATE_AT[1])
    catcher(WELL, 7.0, "catch_plate", (centre.x, centre.y))
    catcher()
    glow(1.4, 7)


def note_sprites(out):
    render_sprite("sheet", os.path.join(out, "sheet.png"), ["sheet"], catch=("catch_sheet",), pad=(1.5, 1.5, 3.0, 3.0), density=1.3)
    render_sprite("peg", os.path.join(out, "peg.png"), ["peg"], catch=("catch_peg",), pad=(1.5, 1.5, 3.0, 3.0), density=1.6)
    render_sprite("twine", os.path.join(out, "twine.png"), ["twine"], catch=(), pad=(0.0, 1.0, 0.0, 1.0), density=1.6)


def sprites(out):
    build("gingham", WIDE, dress=False)
    for name, layers in (("head", ["head"]), ("arm-left", ["arm_l"]), ("arm-right", ["arm_r"])):
        render_sprite(name, os.path.join(out, name + ".png"), layers, catch=("catch_plate",), pad=(2.0, 2.0, 5.0, 5.0), density=1.4)
    note_sprites(out)


def main():
    out = OPT["out"]
    looks = OPT["look"] or list(LOOKS)
    only = OPT["only"] or ["sprites", "plates", "soft"]
    if "beauty" in only:
        for look in looks:
            build(look)
            render_plate(os.path.join(out, "beauty-%s.png" % look), hide=("catch", "catch_plate") + NOTE)
    if "sprites" in only:
        sprites(out)
    elif "note" in only:
        build("gingham", WIDE, dress=False)
        note_sprites(out)
    if "plates" in only:
        for look in looks:
            for (tag_, view) in (("wide", WIDE), ("phone", PHONE)):
                build(look, view)
                render_plate(os.path.join(out, "plate-%s-%s.png" % (look, tag_)), hide=("catch",) + MOVING)
    elif "sprites" in only:
        build(looks[0], WIDE)   # the bulbs' places, for the twinkle
    if "soft" in only:
        for look in looks:
            for (tag_, view) in (("wide", WIDE), ("phone", PHONE)):
                build(look, view)
                kit.render_soft(os.path.join(out, "soft-%s-%s.png" % (look, tag_)), hide=("catch",) + MOVING)
    kit.MANIFEST["sheets"] = {"letter": {"sprite": "sheet", "top": 0.12, "mid": 0.5, "bottom": 0.1, "gain": 1.05}}
    save_manifest(os.path.join(out, "manifest.json"))


main()
