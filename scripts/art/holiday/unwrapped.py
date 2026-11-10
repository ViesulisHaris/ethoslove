"""
Unwrapped's table: presents on a floor by the tree, seen from above.

    blender --background --factory-startup --python unwrapped.py -- --out <dir> [--preview] [--look red] [--only beauty]

Makes, per look, the plate (everything that never moves) for phones and for wide screens, and once
for all looks the sprites: each wrapped box, each ribbon and bow, the tag, and the opened box.
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
from kit import (K, TAU, Mat, anchor, at, box, catcher, cloth, emissive, glow, gold, grid, lamp, lathe, layer, lights, lin, mesh_obj,  # noqa: E402
                 paper, parent, place, plain, prism, render_plate, render_sprite, reset, rounded_rect, satin, save_manifest, setup,
                 solidify, sphere, subsurf, displace, tube, wood)
import props  # noqa: E402
import props_desk as desk  # noqa: E402

# The present they open: its footprint on the table and how tall it stands.
BOX_W, BOX_D, BOX_H = 7.4, 7.2, 3.3
BOX_AT = (0.0, -4.0)

LOOKS = {
    "red": dict(
        floor=("wood", "#5d3a22", "#2e1a0f"),
        small=[("#f4ead8", "pinstripes", "#b8232b", 3.2, "#b8232b"), ("#1f4f3a", "tartan", "#143626", 1.3, "#f1e2c4"), ("#b8232b", "stars", "#f8ecd8", 2.6, "#f1e2c4")],
        baubles=["#b01f28", "#e8c27a", "#f3ead9"],
        mug="#f3ead9",
    ),
    "kraft": dict(
        floor=("wood", "#c9a57c", "#a67c52"),
        small=[("#b98d5e", "stars", "#fbf3e3", 2.6, "#b8232b"), ("#f4ead8", "pinstripes", "#2f6b4f", 3.2, "#2f6b4f"), ("#9c6e43", "dots", "#fbf3e3", 2.2, "#f1e2c4")],
        baubles=["#b8232b", "#f3ead9", "#c9962f"],
        mug="#b8232b",
    ),
    "plaid": dict(
        floor=("cloth", "#1d3b2a", None),
        small=[("#a8232a", "tartan", "#5e1016", 1.3, "#f1e2c4"), ("#f4ead8", "dots", "#a8232a", 2.2, "#a8232a"), ("#244d34", "pinstripes", "#e8c27a", 3.2, "#e8c27a")],
        baubles=["#b01f28", "#e8c27a", "#f3ead9"],
        mug="#f3ead9",
    ),
    "pink": dict(
        floor=("cloth", "#f3c9d6", None),
        small=[("#fdf1f4", "dots", "#e8789c", 2.2, "#e8789c"), ("#ef9ab3", "pinstripes", "#fdf1f4", 3.2, "#fdf1f4"), ("#f8dfe6", "stars", "#d9a441", 2.6, "#d9a441")],
        baubles=["#f29bb5", "#f3ead9", "#e8c27a"],
        mug="#fdf1f4",
    ),
}

# The papers the big present comes in, by name: (base, print, ink, scale of the print, second ink).
PAPERS = {
    "red-dots": ("#b8232b", "dots", "#f8ecd8", 1.25, None),
    "green-stripes": ("#1f4f3a", "stripes", "#2d6a4f", 1.1, None),
    "kraft-stars": ("#b98d5e", "stars", "#fbf3e3", 1.5, None),
    "kraft-stripes": ("#9c6e43", "stripes", "#ad7d50", 1.1, None),
    "tartan-green": ("#244d34", "tartan", "#12301f", 0.62, "#e9d7a8"),
    "tartan-red": ("#a8232a", "tartan", "#5e1016", 0.62, "#f1e2c4"),
    "pink-stripes": ("#ef9ab3", "stripes", "#f7b9cb", 1.1, None),
    "blush-dots": ("#fdf1f4", "dots", "#e8789c", 1.25, None),
    "gold": ("#e9b955", "stars", "#fff3c9", 1.5, None),
}
RIBBONS = {"cream": "#f7ead2", "red": "#a3151f", "blush": "#f2b6c8", "gold": "#e2b04a"}
# What the opened box is lined with, by look.
TISSUE = {"red": "#1f5a40", "kraft": "#f6eddc", "plaid": "#a3151f", "pink": "#f7c3d2"}


def floor(look):
    layer("table")
    kind, a, b = LOOKS[look]["floor"]
    if kind == "wood":
        mat = wood("floor", a, b, 1.9, 0.38)
        ob = mesh_obj("floor", [(-60, -60, 0), (60, -60, 0), (60, 60, 0), (-60, 60, 0)], [(0, 1, 2, 3)], mat, smooth=False)
    else:
        mat = cloth("floor", a, 26.0, 0.9, 0.8)
        ob = grid("floor", 60.0, 60.0, 220, 220, mat)
        displace(ob, 0.05, 2.6, "CLOUDS", 2)
    return ob


def main_present(paper_name="red-dots", ribbon="cream", tag_on=True):
    """The one in the middle, in layers of its own so each can be rendered apart: box, ribbon, tag."""
    base, kind, ink, scale, ink2 = PAPERS[paper_name]
    loc = at(*BOX_AT)
    layer("box")
    body = box("present", (BOX_W, BOX_D, BOX_H), paper("paper_main", base, kind, ink, scale, ink2, foil=paper_name == "gold"), 0.0, 0.06, 3)
    body.location = loc
    layer("ribbon")
    sat = satin("ribbon_main", RIBBONS[ribbon])
    parts = props.wrap("present_wrap", BOX_W, BOX_D, BOX_H, sat, 0.95)
    parts += props.bow("present_bow", sat, 1.12, 2.45, 1.05, BOX_H + 0.03, tails=2.75)
    parent(parts, "ribbon_pivot", loc)
    layer("tag")
    if tag_on:
        t = props.tag("tag", plain("tag_paper", "#fbf3e2", 0.7), 2.5, 1.15, string_to=(-1.9, 2.3, 0.35), string_mat=plain("twine", "#b8905a", 0.8), ring_mat=gold("tag_ring"),
                      back_mat=plain("tag_back", "#a3151f", 0.6))
        pivot = parent(t, "tag_pivot", loc + Vector((2.1, -2.55, BOX_H + 0.1)), math.radians(-8))
        anchor("tag", pivot.location + Vector((0.15, 0.0, 0.05)))
    anchor("boxTop", loc + Vector((0, 0, BOX_H)))


def open_box(tissue_color="#1f5a40"):
    """What is under the paper: a white gift box, open, lined with tissue, with a card lying on it for the number."""
    layer("open")
    loc = at(*BOX_AT)
    t = 0.11
    inset = 0.03
    bw, bd = BOX_W - 2 * inset, BOX_D - 2 * inset
    white = plain("box_white", "#fbf6ec", 0.55)
    for (sx, sy, w, d) in ((0, -(bd - t) / 2, bw, t), (0, (bd - t) / 2, bw, t), (-(bw - t) / 2, 0, t, bd), ((bw - t) / 2, 0, t, bd)):
        wall = box("open_wall", (w, d, BOX_H - 0.02), white, 0.0, 0.02, 2)
        wall.location = loc + Vector((sx, sy, 0))
    # tissue: soft folds, tucked up the walls, a fine crinkle in its surface
    tm = Mat("tissue")
    obj = tm.coords("Object")
    crinkle, _ = tm.voronoi(obj, 3.2, "DISTANCE_TO_EDGE")
    fine, _ = tm.noise(obj, 14.0, 3.0, 0.6)
    tm.set(base=tissue_color, rough=0.62, sss=0.25, sss_scale=0.12, sheen=0.5, sheen_rough=0.4,
           normal=tm.bump(tm.math("ADD", tm.math("MULTIPLY", crinkle, 0.7), tm.math("MULTIPLY", fine, 0.12)), 0.55, 0.05))
    n = 96
    tw, td = bw - 2 * t + 0.02, bd - 2 * t + 0.02
    verts = []
    for j in range(n + 1):
        for i in range(n + 1):
            x = -tw / 2 + tw * i / n
            y = -td / 2 + td * j / n
            edge = max(abs(x) / (tw / 2), abs(y) / (td / 2))
            z = BOX_H - 0.66 + 0.2 * mnoise.fractal(Vector((x * 0.75, y * 0.75, 3.7)), 1.0, 2.1, 4) + 0.46 * edge ** 5
            verts.append((x, y, z))
    faces = [(j * (n + 1) + i, j * (n + 1) + i + 1, (j + 1) * (n + 1) + i + 1, (j + 1) * (n + 1) + i) for j in range(n) for i in range(n)]
    tissue = mesh_obj("tissue", verts, faces, tm.mat, True)
    tissue.location = loc
    card_w, card_d = 5.9, 5.6
    cm = Mat("card_stock")
    fibre, _ = cm.noise(cm.coords("Object"), 30.0, 3.0, 0.6)
    cm.set(base="#fffaf0", rough=0.5, normal=cm.bump(fibre, 0.08, 0.004), spec=0.3)
    card = prism("card", rounded_rect(card_w, card_d, 0.18), 0.035, cm.mat, 0.0, 0.01, 2)
    card.location = loc + Vector((0, 0.0, BOX_H - 0.2))
    foil = gold("card_foil", "#f2c66c", 0.2)
    for (inset, width) in ((0.2, 0.05), (0.33, 0.016)):
        outer = rounded_rect(card_w - 2 * inset, card_d - 2 * inset, 0.1)
        inner = rounded_rect(card_w - 2 * inset - 2 * width, card_d - 2 * inset - 2 * width, 0.1 - width * 0.5)
        n_pts = len(outer)
        verts = [(x, y, 0.0) for (x, y) in outer] + [(x, y, 0.0) for (x, y) in inner]
        faces = [(i, (i + 1) % n_pts, n_pts + (i + 1) % n_pts, n_pts + i) for i in range(n_pts)]
        frame = mesh_obj("card_frame", verts, faces, foil, smooth=False)
        frame.location = card.location + Vector((0, 0, 0.0375))
    anchor("card", card.location + Vector((0, 0, 0.035)))
    anchor("cardCorner", card.location + Vector((card_w / 2, card_d / 2, 0.035)))


def dressing(look, seed=7):
    """Everything round the present that only sits there: the bough along the top, lights, sweets, small gifts, stars."""
    L = LOOKS[look]
    rnd = random.Random(seed)
    layer("props")
    needles = props.needle_material("needles")
    stem = plain("stem", "#4a3020", 0.8)
    wire = plain("wire", "#1c2a1c", 0.6)
    bulb = emissive("bulb", "#ffd28a", 26.0)
    socket = plain("socket", "#2a3a2a", 0.5)
    cap = gold("cap")
    berry = props.glass_paint("berry", "#b01620", 0.2)

    # the bough across the top, tips to left and right, and two sprigs lower down
    for (sx, sy, rot, ln, sd) in ((-6, 102, math.radians(177), 5.6, 1), (6, 101, math.radians(3), 5.8, 2), (-38, 97, math.radians(198), 4.4, 3), (38, 96, math.radians(-16), 4.6, 4),
                                  (-10, 96, math.radians(162), 3.6, 7), (10, 95, math.radians(20), 3.6, 8),
                                  (-56, -104, math.radians(30), 3.8, 5), (64, -110, math.radians(160), 3.8, 6)):
        parent(props.pine_branch("pine%d" % sd, needles, stem, ln, sd, 8), "pine_pivot%d" % sd, at(sx, sy, 0.02), rot)
    for i, (sx, sy) in enumerate(((-24, 97), (17, 94), (44, 88), (-47, 90))):
        parent(props.berries("berries%d" % i, berry, 3, 0.15, i), "berry_pivot%d" % i, at(sx, sy, 0.1), rnd.uniform(0, TAU))

    # the lights: through the bough, then down both sides of the floor
    props.fairy_lights("lights_top", [at(-88, 99, 0.3), at(-62, 91, 0.25), at(-36, 100, 0.34), at(-12, 93, 0.3), at(12, 101, 0.34), at(36, 92, 0.3), at(60, 99, 0.25), at(88, 92, 0.2)], wire, bulb, socket, 1.05, 0.105, 1)
    props.fairy_lights("lights_left", [at(-62, 91, 0.2), at(-47, 72, 0.05), at(-50, 44, 0.05), at(-46, 16, 0.05), at(-50, -14, 0.05), at(-46, -44, 0.05), at(-52, -70, 0.05), at(-70, -90, 0.05)], wire, bulb, socket, 1.5, 0.105, 2)
    props.fairy_lights("lights_right", [at(60, 99, 0.2), at(48, 76, 0.05), at(50, 48, 0.05), at(46, 20, 0.05), at(50, -10, 0.05), at(47, -40, 0.05), at(52, -64, 0.05), at(72, -84, 0.05)], wire, bulb, socket, 1.5, 0.105, 3)

    # baubles tucked into the bough and at the bottom
    cols = L["baubles"]
    for i, (sx, sy, r) in enumerate(((-33, 90, 0.62), (27, 88, 0.72), (2, 91, 0.5), (-44, -73, 0.7), (-36, -66, 0.42), (44, -108, 0.6))):
        mat = props.glass_paint("bauble%d" % i, cols[i % len(cols)], 0.12)
        parent(props.bauble("bauble%d" % i, r, mat, cap), "bauble_pivot%d" % i, at(sx, sy), rnd.uniform(-0.6, 0.6))

    # small presents in three corners
    spots = (((-64, -92), 3.4, 2.6, 1.7, math.radians(14)), ((57, 64), 3.0, 3.0, 2.0, math.radians(-12)), ((-66, 40), 3.6, 2.8, 1.8, math.radians(8)))
    for i, ((sx, sy), w, d, h, rot) in enumerate(spots):
        base, kind, ink, scale, rib = L["small"][i % 3]
        body, ribs = props.present("small%d" % i, w, d, h, paper("small_paper%d" % i, base, kind, ink, scale, "#f1e2c4"), satin("small_ribbon%d" % i, rib), 0.42, True, 0.62)
        parent([body] + ribs, "small_pivot%d" % i, at(sx, sy), rot)

    # sweets at the bottom right, cocoa at the bottom left
    candy = props.candy_material("candy")
    for i, (sx, sy, rot) in enumerate(((39, -77, math.radians(-28)), (45, -81, math.radians(-64)))):
        cane = props.candy_cane("cane%d" % i, candy, 2.3, 0.13, 0.4)
        place(cane, at(sx, sy, 0.0 + 0.1 * i), rot=(0, 0, rot))
    cookie = props.cookie_material("cookie")
    icing = plain("icing", "#fffaf2", 0.35, coat=0.4)
    red = props.glass_paint("gumdrop", "#c01a28", 0.25)
    dark = plain("eye", "#2a160c", 0.4)
    parent(props.gingerbread("gingerA", cookie, icing, red, dark, 1.5), "ginger_pivot", at(29, -93, 0.0), math.radians(-16))
    parent(props.star_cookie("starcookie", cookie, icing, 0.72), "starcookie_pivot", at(13, -100, 0.0), math.radians(20))
    mug_parts = props.mug("mug", props.glass_paint("mug_glaze", L["mug"], 0.2), plain("cocoa", "#4a2616", 0.25, coat=0.6), [plain("mallow_w", "#fffaf4", 0.8, sss=0.4), plain("mallow_p", "#fbd3dc", 0.8, sss=0.4)], 1.05, 1.5)
    parent(mug_parts, "mug_pivot", at(-30, -90, 0.0), math.radians(205))
    parent(props.cinnamon("cinnamon", plain("cinnamon_bark", "#7a4526", 0.85)), "cinnamon_pivot", at(-9, -103, 0.0), math.radians(24))
    slice_mat = props.orange_slice_material()
    for i, (sx, sy) in enumerate(((-6, -92), (-12, -86))):
        place(props.orange_slice("orange%d" % i, slice_mat, 0.6), at(sx, sy, 0.004 + 0.05 * i), rot=(0, 0, rnd.uniform(0, TAU)))

    # foil stars, thrown
    props.stars("stars", gold("star_foil", "#ffcf6a", 0.2), 34, (-70, -112, 70, 86), 3, (0.1, 0.19),
                avoid=[(-40, -44, 40, 46), (-34, -66, 34, -54), (-28, -78, 28, -66)])


WIDE = (160.0, 240.0, 10.0)     # what a tablet or a laptop sees: the stage and a good way either side
PHONE = (100.0, 240.0, 12.0)    # what a phone sees: the stage's own width, sharper


def build(look, view=WIDE, dress=True):
    reset()
    kit.MANIFEST["bulbs"] = []
    setup(view[0], view[1], view[2], OPT["samples"] or 220, OPT["preview"], exposure=OPT["exposure"] if OPT["exposure"] is not None else 0.75,
          view=OPT["view"] or "Filmic", contrast=OPT["contrast"] or "Very High Contrast")
    lights(key=3300.0, world=0.2, hdri="studio.exr")
    floor(look)
    if dress:
        dressing(look)
    main_present("red-dots", "cream")
    open_box(TISSUE[look])
    stationery()
    catcher()
    lid = at(*BOX_AT)
    catcher(BOX_H + 0.03, BOX_W / 2 - 0.05, "catch_lid", (lid.x, lid.y))
    glow(1.4, 7)


OPT = kit.cli()
# what the note at the end is made of: never on the table
NOTE = ("sheet", "catch_sheet", "receipt", "catch_receipt", "tape", "catch_tape")
MOVING = ("box", "ribbon", "tag", "open", "catch_lid") + NOTE


def stationery():
    """The note's things, each on a place of its own above the table: the letter's paper, the receipt's, a strip of gold tape for the photos."""
    layer("sheet")
    top = at(0, 60, 2.0)
    parent(desk.letter_sheet("sheet", desk.letter_paper("sheet_paper"), 7.6, 12.0, gold("sheet_line", "#f0c46a", 0.28)), "sheet_pivot", top)
    catcher(2.0, 9.0, "catch_sheet", (top.x, top.y - 6.0))
    layer("receipt")
    top = at(0, 56, 5.0)
    parent(desk.receipt_paper("receipt", desk.letter_paper("receipt_paper", "#fcfbf7", "#efece4"), 6.6, 11.0), "receipt_pivot", top)
    catcher(5.0, 9.0, "catch_receipt", (top.x, top.y - 5.5))
    layer("tape")
    mid = at(0, 0, 8.0)
    parent(desk.tape_strip("tape", desk.foil_tape()), "tape_pivot", mid)
    catcher(8.0, 4.0, "catch_tape", (mid.x, mid.y))


def set_paper(name):
    base, kind, ink, scale, ink2 = PAPERS[name]
    body = bpy.data.objects["present"]
    body.data.materials[0] = paper("paper_" + name, base, kind, ink, scale, ink2, foil=name == "gold")


def catchers(names, on):
    for n in names:
        for ob in bpy.data.collections[n].all_objects:
            if ob.type == "MESH":
                ob.is_shadow_catcher = on


def note_sprites(out):
    render_sprite("sheet", os.path.join(out, "sheet.png"), ["sheet"], catch=("catch_sheet",), pad=(1.5, 1.5, 3.0, 3.0), density=1.3)
    render_sprite("receipt", os.path.join(out, "receipt.png"), ["receipt"], catch=("catch_receipt",), pad=(1.5, 1.5, 3.0, 3.0), density=1.3)
    render_sprite("tape", os.path.join(out, "tape.png"), ["tape"], catch=("catch_tape",), pad=(1.0, 1.0, 1.5, 1.5), density=1.6)


def sprites(out):
    """Everything that moves, each by itself: the wrapped box in every paper, the ribbon in every colour, the tag, the opened box."""
    build("red", WIDE, dress=False)
    note_sprites(out)
    for name in PAPERS:
        if OPT["only"] and "sprites" not in OPT["only"] and name not in OPT["only"]:
            continue
        set_paper(name)
        # no shadow of its own: the opened box under it has the same footprint and keeps the shadow when the paper is gone
        render_sprite("box-" + name, os.path.join(out, "box-%s.png" % name), ["box"], catch=(), pad=(1.0, 1.0, 1.0, 1.0), density=1.3)
    catchers(["box"], True)
    for name, color in RIBBONS.items():
        bpy.data.materials["ribbon_main"].node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = lin(color)
        render_sprite("ribbon-" + name, os.path.join(out, "ribbon-%s.png" % name), ["ribbon"], catch=("catch", "box"), pad=(2.0, 3.0, 4.0, 3.0), density=1.3)
    render_sprite("tag", os.path.join(out, "tag.png"), ["tag"], catch=("catch_lid",), pad=(2.0, 2.0, 3.0, 3.0), density=1.3)
    catchers(["box"], False)
    tissue = bpy.data.materials["tissue"].node_tree.nodes["Principled BSDF"].inputs["Base Color"]
    for look, color in TISSUE.items():
        tissue.default_value = lin(color)
        render_sprite("open-" + look, os.path.join(out, "open-%s.png" % look), ["open"], pad=(2.0, 2.0, 30.0, 26.0), density=1.3)


def main():
    out = OPT["out"]
    looks = OPT["look"] or list(LOOKS)
    only = OPT["only"] or ["sprites", "plates", "soft"]
    if "beauty" in only:
        for look in looks:
            build(look)
            render_plate(os.path.join(out, "beauty-%s.png" % look), hide=("catch", "catch_lid", "open") + NOTE)
    if "open-beauty" in only:
        build(looks[0])
        render_plate(os.path.join(out, "beauty-open.png"), hide=("catch", "catch_lid", "box", "ribbon", "tag") + NOTE)
    if "sprites" in only or any(o in PAPERS for o in only):
        sprites(out)
    elif "note" in only:
        build("red", WIDE, dress=False)
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
    kit.MANIFEST["sheets"] = {"letter": {"sprite": "sheet", "top": 0.12, "mid": 0.5, "bottom": 0.1, "gain": 1.06}, "receipt": {"sprite": "receipt", "top": 0.14, "mid": 0.5, "bottom": 0.14, "gain": 1.07}}
    save_manifest(os.path.join(out, "manifest.json"))


main()
