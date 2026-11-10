"""
The Nice List's table: Santa's desk from above, a scroll on a leather pad.

    blender --background --factory-startup --python nice_list.py -- --out <dir> [--preview] [--look red] [--only beauty]

Makes, per look, the plate for phones and for wide screens, and once for all looks the sprites:
the scroll's top rod, the roll of paper still to come, the paper itself, the ribbon and bow that
tie it (in each colour), the tag, the rubber stamp and a wax seal.
"""

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import kit  # noqa: E402
from kit import (TAU, Mat, anchor, at, box, catcher, emissive, glow, gold, lathe, layer, lights, lin, mesh_obj, paper, parent, place, plain,  # noqa: E402
                 render_plate, render_sprite, reset, satin, save_manifest, setup, sphere, wood)
import props  # noqa: E402
import props_desk as desk  # noqa: E402

# The scroll: where its top rod lies on the stage (units from the middle), how wide the paper is, how long it can get.
ROD_AT = (0.0, 49.0)
PAPER_W = 7.4
PAPER_LEN = 12.6
ROD_R = 0.2
ROLL_R = 0.44
ROLL_DROP = ROD_R + ROLL_R + 0.03
PAD_TOP = 0.047     # the leather pad the scroll lies on is this thick

LOOKS = {
    "red": dict(desk=("#5d3a22", "#2e1a0f"), pad="#6e1620", line="gold", baubles=["#b01f28", "#e8c27a", "#f3ead9"], berry="#b01620", mug="#f3ead9"),
    "pink": dict(desk=("#e3cdb6", "#c9ad90"), pad="#eeb4c4", line="gold", baubles=["#f29bb5", "#f3ead9", "#e8c27a"], berry="#d8467b", mug="#fdf1f4"),
    "blue": dict(desk=("#7f93ae", "#5d7190"), pad="#1b2c4d", line="silver", baubles=["#8fb3e8", "#f3f6fb", "#c9d3e0"], berry="#f3f6fb", mug="#f3f6fb"),
    "green": dict(desk=("#5d3a22", "#2e1a0f"), pad="#17472f", line="gold", baubles=["#b01f28", "#e8c27a", "#f3ead9"], berry="#b01620", mug="#b8232b"),
}
RIBBONS = {"red": "#a3151f", "pink": "#e8789c", "blue": "#7fa6e0"}


def table(look):
    L = LOOKS[look]
    layer("table")
    mesh_obj("desk", [(-60, -60, 0), (60, -60, 0), (60, 60, 0), (-60, 60, 0)], [(0, 1, 2, 3)], wood("desk_wood", L["desk"][0], L["desk"][1], 2.3, 0.36), smooth=False)
    line = gold("pad_line", "#f0c46a", 0.25) if L["line"] == "gold" else plain("pad_line", "#e6ebf2", 0.22, 1.0)
    parent(desk.desk_pad("pad", 9.2, 14.1, desk.leather("pad_leather", L["pad"]), line), "pad_pivot", at(0, -12, 0.0))


def scroll(ribbon="red"):
    """The scroll as it is tied: the rod, the roll right under it, the paper beneath both, the ribbon round the two."""
    top = at(ROD_AT[0], ROD_AT[1], PAD_TOP)
    brass = gold("brass", "#f0c46a", 0.22)
    rod_wood = desk.turned_wood("rod_wood")
    paper_mat = desk.parchment("parchment", half_w=PAPER_W / 2)
    layer("paper")
    sheet = desk.paper_sheet("paper", paper_mat, PAPER_W, PAPER_LEN)
    sheet.location = top
    layer("roller")
    parent(desk.rod("rod", 8.1, ROD_R, rod_wood, brass, 0.3), "rod_pivot", top)
    layer("roll")
    roll_at = top + Vector((0, -ROLL_DROP, 0))
    rolled = desk.rolled_parchment("rolled_parchment", half_w=PAPER_W / 2)
    parent(desk.paper_roll("roll", PAPER_W + 0.04, ROLL_R, rolled, rod_wood, brass), "roll_pivot", roll_at)
    layer("ribbon")
    sat = satin("ribbon_main", RIBBONS[ribbon])
    cy = -ROLL_DROP * 0.56
    band = desk.band_round("band", sat, cy, 0.4, ROLL_DROP * 0.5 + ROLL_R * 0.86, 0.5, 0.3)
    bow = props.bow("bow", sat, 0.86, 1.6, 0.74, 0.9, tails=2.3, tail_spread=0.42, ground=0.05, edge=0.62)
    for b in bow:
        b.location.y += cy
    parent([band] + bow, "ribbon_pivot", top)
    layer("tag")
    t = props.tag("tag", plain("tag_paper", "#fbf3e2", 0.7), 2.5, 1.15, string_to=(-1.7, 2.4, 0.9), string_mat=plain("twine", "#b8905a", 0.8), ring_mat=brass, back_mat=plain("tag_back", "#a3151f", 0.6))
    pivot = parent(t, "tag_pivot", top + Vector((2.0, cy - 2.75, 0.05)), math.radians(-9))
    anchor("tag", pivot.location + Vector((0.27, 0.0, 0.05)))
    anchor("rod", top + Vector((0, 0, ROD_R)))
    anchor("paperTop", top + Vector((0, 0, 0.012)))
    anchor("roll", roll_at + Vector((0, 0, ROLL_R)))


PAD_RED = (-32.0, -86.0, math.radians(8))
PAD_GREEN = (-16.0, -92.0, math.radians(-7))


def stamp_and_seal():
    layer("stamp")
    wood_mat = desk.turned_wood("stamp_wood", "#7a4a28", "#44260f")
    parts = desk.stamp_tool("stamp", wood_mat, gold("stamp_brass", "#f0c46a", 0.22), plain("stamp_rubber", "#5e1016", 0.8))
    loc = at(PAD_RED[0], PAD_RED[1], 0.29)
    parent(parts, "stamp_pivot", loc, PAD_RED[2])
    anchor("stamp", loc)
    anchor("padRed", at(PAD_RED[0], PAD_RED[1], 0.29))
    anchor("padGreen", at(PAD_GREEN[0], PAD_GREEN[1], 0.29))
    layer("seal")
    wm = Mat("wax")
    n, _ = wm.noise(wm.coords("Object"), 6.0, 3.0, 0.5)
    wm.set(base="#a3151f", rough=0.22, coat=0.6, coat_rough=0.1, sss=0.3, sss_scale=0.05, normal=wm.bump(n, 0.05, 0.01))
    parent(desk.wax_seal("seal", wm.mat, 0.5), "seal_pivot", at(0, 0, PAD_TOP + 0.012))
    # a brass paper clip, for the photos on the letter: on a sheet of its own, well above the desk
    layer("clip")
    loc = at(0, -40, 1.2)
    parts, edge = desk.paper_clip("clip", gold("clip_brass", "#f0c46a", 0.2))
    parent(parts, "clip_pivot", loc)
    catcher(1.2, 3.0, "catch_clip", centre=(loc.x, loc.y + edge - 3.0))
    anchor("clipEdge", loc + Vector((0, edge, 0)))


def dressing(look, seed=11):
    """What stands about the desk: the bough and lights across the top, the ink pads, Santa's glasses, a pen, letters, cookies and milk."""
    L = LOOKS[look]
    rnd = random.Random(seed)
    layer("props")
    needles = props.needle_material("needles")
    stem = plain("stem", "#4a3020", 0.8)
    wire = plain("wire", "#1c2a1c", 0.6)
    bulb = emissive("bulb", "#ffd28a", 26.0)
    socket = plain("socket", "#2a3a2a", 0.5)
    cap = gold("cap")
    brass = gold("brass2", "#f0c46a", 0.22)
    berry = props.glass_paint("berry", L["berry"], 0.2)

    for (sx, sy, rot, ln, sd) in ((-8, 103, math.radians(175), 5.6, 21), (8, 102, math.radians(5), 5.8, 22), (-40, 98, math.radians(200), 4.4, 23), (40, 97, math.radians(-18), 4.6, 24),
                                  (-12, 97, math.radians(160), 3.4, 27), (12, 96, math.radians(22), 3.6, 28), (-30, -118, math.radians(8), 3.6, 25), (62, -112, math.radians(162), 3.8, 26)):
        parent(props.pine_branch("pine%d" % sd, needles, stem, ln, sd, 8), "pine_pivot%d" % sd, at(sx, sy, 0.02), rot)
    for i, (sx, sy) in enumerate(((-26, 98), (19, 95), (45, 90), (-46, 92))):
        parent(props.berries("berries%d" % i, berry, 3, 0.15, i + 20), "berry_pivot%d" % i, at(sx, sy, 0.1), rnd.uniform(0, TAU))
    props.fairy_lights("lights_top", [at(-88, 100, 0.3), at(-62, 92, 0.25), at(-36, 101, 0.34), at(-12, 94, 0.3), at(12, 102, 0.34), at(36, 93, 0.3), at(60, 100, 0.25), at(88, 93, 0.2)], wire, bulb, socket, 1.05, 0.105, 21)
    props.fairy_lights("lights_left", [at(-62, 92, 0.2), at(-48, 74, 0.05), at(-50.5, 46, 0.05), at(-47.5, 18, 0.05), at(-50.5, -12, 0.05), at(-47.5, -42, 0.05), at(-51, -66, 0.05), at(-70, -84, 0.05)], wire, bulb, socket, 1.5, 0.105, 22)
    props.fairy_lights("lights_right", [at(60, 100, 0.2), at(48.5, 78, 0.05), at(50.5, 50, 0.05), at(47.5, 22, 0.05), at(50.5, -8, 0.05), at(47.5, -38, 0.05), at(51, -62, 0.05), at(72, -82, 0.05)], wire, bulb, socket, 1.5, 0.105, 23)
    cols = L["baubles"]
    for i, (sx, sy, r) in enumerate(((-34, 92, 0.6), (29, 90, 0.7), (-2, 93, 0.48))):
        parent(props.bauble("bauble%d" % i, r, props.glass_paint("bauble%d" % i, cols[i % len(cols)], 0.12), cap), "bauble_pivot%d" % i, at(sx, sy), rnd.uniform(-0.6, 0.6))

    # the ink pads (the stamp stands on the red one), bottom left
    tin = plain("tin", "#20201f", 0.3, 0.9)
    parent(desk.ink_pad("pad_red", tin, "#a8141e"), "inkred_pivot", at(PAD_RED[0], PAD_RED[1]), PAD_RED[2])
    parent(desk.ink_pad("pad_green", tin, "#1f7a44"), "inkgreen_pivot", at(PAD_GREEN[0], PAD_GREEN[1]), PAD_GREEN[2])

    # his glasses, bottom middle; ink and a quill, bottom right
    lens = desk.glass_material("lens", "#f4fbff", 0.0)
    parent(desk.spectacles("specs", brass, lens, 0.6), "specs_pivot", at(4, -99, 0.0), math.radians(7))
    glass = desk.glass_material("inkglass", "#dfe9f2", 0.03)
    parent(desk.inkwell("inkwell", glass, brass, plain("ink", "#0c0c14", 0.15, coat=0.8)), "inkwell_pivot", at(24, -87, 0.0))
    parent(desk.quill("quill", desk.feather_material("feather"), plain("quill_shaft", "#efe6d2", 0.5)), "quill_pivot", at(29, -84, 0.0), math.radians(-28))

    # cookies and milk, far corners at the bottom
    china = props.glass_paint("china", "#fbf6ec", 0.14)
    cookie = props.cookie_material("cookie")
    icing = plain("icing", "#fffaf2", 0.35, coat=0.4)
    red = props.glass_paint("gumdrop", "#c01a28", 0.25)
    dark = plain("eye", "#2a160c", 0.4)
    parent(desk.plate("cookie_plate", china, 2.0, brass), "cookie_plate_pivot", at(-52, -110, 0.0))
    parent(props.gingerbread("gingerB", cookie, icing, red, dark, 1.2), "gingerB_pivot", at(-55, -108, 0.06), math.radians(20))
    parent(props.star_cookie("starB", cookie, icing, 0.62), "starB_pivot", at(-45, -113, 0.07), math.radians(-12))
    parent(desk.milk_glass("milk", desk.glass_material("milkglass", "#ffffff", 0.02), plain("milk_white", "#fffdf8", 0.3, sss=0.6, sss_scale=0.3)), "milk_pivot", at(46, -106, 0.0))
    candy = props.candy_material("candy")
    for i, (sx, sy, rot) in enumerate(((58, -72, math.radians(-24)), (64, -78, math.radians(-60)))):
        cane = props.candy_cane("cane%d" % i, candy, 2.3, 0.13, 0.4)
        place(cane, at(sx, sy, 0.0 + 0.1 * i), rot=(0, 0, rot))

    # for wide screens: letters to Santa on the left, sleigh bells and cocoa on the right
    env_paper = plain("envelope", "#f3e6cc", 0.7)
    kraft = plain("envelope_kraft", "#c9a26b", 0.75)
    wax = props.glass_paint("letter_wax", "#a3151f", 0.3)
    for i, (sx, sy, rot, mat) in enumerate(((-68, 30, math.radians(14), env_paper), (-64, 22, math.radians(-8), kraft), (-70, 14, math.radians(24), env_paper))):
        parent(desk.envelope("letter%d" % i, mat, wax), "letter_pivot%d" % i, at(sx, sy, 0.04 * i), rot)
    bell_gold = gold("bell", "#ffc65a", 0.2)
    slit = plain("bell_slit", "#1a1206", 0.6)
    for i, (sx, sy) in enumerate(((66, 36), (71, 30), (63, 28))):
        parent(desk.sleigh_bell("bell%d" % i, bell_gold, slit, 0.44), "bell_pivot%d" % i, at(sx, sy), rnd.uniform(0, TAU))
    mug_parts = props.mug("mug", props.glass_paint("mug_glaze", L["mug"], 0.2), plain("cocoa", "#4a2616", 0.25, coat=0.6), [plain("mallow_w", "#fffaf4", 0.8, sss=0.4), plain("mallow_p", "#fbd3dc", 0.8, sss=0.4)], 1.05, 1.5)
    parent(mug_parts, "mug_pivot", at(68, -34, 0.0), math.radians(160))
    for i, ((sx, sy), w, d, h, rot) in enumerate((((-68, -40), 3.4, 2.6, 1.7, math.radians(-10)), ((68, 66), 3.0, 3.0, 2.0, math.radians(12)))):
        base, kind, ink, scale, rib = (("#f4ead8", "pinstripes", "#b8232b", 3.2, "#b8232b"), ("#1f4f3a", "tartan", "#143626", 1.3, "#f1e2c4"))[i]
        body, ribs = props.present("small%d" % i, w, d, h, paper("small_paper%d" % i, base, kind, ink, scale, "#f1e2c4"), satin("small_ribbon%d" % i, rib), 0.42, True, 0.62)
        parent([body] + ribs, "small_pivot%d" % i, at(sx, sy), rot)
    props.stars("stars", gold("star_foil", "#ffcf6a", 0.2), 22, (-74, -114, 74, 84), 5, (0.1, 0.18), avoid=[(-47, -82, 47, 58), (-40, -100, 40, -78)])


WIDE = (160.0, 240.0, 10.0)
PHONE = (100.0, 240.0, 12.0)
OPT = kit.cli()
MOVING = ("paper", "roller", "roll", "ribbon", "tag", "stamp", "seal", "clip", "catch_clip")


def build(look, view=WIDE, dress=True):
    reset()
    kit.MANIFEST["bulbs"] = []
    setup(view[0], view[1], view[2], OPT["samples"] or 220, OPT["preview"])
    lights(key=3300.0, world=0.2, hdri="studio.exr")
    table(look)
    if dress:
        dressing(look)
    scroll("pink" if look == "pink" else "blue" if look == "blue" else "red")
    stamp_and_seal()
    catcher(PAD_TOP)
    glow(1.4, 7)


def catchers(names, on):
    for n in names:
        for ob in bpy.data.collections[n].all_objects:
            if ob.type == "MESH":
                ob.is_shadow_catcher = on


def sprites(out):
    build("red", WIDE, dress=False)
    render_sprite("paper", os.path.join(out, "paper.png"), ["paper"], pad=(1.5, 1.0, 3.0, 2.0), density=1.3)
    render_sprite("rod", os.path.join(out, "rod.png"), ["roller"], pad=(2.0, 2.0, 5.0, 6.0), density=1.3)
    render_sprite("roll", os.path.join(out, "roll.png"), ["roll"], pad=(2.0, 2.0, 6.0, 8.0), density=1.3)
    catchers(["roller", "roll"], True)
    for name, color in RIBBONS.items():
        bpy.data.materials["ribbon_main"].node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = lin(color)
        render_sprite("ribbon-" + name, os.path.join(out, "ribbon-%s.png" % name), ["ribbon"], catch=("catch", "roller", "roll"), pad=(2.0, 2.0, 14.0, 7.0), density=1.3)
    catchers(["roller", "roll"], False)
    render_sprite("tag", os.path.join(out, "tag.png"), ["tag"], pad=(2.0, 2.0, 3.0, 3.0), density=1.3)
    render_sprite("stamp", os.path.join(out, "stamp.png"), ["stamp"], pad=(2.0, 2.0, 9.0, 8.0), density=1.3)
    render_sprite("seal", os.path.join(out, "seal.png"), ["seal"], pad=(1.0, 1.0, 2.5, 2.5), density=1.6)
    render_sprite("clip", os.path.join(out, "clip.png"), ["clip"], catch=("catch_clip",), pad=(1.5, 1.5, 3.0, 3.0), density=1.5)


def main():
    out = OPT["out"]
    looks = OPT["look"] or list(LOOKS)
    only = OPT["only"] or ["sprites", "plates", "soft"]
    if "beauty" in only:
        for look in looks:
            build(look)
            render_plate(os.path.join(out, "beauty-%s.png" % look), hide=("catch", "seal"))
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
    # the letter is written on the same paper: which sprite it is cut from, and where (as shares of its height)
    kit.MANIFEST["sheets"] = {"letter": {"sprite": "paper", "top": 0.14, "mid": 0.5, "bottom": 0.09}}
    save_manifest(os.path.join(out, "manifest.json"))


main()
