"""
Gingerbread House: a plain gingerbread house on a kitchen counter, waiting to be decorated, seen through a lens.

    blender --background --factory-startup --python gingerbread.py -- --out <dir> [--preview] [--look cosy] [--only closed,open,sweets]

Per look it renders the view twice: the house with its door shut, and with the door open and a warm
light inside. Once, from straight on and each alone, it renders the sweets the gift sticks onto the
house (gumdrops, a peppermint, a chocolate button, a star, a heart, a candy cane), each with the
shadow it throws on a wall. Where the house's front is in the picture goes in the manifest, so the
gift knows where a sweet may be stuck. Lengths are in decimetres.
"""

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import kit  # noqa: E402
from kit import TAU, box, catcher, cloth, emissive, glow, lathe, layer, lights, mesh_obj, parent, place, plain, render_sprite, reset, sphere, tube, wood  # noqa: E402
import persp  # noqa: E402
import props  # noqa: E402
import props_desk as desk  # noqa: E402

HW, WALL, RISE, DEPTH = 1.15, 1.5, 1.25, 1.8
BOARD_Z = 0.22
FRONT_Y = -DEPTH / 2
DOOR_W, DOOR_H = 0.52, 0.86

LOOKS = {
    "cosy": dict(tile="#efe6d6", grout="#cfc2ac", counter=("#b8885a", "#7a5434"), cloth=None, mug="#b3302a"),
    "midnight": dict(tile="#27364e", grout="#141d2e", counter=("#8a6240", "#4e3420"), cloth=None, mug="#f2ece0"),
    "berry": dict(tile="#f1e8dc", grout="#d6c8b4", counter=("#c9a070", "#8a6444"), cloth=("#fbf3e6", "#c4302a", "#9a1f1a"), mug="#2f5a3a"),
}


def icing(name="icing"):
    m = kit.Mat(name)
    n, _ = m.noise(m.coords("Object"), 12.0, 2.0, 0.5)
    m.set(base="#fffdf6", rough=0.42, sss=0.5, sss_scale=0.06, spec=0.5, normal=m.bump(n, 0.05, 0.01))
    return m.mat


def piping(name, path, mat, r=0.035):
    """A line of piped icing along a path: a bead of it, not quite even."""
    radii = [r * (1.0 + 0.18 * math.sin(i * 1.7)) for i in range(len(path))]
    return tube(name, path, radii, 10, mat)


def house(door_open):
    """The gingerbread house on its board. Returns the corners of its front as it faces the room, for the manifest."""
    layer("table")
    cookie = props.cookie_material("gingerbread", "#96592e")
    white = icing()
    base = Vector((0, 0, BOARD_Z))
    t = 0.09
    parts = []
    # the four walls: the gabled front and back, the two sides
    for (yy, nm) in ((FRONT_Y, "front"), (-FRONT_Y - t, "back")):
        wall = kit.prism("wall_" + nm, [(-HW, 0.0), (HW, 0.0), (HW, WALL), (0.0, WALL + RISE), (-HW, WALL)], t, cookie, 0.0, 0.012, 2)
        wall.rotation_euler = (math.radians(90), 0, 0)
        wall.location = (0, yy + t, 0)
        parts.append(wall)
        if nm == "front":
            front_wall = wall
    for s in (-1, 1):
        sd = box("wall_side%d" % s, (t, DEPTH - 2 * t, WALL), cookie, 0.0, 0.012, 2)
        sd.location = (s * (HW - t / 2), 0, 0)
        parts.append(sd)
    # the roof: two slabs, bare, a bead of icing along the ridge and under the eaves where they are stuck on
    over, fwd = 0.2, 0.16
    slope = RISE / HW
    length = math.hypot(HW + over, (HW + over) * slope)
    for s in (-1, 1):
        slab = box("roof%d" % s, (length, DEPTH + 2 * fwd, t), cookie, 0.0, 0.012, 2)
        mid = Vector((s * (HW + over) / 2, 0, WALL + RISE - (HW + over) * slope / 2 + t * 0.2))
        slab.location = mid
        slab.rotation_euler = (0, s * math.atan(slope), 0)
        parts.append(slab)
    ridge = [Vector((0, -DEPTH / 2 - fwd + 0.02 + (DEPTH + 2 * fwd - 0.04) * i / 20, WALL + RISE + t * 0.9)) for i in range(21)]
    parts.append(piping("ridge_icing", ridge, white, 0.05))
    # icing where the walls meet, and round the door
    for s in (-1, 1):
        parts.append(piping("corner_icing%d" % s, [Vector((s * (HW - 0.02), FRONT_Y - 0.01, 0.03 + (WALL - 0.06) * i / 12)) for i in range(13)], white, 0.035))
    # icing along the front edges of the roof, hanging in drips like snow off an eave, and a round window piped over the door
    for s in (-1, 1):
        pts = []
        for i in range(31):
            u = i / 30
            x = s * (HW + over) * (1 - u)
            z = WALL - over * slope + (HW + over) * slope * u
            pts.append(Vector((x, FRONT_Y - fwd - 0.01, z - 0.03 - 0.05 * abs(math.sin(u * 23.0)))))
        parts.append(tube("eave_icing%d" % s, pts, [0.05 + 0.03 * abs(math.sin(i * 0.75)) for i in range(31)], 10, white))
    ring = [Vector((0.2 * math.cos(TAU * i / 24), FRONT_Y - 0.015, WALL + 0.25 + 0.2 * math.sin(TAU * i / 24))) for i in range(25)]
    parts.append(piping("window_icing", ring, white, 0.026))
    parts.append(piping("window_bar1", [Vector((-0.2, FRONT_Y - 0.015, WALL + 0.25)), Vector((0.2, FRONT_Y - 0.015, WALL + 0.25))], white, 0.02))
    parts.append(piping("window_bar2", [Vector((0, FRONT_Y - 0.015, WALL + 0.05)), Vector((0, FRONT_Y - 0.015, WALL + 0.45))], white, 0.02))
    arch = [Vector((-DOOR_W / 2, FRONT_Y - 0.015, 0.02 + (DOOR_H - DOOR_W / 2) * i / 6)) for i in range(7)]
    arch += [Vector((-DOOR_W / 2 * math.cos(math.pi * i / 10), FRONT_Y - 0.015, DOOR_H - DOOR_W / 2 + DOOR_W / 2 * math.sin(math.pi * i / 10))) for i in range(1, 10)]
    arch += [Vector((DOOR_W / 2, FRONT_Y - 0.015, DOOR_H - DOOR_W / 2 - (DOOR_H - DOOR_W / 2 - 0.02) * i / 6)) for i in range(7)]
    parts.append(piping("door_icing", arch, white, 0.028))
    # the doorway: a real opening cut through the front wall, arched like the icing round it, so that what is
    # inside is seen through it and the light comes from within, not from a pane laid over the frame
    def arch(w, h, inset=0.0, n=12):
        r = w / 2 - inset
        pts = [(-r, inset), (r, inset)]
        pts += [(r * math.cos(math.pi * i / n), h - w / 2 + r * math.sin(math.pi * i / n)) for i in range(n + 1)]
        return pts

    cutter = kit.prism("door_cutter", arch(DOOR_W - 0.06, DOOR_H - 0.03), 0.6, None)
    cutter.rotation_euler = (math.radians(90), 0, 0)
    cutter.location = (0, FRONT_Y + 0.3, -0.02)
    cutter.hide_render = True
    cut = front_wall.modifiers.new("doorway", "BOOLEAN")
    cut.operation = "DIFFERENCE"
    cut.object = cutter
    parts.append(cutter)
    # inside: a floor and a back wall of the same gingerbread, lit warm when the door is open
    inner = props.cookie_material("inside_cookie", "#b06a36")
    parts.append(mesh_obj("inside_back", [(-HW + t, 0.35, 0.0), (HW - t, 0.35, 0.0), (HW - t, 0.35, WALL), (-HW + t, 0.35, WALL)], [(0, 1, 2, 3)], inner, smooth=False))
    parts.append(mesh_obj("inside_floor", [(-HW + t, FRONT_Y + t, 0.004), (HW - t, FRONT_Y + t, 0.004), (HW - t, 0.35, 0.004), (-HW + t, 0.35, 0.004)], [(0, 1, 2, 3)], inner, smooth=False))
    leaf = kit.prism("door", [(x + (DOOR_W - 0.1) / 2, z) for (x, z) in arch(DOOR_W - 0.1, DOOR_H - 0.05)], 0.05, props.cookie_material("door_cookie", "#8f5228"), 0.0, 0.01, 2)
    leaf.rotation_euler = (math.radians(90), 0, math.radians(-118) if door_open else 0.0)
    leaf.location = (-(DOOR_W - 0.1) / 2, FRONT_Y - 0.005, 0.0)
    parts.append(leaf)
    knob = sphere("door_knob", 0.028, plain("knob", "#f2c84a", 0.3, 0.9), 10, 6)
    if not door_open:
        knob.location = (DOOR_W / 2 - 0.12, FRONT_Y - 0.07, DOOR_H * 0.42)
        parts.append(knob)
    else:
        bpy.data.objects.remove(knob, do_unlink=True)
        # a small lamp inside, out of sight above the doorway: it lights the room and spills out over the step
        persp.point("inside_light", base + Vector((0.0, FRONT_Y + 0.42, 0.62)), 34.0, (1.0, 0.62, 0.26), 0.06)
        ember = lathe("inside_glow", [(0.0, 0.0), (0.022, 0.02), (0.03, 0.06), (0.016, 0.11), (0.0, 0.14)], 12, emissive("inside_ember", "#ffc060", 22.0))
        ember.location = (0.06, 0.1, 0.1)
        parts.append(ember)
    parent(parts, "house_pivot", base)
    # the front, as the gift needs it: the wall's five corners and the roof's two outer corners
    f = base + Vector((0, FRONT_Y, 0))
    for name, p in (("frontBL", (-HW, 0, 0)), ("frontBR", (HW, 0, 0)), ("frontTR", (HW, 0, WALL)), ("peak", (0, 0, WALL + RISE + 0.1)), ("frontTL", (-HW, 0, WALL)),
                    ("eaveL", (-(HW + over), -fwd, WALL - over * slope)), ("eaveR", (HW + over, -fwd, WALL - over * slope)),
                    ("doorTL", (-DOOR_W / 2, 0, DOOR_H)), ("doorBR", (DOOR_W / 2, 0, 0))):
        persp.anchor(name, f + Vector(p))


def counter(look, rnd):
    """The kitchen round it: a butcher's block counter, a tiled wall, a shelf with jars and a string of lights, and the baking things."""
    L = LOOKS[look]
    layer("table")
    top = box("counter", (60.0, 16.0, 0.5), wood("counter_wood", L["counter"][0], L["counter"][1], 0.7, 0.55, along="X"), -0.5, 0.03, 2)
    place(top, (0, 2.0, 0))
    bsdf = next(n for n in top.data.materials[0].node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Coat Weight"].default_value = 0.05
    if L["cloth"]:
        c, a, b = L["cloth"]
        parent(desk.napkin("runner", cloth("runner_cloth", c, 30.0, 0.9, 0.8, a, 0.3, b), 14.0, 7.0), "runner_pivot", Vector((0, -0.6, -0.03)))
    # the wall: glazed tiles, half a tile out of step each course
    m = kit.Mat("tiles")
    x, y, z = m.sep(m.coords("Object"))
    row = m.math("FLOOR", m.math("DIVIDE", z, 0.75))
    xx = m.math("ADD", m.math("DIVIDE", x, 1.5), m.math("MULTIPLY", row, 0.5))
    gx = m.math("LESS_THAN", m.math("FRACT", xx), 0.03)
    gz = m.math("LESS_THAN", m.math("FRACT", m.math("DIVIDE", z, 0.75)), 0.06)
    grout = m.math("MAXIMUM", gx, gz)
    n, _ = m.noise(m.comb(m.math("FLOOR", xx), row, 0.0), 3.0, 1.0, 0.5)
    m.set(base=m.mix(grout, m.mix(m.math("MULTIPLY", n, 0.25), L["tile"], kit_darken(L["tile"])), L["grout"]), rough=m.math("ADD", m.math("MULTIPLY", grout, 0.6), 0.12), normal=m.bump(m.math("SUBTRACT", 1.0, grout), 0.4, 0.02))
    wy = 9.0
    mesh_obj("wall", [(-60, wy, -1), (60, wy, -1), (60, wy, 30), (-60, wy, 30)], [(0, 1, 2, 3)], m.mat, smooth=False)
    # a shelf across the wall, jars on it, a string of lights under it
    shelf = box("shelf", (40.0, 1.6, 0.25), wood("shelf_wood", "#6a4426", "#3a2414", 0.9, 0.5, along="X"), 5.6, 0.03, 2)
    place(shelf, (0, wy - 0.85, 0))
    glass = desk.glass_material("jar_glass", "#ffffff", 0.03)
    fills = ["#b3302a", "#f2ece0", "#2f5a3a", "#d9a441", "#6a3a22", "#e8a0a8"]
    for k in range(9):
        jx = -9.0 + k * 2.3 + rnd.uniform(-0.3, 0.3)
        r, h = rnd.uniform(0.5, 0.72), rnd.uniform(1.3, 2.0)
        jar = lathe("jar%d" % k, [(0.0, 0.0), (r, 0.0), (r, h * 0.8), (r * 0.7, h * 0.92), (r * 0.7, h), (r * 0.62, h), (r * 0.62, h * 0.9), (r * 0.9, h * 0.78), (r * 0.9, 0.05), (0.0, 0.05)], 32, glass)
        fill = lathe("jarfill%d" % k, [(0.0, 0.06), (r * 0.88, 0.06), (r * 0.88, h * rnd.uniform(0.4, 0.7)), (0.0, h * 0.6)], 24, plain("jarfill_mat%d" % k, fills[k % len(fills)], 0.6))
        lid = lathe("jarlid%d" % k, [(0.0, h), (r * 0.74, h), (r * 0.74, h + 0.14), (0.0, h + 0.14)], 24, plain("jarlid_mat%d" % k, "#c9a050", 0.3, 1.0))
        parent([jar, fill, lid], "jar_pivot%d" % k, Vector((jx, wy - 0.9, 5.85)))
    wire = plain("wire", "#1a160e", 0.6)
    bulb = emissive("bulb", "#ffc878", 30.0)
    socket = plain("socket", "#2a2418", 0.5)
    props.fairy_lights("shelf_lights", [Vector((-20 + 4 * k, wy - 1.75, 5.35 - 0.5 * (k % 2))) for k in range(11)], wire, bulb, socket, 0.9, 0.09, 12)
    # on the counter: bowls of sweets, a rolling pin, a piping bag, cookies, a mug, icing sugar fallen round the board
    board = lathe("board", [(0.0, 0.0), (2.5, 0.0), (2.56, 0.04), (2.56, BOARD_Z - 0.03), (2.5, BOARD_Z), (0.0, BOARD_Z)], 96, desk.turned_wood("board_wood", "#d8b480", "#a9814e", 0.5))
    place(board, (0, 0, 0))
    dust = kit.Mat("sugar_dust")
    dn, _ = dust.noise(dust.coords("Object"), 2.2, 5.0, 0.7)
    dust.set(base="#ffffff", rough=0.9, alpha=dust.ramp(dn, [(0.45, "#000000"), (0.7, "#e0e0e0")]))
    try:
        dust.mat.blend_method = "HASHED"
    except Exception:
        pass
    place(lathe("dust", [(0.0, BOARD_Z + 0.004), (2.45, BOARD_Z + 0.004)], 48, dust.mat), (0, 0, 0))
    china = props.glass_paint("bowl_china", "#fbf6ec", 0.14)
    sweets = [("#c4202a", 0.16), ("#2f8a4a", 0.16), ("#f2ece0", 0.14), ("#e8b02a", 0.13)]
    for k, (bx, by, br) in enumerate(((-4.6, -0.6, 1.0), (4.7, -0.2, 1.1), (-7.4, 1.6, 1.2), (7.6, 1.8, 1.0))):
        bowl = lathe("bowl%d" % k, [(0.0, 0.0), (br * 0.5, 0.0), (br, br * 0.55), (br * 0.96, br * 0.57), (br * 0.5, 0.07), (0.0, 0.07)], 48, china)
        things = []
        col, sr = sweets[k % len(sweets)]
        mat = props.glass_paint("sweet%d" % k, col, 0.3)
        for q in range(26):
            a, d = rnd.uniform(0, TAU), rnd.uniform(0, br * 0.62)
            sph = sphere("sweet%d_%d" % (k, q), sr, mat, 10, 6, 0.8)
            place(sph, (d * math.cos(a), d * math.sin(a), br * 0.3 + rnd.uniform(0.0, 0.2)))
            things.append(sph)
        parent([bowl] + things, "bowl_pivot%d" % k, Vector((bx, by, 0)))
    pin = desk.turned_wood("pin_wood", "#d8b07a", "#a8804e", 0.45)
    roller = [lathe("rolling_pin", [(0.0, -2.2), (0.32, -2.2), (0.32, 2.2), (0.0, 2.2)], 32, pin), lathe("pin_grip1", [(0.0, 2.2), (0.1, 2.2), (0.16, 2.6), (0.12, 3.1), (0.0, 3.15)], 20, pin), lathe("pin_grip2", [(0.0, -3.15), (0.12, -3.1), (0.16, -2.6), (0.1, -2.2), (0.0, -2.2)], 20, pin)]
    for ob in roller:
        ob.rotation_euler = (0, math.radians(90), 0)
    parent(roller, "pin_pivot", Vector((-9.5, -1.6, 0.32)), math.radians(24))
    bag = lathe("piping_bag", [(0.0, 0.0), (0.05, 0.02), (0.1, 0.5), (0.55, 2.1), (0.6, 2.3), (0.3, 2.5), (0.0, 2.45)], 24, plain("bag_cloth", "#f6f1e6", 0.7, sss=0.3))
    bag.rotation_euler = (0, math.radians(84), 0)
    parent([bag], "bag_pivot", Vector((5.4, -3.0, 0.3)), math.radians(200), 0.55)
    cookie = props.cookie_material("cookie", "#b9783e")
    white = icing("cookie_icing")
    for k, (cx, cy, rot) in enumerate(((-3.0, -2.3, 20), (6.2, -2.6, -30), (-6.4, -2.4, 70))):
        parent(props.gingerbread("man%d" % k, cookie, white, plain("man_red%d" % k, "#c4202a", 0.4), plain("man_dark%d" % k, "#2a1608", 0.6), 0.9), "man_pivot%d" % k, Vector((cx, cy, 0.0)), math.radians(rot))
    for k, (cx, cy) in enumerate(((2.1, -3.0), (-1.6, -3.1), (8.8, -1.0), (-10.8, 0.6))):
        parent(props.star_cookie("starcookie%d" % k, cookie, white, 0.5), "star_pivot%d" % k, Vector((cx, cy, 0.0)), rnd.uniform(0, TAU))
    cane = props.candy_material("cane")
    for k, (cx, cy, rot) in enumerate(((4.4, -3.2, 110), (-8.2, -3.0, 40))):
        parent([props.candy_cane("cane%d" % k, cane, 1.3, 0.09, 0.28)], "cane_pivot%d" % k, Vector((cx, cy, 0.0)), math.radians(rot))
    mug = props.mug("mug", props.glass_paint("mug_glaze", L["mug"], 0.15), plain("cocoa", "#4a2618", 0.1, coat=0.5), [plain("mallow", "#fffaf2", 0.7)], 0.85, 1.3, seed=5)
    parent(mug, "mug_pivot", Vector((10.6, 0.4, 0.0)), math.radians(140))
    # a little fir in a pot at the end of the counter, lights on it
    needles = props.needle_material("fir_needles")
    fir = [lathe("fir_pot", [(0.0, 0.0), (0.7, 0.0), (0.9, 1.2), (0.0, 1.2)], 32, plain("terracotta", "#b8653a", 0.75))]
    for k in range(6):
        tt = k / 6
        r = 1.5 * (1 - tt) + 0.2
        z0 = 1.4 + 3.6 * tt
        sk = lathe("fir%d" % k, [(0.0, z0 + 0.9), (r * 0.25, z0 + 0.6), (r, z0), (r * 0.9, z0 - 0.1), (0.0, z0 + 0.04)], 20, needles)
        kit.displace(sk, 0.12, 0.5)
        fir.append(sk)
    for q in range(24):
        tt = q / 24
        a = q * 2.3
        rr = (1.5 * (1 - tt * 0.9) + 0.2) * 0.92
        b = sphere("fir_light%d" % q, 0.07, emissive("fir_lightmat%d" % (q % 3), ["#ffd27a", "#ff6a5a", "#ffe8b0"][q % 3], 30.0), 8, 5)
        place(b, (rr * math.cos(a), rr * math.sin(a), 1.5 + 3.4 * tt))
        fir.append(b)
    parent(fir, "fir_pivot", Vector((-13.5, 4.5, 0.0)))


def kit_darken(hexcolor, f=0.82):
    h = hexcolor.lstrip("#")
    return "#%02x%02x%02x" % tuple(int(int(h[i:i + 2], 16) * f) for i in (0, 2, 4))


OPT = kit.cli()
CAM_AT = (0.0, -13.2, 2.75)
LOOK_AT = (0.0, 0.0, 1.72)


def build(look, door_open):
    reset()
    kit.MANIFEST["bulbs"] = []
    rnd = random.Random(5)
    persp.setup(CAM_AT, LOOK_AT, lens=35.0, ppk=10.0, samples=OPT["samples"] or 220, preview=OPT["preview"], exposure=0.3, fstop=0.3, focus=(0.0, FRONT_Y, 1.6))
    persp.world_night("#1a1410", "#2a2018", 0.25)
    layer("lights")
    # a lamp over the counter, warm, from the upper left; a cooler breath from the right so the shadows are not black
    persp.area("pendant", (-6.0, -6.0, 13.0), (0.0, 0.0, 1.2), 1700.0, 4.0, (1.0, 0.78, 0.52))
    persp.area("fill", (10.0, -9.0, 6.0), (0.0, 0.0, 1.5), 130.0, 9.0, (0.78, 0.86, 1.0), shadow=False)
    counter(look, rnd)
    house(door_open)
    glow(1.8, 7)


# ---------------------------------------------------------------------------------------------- the sweets

SWEETS = ("gumdrop-red", "gumdrop-green", "peppermint", "button", "star", "heart", "cane")


def sweets(out):
    """The sweets, from straight on, each alone on nothing with the shadow it throws on what it is stuck to."""
    kit.TILT = 0.0
    kit.COS_T, kit.SIN_T = 1.0, 0.0
    reset()
    kit.setup(160.0, 240.0, 10.0, OPT["samples"] or 200, OPT["preview"])
    lights(key=3000.0, world=0.3, hdri="studio.exr")
    sugar = kit.Mat("sugar")
    sn, _ = sugar.noise(sugar.coords("Object"), 60.0, 2.0, 0.5)
    for name, col in (("gumdrop-red", "#d4202a"), ("gumdrop-green", "#2f9a4a")):
        layer(name)
        m = kit.Mat(name + "_jelly")
        gn, _ = m.noise(m.coords("Object"), 70.0, 2.0, 0.5)
        m.set(base=col, rough=0.55, sss=0.6, sss_scale=0.12, coat=0.2, normal=m.bump(gn, 0.8, 0.004))
        lathe(name, [(0.0, 0.0), (0.3, 0.0), (0.31, 0.06), (0.27, 0.2), (0.16, 0.3), (0.0, 0.33)], 40, m.mat)
    layer("peppermint")
    m = kit.Mat("mint")
    x, y, z = m.sep(m.coords("Object"))
    swirl = m.math("SINE", m.math("ADD", m.math("MULTIPLY", m.math("ARCTAN2", y, x), 6.0), m.math("MULTIPLY", m.math("SQRT", m.math("ADD", m.math("MULTIPLY", x, x), m.math("MULTIPLY", y, y))), 9.0)))
    m.set(base=m.mix(m.math("GREATER_THAN", swirl, 0.0), "#fbf7f2", "#d4202a"), rough=0.16, coat=0.7, coat_rough=0.05, sss=0.15, sss_scale=0.05)
    lathe("peppermint", [(0.0, 0.0), (0.3, 0.0), (0.34, 0.05), (0.33, 0.1), (0.24, 0.14), (0.0, 0.15)], 48, m.mat)
    layer("button")
    lathe("button", [(0.0, 0.0), (0.27, 0.0), (0.3, 0.04), (0.28, 0.1), (0.2, 0.13), (0.0, 0.14)], 40, plain("chocolate", "#4a2412", 0.3, coat=0.4))
    layer("star")
    kit.prism("star", kit.star_outline(5, 0.34, 0.16), 0.1, plain("star_sugar", "#f2c22a", 0.45, sss=0.4, sss_scale=0.05), 0.0, 0.035, 3)
    layer("heart")
    heart = []
    for i in range(40):
        t = TAU * i / 40
        heart.append((0.02 * 16 * math.sin(t) ** 3, 0.02 * (13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))))
    kit.prism("heart", heart, 0.1, plain("heart_sugar", "#e86a8a", 0.4, sss=0.4, sss_scale=0.05), 0.0, 0.035, 3)
    layer("cane")
    c = props.candy_cane("cane", props.candy_material("cane_stripes"), 0.62, 0.05, 0.15)
    place(c, (-0.15, -0.35, 0.0))
    # the note's "paper": a slab of gingerbread, a line of icing piped down each side and scalloped along its top and bottom
    layer("sheet")
    w, length = 7.6, 12.0
    slab = box("slab", (w, length, 0.16), props.cookie_material("slab_cookie", "#96592e"), 0.0, 0.07, 3)
    kit.displace(slab, 0.012, 1.4)
    white = icing("slab_icing")
    inset = 0.42
    for sgn in (-1, 1):
        tube("slab_side%d" % sgn, [Vector((sgn * (w / 2 - inset), length / 2 - inset - 0.25 - (length - 2 * inset - 0.5) * i / 40, 0.17)) for i in range(41)], 0.085, 10, white)
        pts = []
        for i in range(61):
            u = i / 60
            pts.append(Vector((-(w / 2 - inset) + (w - 2 * inset) * u, sgn * (length / 2 - inset) - sgn * 0.16 * abs(math.sin(u * math.pi * 9)), 0.17)))
        tube("slab_scallop%d" % sgn, pts, 0.085, 10, white)
        for sx in (-1, 1):
            place(sphere("slab_dot%d_%d" % (sgn, sx), 0.11, white, 12, 8, 0.7), (sx * (w / 2 - inset), sgn * (length / 2 - inset), 0.17))
    catcher()
    render_sprite("sheet", os.path.join(out, "sheet.png"), ["sheet"], catch=("catch",), pad=(1.5, 1.5, 3.0, 3.0), density=1.3)
    kit.MANIFEST["sheets"] = {"letter": {"sprite": "sheet", "top": 0.14, "mid": 0.5, "bottom": 0.14, "gain": 1.0}}
    for name in SWEETS:
        render_sprite(name, os.path.join(out, name + ".png"), [name], catch=("catch",), pad=(1.2, 1.0, 1.8, 1.8), density=1.6)


def main():
    out = OPT["out"]
    looks = OPT["look"] or list(LOOKS)
    only = OPT["only"] or ["closed", "open", "sweets"]
    for look in looks:
        if "closed" in only:
            build(look, False)
            persp.render(os.path.join(out, "plate-%s-closed-wide.png" % look))
        if "open" in only:
            build(look, True)
            persp.render(os.path.join(out, "plate-%s-open-wide.png" % look))
    anchors = dict(kit.MANIFEST["anchors"])
    if "sweets" in only:
        sweets(out)
    kit.MANIFEST["anchors"].update(anchors)
    persp.save(os.path.join(out, "manifest.json"), persp=True)


main()
