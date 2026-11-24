"""
Advent Calendar: a wooden advent house of twenty-four numbered doors on a mantelpiece at night, seen through a lens.
The group card for Christmas: behind a door is one person's note, or a sweet where nobody wrote.

    blender --background --factory-startup --python advent.py -- --out <dir> [--preview] [--look evergreen] [--only closed,open,sprites,papers]

Per look it renders the view twice: every door shut, and every door open with its niche lit from inside.
The gift lays the open picture over the shut one a door at a time, so where each door is in the picture
goes in the manifest (d<n>TL, d<n>BR, by the number painted on the door), with the gable's star window
(the sender's own letter). Once, each alone, it renders what a niche holds, standing in a niche as the lens sees one
(the small envelope of a note, the tag a read note leaves, the sweets), and from straight above the card a note is read
on, the sender's letter and the paper a photo is printed on. Lengths are in decimetres.
"""

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import kit  # noqa: E402
from kit import TAU, box, catcher, emissive, glow, lathe, layer, lights, mesh_obj, parent, place, plain, render_sprite, reset, sphere, tube, wood  # noqa: E402
import persp  # noqa: E402
import props  # noqa: E402
import props_desk as desk  # noqa: E402

COLS, ROWS = 4, 6
W, D = 3.12, 1.1          # the house's front and how deep it stands
T = 0.075                 # the frame between two doors
PITCH_X = (W - T) / COLS
PITCH_Z = 0.6
BASE = 0.14               # the plinth it stands on
BODY = ROWS * PITCH_Z + T
RISE = 1.0                # the gable over it
TOP = BASE + BODY
FRONT_Y = -D / 2
NICHE = 0.46              # how deep a niche is
OPEN_W, OPEN_H = PITCH_X - T, PITCH_Z - T
SWING = math.radians(-80)   # short of square to the front, so an open leaf stays inside its own opening in the picture

# The numerals want a font with plain, closed outlines (a variable font's overlapping contours fill wrongly as a curve:
# Newsreader's 4 and 7 came out as wedges) and figures that all stand as tall as each other (Georgia's 1, 2 and 0 are
# half the height of its 6 and 8, and read small on a door). Libre Baskerville Bold, which is kept beside this script
# (fonts/, under the Open Font License) so that every machine paints the same figures; ADVENT_FONT names another. Georgia
# and then Blender's own are only what is left if that file has gone.
FONTS = [os.environ.get("ADVENT_FONT", ""), os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts", "LibreBaskerville-Bold.ttf"), "C:/Windows/Fonts/georgiab.ttf", "/Library/Fonts/Georgia Bold.ttf", "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"]

LOOKS = {
    # the house's paint, its doors' four paints, what a niche is lined with, the wall behind, the mantel's wood.
    # A lining is deep and quiet in every look: with all twenty-four doors open it is most of the house. The pale
    # look's was a bright tomato (#a23a2a) and turned "white and sage" red; it has midnight's oxblood now.
    "evergreen": dict(paint="#1f4a36", doors=["#a8281f", "#f1e6cf", "#c9963a", "#2f6b4a"], lining="#7a1c18", wall="#16302b", mantel=("#7a5230", "#40281a"), ink="#f6d98a", roof="#7a2a1e"),
    "nordic": dict(paint="#f1ece2", doors=["#b3302a", "#e6dccb", "#8fa58f", "#d9b98a"], lining="#6a1c2c", wall="#3b4a5a", mantel=("#c9a678", "#8a6844"), ink="#fbf3e2", roof="#5a6a78"),
    "midnight": dict(paint="#17223f", doors=["#22335e", "#c9a04a", "#7a1f2a", "#e9e1cf"], lining="#6a1c2c", wall="#18213a", mantel=("#5a3c26", "#2c1c12"), ink="#f3d78a", roof="#101830"),
}


def numbers():
    """Which number is painted on which door, by column and row from the bottom left: scattered, as an advent calendar's are, and the same every time."""
    rnd = random.Random(24)
    order = list(range(1, COLS * ROWS + 1))
    rnd.shuffle(order)
    return {(c, r): order[r * COLS + c] for r in range(ROWS) for c in range(COLS)}


def cell(c, r):
    """A niche's opening: its left edge, its bottom, in the house's own coordinates (x across, z up)."""
    return (-W / 2 + T + c * PITCH_X, BASE + T + r * PITCH_Z)


def numeral(name, text, size, mat, font):
    cu = bpy.data.curves.new(name, "FONT")
    cu.body = text
    cu.size = size
    cu.align_x = "CENTER"
    cu.align_y = "CENTER"
    cu.extrude = 0.003
    cu.resolution_u = 8
    cu.fill_mode = "BOTH"
    if font is not None:
        cu.font = font
    ob = bpy.data.objects.new(name, cu)
    kit.link(ob)
    ob.data.materials.append(mat)
    return ob


def snow_material(name="snow"):
    m = kit.Mat(name)
    n, _ = m.noise(m.coords("Object"), 9.0, 3.0, 0.6)
    m.set(base="#f6f9ff", rough=0.55, sss=0.6, sss_scale=0.08, normal=m.bump(n, 0.25, 0.02))
    return m.mat


def painted(name, color, rough=0.48):
    """Painted wood: the colour a little uneven, the grain showing through as the faintest ridges."""
    m = kit.Mat(name)
    co = m.coords("Object")
    n, _ = m.noise(co, 2.2, 3.0, 0.6)
    g, _ = m.noise(m.mapping(co, (1.0, 1.0, 14.0)), 6.0, 2.0, 0.5)
    m.set(base=m.mix(m.math("MULTIPLY", n, 0.5), color, kit_darken(color, 0.84)), rough=rough, coat=0.12, coat_rough=0.3, normal=m.bump(g, 0.12, 0.004))
    return m.mat


def luminance(hexcolor):
    h = hexcolor.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def kit_darken(hexcolor, f=0.82):
    h = hexcolor.lstrip("#")
    return "#%02x%02x%02x" % tuple(int(int(h[i:i + 2], 16) * f) for i in (0, 2, 4))


def hull(points):
    """The outline round a handful of points in the picture, as a list going one way round."""
    pts = sorted(set((round(x, 3), round(y, 3)) for (x, y) in points))

    def half(seq):
        out = []
        for q in seq:
            while len(out) >= 2 and (out[-1][0] - out[-2][0]) * (q[1] - out[-2][1]) - (out[-1][1] - out[-2][1]) * (q[0] - out[-2][0]) <= 0:
                out.pop()
            out.append(q)
        return out[:-1]

    return [list(q) for q in half(pts) + half(reversed(pts))]


def house(look, doors_open):
    """The advent house on the mantel. Where each door and the star window are in the picture goes in the manifest."""
    L = LOOKS[look]
    layer("table")
    font = None
    for candidate in FONTS:
        if candidate and os.path.exists(candidate):
            font = bpy.data.fonts.load(candidate)
            break
    paint = painted("house_paint", L["paint"])
    lining = plain("niche_lining", L["lining"], 0.7)
    brass = plain("brass", "#d9a84a", 0.28, 1.0)
    ink = plain("numeral_paint", L["ink"], 0.42)
    dark_ink = plain("numeral_dark", "#3a2412", 0.45)
    snow = snow_material()
    parts = []
    parts.append(place(box("plinth", (W + 0.2, D + 0.12, BASE), painted("plinth_paint", kit_darken(L["paint"], 0.8)), 0.0, 0.02, 3), (0, 0, 0)))
    # what is behind the niches is one block; its face is the niches' back wall
    parts.append(place(box("block", (W, D - NICHE, BODY), paint, BASE, 0.01, 2), (0, FRONT_Y + NICHE + (D - NICHE) / 2, 0)))
    parts.append(place(box("niche_back", (W - 2 * T, 0.012, BODY - 2 * T), lining, BASE + T), (0, FRONT_Y + NICHE - 0.006, 0)))
    for c in range(COLS + 1):
        parts.append(place(box("post%d" % c, (T, NICHE, BODY), paint, BASE, 0.008, 2), (-W / 2 + T / 2 + c * PITCH_X, FRONT_Y + NICHE / 2, 0)))
    for r in range(ROWS + 1):
        parts.append(place(box("shelf%d" % r, (W, NICHE, T), paint, BASE + r * PITCH_Z, 0.008, 2), (0, FRONT_Y + NICHE / 2, 0)))
    # the inside of a niche is lined on its floor, its roof and its two sides, a hair proud of the frame's wood
    for c in range(COLS):
        for r in range(ROWS):
            x0, z0 = cell(c, r)
            for nm, size, loc in (
                ("floor", (OPEN_W, NICHE - 0.03, 0.006), (x0 + OPEN_W / 2, FRONT_Y + 0.03 + (NICHE - 0.03) / 2, z0)),
                ("roof", (OPEN_W, NICHE - 0.03, 0.006), (x0 + OPEN_W / 2, FRONT_Y + 0.03 + (NICHE - 0.03) / 2, z0 + OPEN_H - 0.006)),
                ("left", (0.006, NICHE - 0.03, OPEN_H), (x0 + 0.003, FRONT_Y + 0.03 + (NICHE - 0.03) / 2, z0)),
                ("right", (0.006, NICHE - 0.03, OPEN_H), (x0 + OPEN_W - 0.003, FRONT_Y + 0.03 + (NICHE - 0.03) / 2, z0)),
            ):
                b = box("line_%s_%d_%d" % (nm, c, r), size, lining, 0.0)
                b.location = loc
                parts.append(b)
    # the doors: a leaf with a raised panel, its number in gold, a brass knob; hung on its left edge
    nums = numbers()
    door_mats = [painted("door_paint%d" % i, col, 0.42) for i, col in enumerate(L["doors"])]
    lw, lh, lt = OPEN_W - 0.014, OPEN_H - 0.014, 0.034
    for c in range(COLS):
        for r in range(ROWS):
            x0, z0 = cell(c, r)
            n = nums[(c, r)]
            pick = (c + 2 * r + r // 2) % len(door_mats)
            mat = door_mats[pick]
            pale = luminance(L["doors"][pick]) > 0.42
            leaf = place(box("leaf%d" % n, (lw, lt, lh), mat, 0.0, 0.006, 2), (lw / 2, lt / 2, 0.0))
            panel = place(box("panel%d" % n, (lw - 0.12, 0.02, lh - 0.12), mat, 0.0, 0.009, 3), (lw / 2, -0.006, 0.06))
            num = numeral("num%d" % n, str(n), 0.27, dark_ink if pale else ink, font)
            place(num, (lw / 2 - 0.025, -0.0175, lh / 2), (math.radians(90), 0, 0))
            knob = place(sphere("knob%d" % n, 0.024, brass, 12, 8), (lw - 0.03, -0.034, lh / 2))
            parent([leaf, panel, num, knob], "door%d" % n, Vector((x0 + 0.007, FRONT_Y, z0 + 0.007)), SWING if doors_open else 0.0)
            # where the opening is in the picture, for the gift
            persp.anchor("d%dTL" % n, Vector((x0, FRONT_Y, z0 + OPEN_H)))
            persp.anchor("d%dBR" % n, Vector((x0 + OPEN_W, FRONT_Y, z0)))
            persp.anchor("d%dC" % n, Vector((x0 + OPEN_W / 2, FRONT_Y + NICHE * 0.55, z0)))
            if doors_open:
                # where the open leaf is in the picture: it stands out towards the lens, so it is seen larger than its
                # opening and a little outside it. The gift lays the open picture over the shut one inside this outline too.
                ca, sa = math.cos(SWING), math.sin(SWING)
                hinge = Vector((x0 + 0.007, FRONT_Y, z0 + 0.007))
                seen = [persp.on_stage(hinge + Vector((lx * ca - ly * sa, lx * sa + ly * ca, lz))) for lx in (0.0, lw) for ly in (-0.062, lt) for lz in (0.0, lh)]
                kit.MANIFEST.setdefault("leaves", {})[str(n)] = hull(seen)
                persp.point("niche_light%d" % n, Vector((x0 + OPEN_W / 2, FRONT_Y + 0.13, z0 + OPEN_H - 0.05)), 0.9, (1.0, 0.7, 0.36), 0.02, shadow=False)
    # the gable: a solid end, a round window with a star in it (the sender's letter), a wreath round the window
    gable = kit.prism("gable", [(-W / 2, 0.0), (W / 2, 0.0), (0.0, RISE)], D, paint, 0.0, 0.01, 2)
    gable.rotation_euler = (math.radians(90), 0, 0)
    gable.location = (0, FRONT_Y + D, TOP)
    parts.append(gable)
    wz = TOP + RISE * 0.36
    glass = emissive("star_glass", "#ffb45a", 14.0 if doors_open else 1.4)
    pane = lathe("star_pane", [(0.0, 0.0), (0.2, 0.0)], 40, glass)
    place(pane, (0, FRONT_Y - 0.004, wz), (math.radians(90), 0, 0))
    parts.append(pane)
    star = kit.prism("star", kit.star_outline(5, 0.15, 0.065), 0.02, brass, 0.0, 0.004, 2)
    place(star, (0, FRONT_Y - 0.006, wz), (math.radians(90), 0, 0))
    parts.append(star)
    ring = [Vector((0.215 * math.cos(TAU * i / 40), FRONT_Y - 0.012, wz + 0.215 * math.sin(TAU * i / 40))) for i in range(41)]
    parts.append(tube("star_ring", ring, 0.02, 10, brass, cap=False))
    needles = props.needle_material("wreath_needles")
    wreath = tube("wreath", [Vector((0.3 * math.cos(TAU * i / 60), FRONT_Y - 0.03, wz + 0.3 * math.sin(TAU * i / 60))) for i in range(61)], [0.06 + 0.012 * math.sin(i * 2.1) for i in range(61)], 10, needles, cap=False)
    kit.displace(wreath, 0.05, 0.12)
    parts.append(wreath)
    berry = plain("berry", "#c4202a", 0.3, coat=0.5)
    for i in range(7):
        a = TAU * (i / 7.0) + 0.3
        parts.append(place(sphere("wreath_berry%d" % i, 0.026, berry, 10, 6), (0.3 * math.cos(a), FRONT_Y - 0.085, wz + 0.3 * math.sin(a))))
    persp.anchor("starC", Vector((0, FRONT_Y, wz)))
    persp.anchor("starR", Vector((0.32, FRONT_Y, wz)))
    # the roof: two painted slabs, snow lying on them and hanging off the front edge
    over, fwd, t = 0.2, 0.13, 0.07
    hw = W / 2
    slope = RISE / hw
    ang = math.atan(slope)
    length = math.hypot(hw + over, (hw + over) * slope)
    roof = painted("roof_paint", L["roof"], 0.5)
    for s in (-1, 1):
        mid = Vector((s * (hw + over) / 2, 0, TOP + RISE - (hw + over) * slope / 2 + t * 0.2))
        slab = box("roof%d" % s, (length, D + 2 * fwd, t), roof, 0.0, 0.012, 2)
        slab.location = mid
        slab.rotation_euler = (0, s * ang, 0)
        parts.append(slab)
        nrm = Vector((s * math.sin(ang), 0, math.cos(ang)))
        cap = box("roof_snow%d" % s, (length + 0.03, D + 2 * fwd + 0.05, 0.085), snow, 0.0, 0.04, 4)
        cap.location = mid + nrm * (t * 0.95)
        cap.rotation_euler = (0, s * ang, 0)
        kit.displace(cap, 0.03, 0.5)
        parts.append(cap)
        pts = []
        for i in range(37):
            u = i / 36
            x = s * (hw + over) * (1 - u)
            z = TOP - over * slope + (hw + over) * slope * u + t + 0.05
            pts.append(Vector((x, FRONT_Y - fwd - 0.01, z - 0.05 * abs(math.sin(u * 19.0)))))
        parts.append(tube("eave_snow%d" % s, pts, [0.05 + 0.028 * abs(math.sin(i * 0.8)) for i in range(37)], 10, snow))
    parent(parts, "house_pivot", Vector((0, 0, 0)))


def room(look, rnd):
    """What is round it: the mantel it stands on, the wall, a garland with small lights, two candles, a few presents."""
    L = LOOKS[look]
    layer("table")
    top = box("mantel", (64.0, 4.6, 0.55), wood("mantel_wood", L["mantel"][0], L["mantel"][1], 0.9, 0.5, along="X"), -0.55, 0.05, 3)
    place(top, (0, 0.55, 0))
    wall = kit.Mat("wall_paint")
    n, _ = wall.noise(wall.coords("Object"), 0.6, 3.0, 0.6)
    wall.set(base=wall.mix(wall.math("MULTIPLY", n, 0.6), L["wall"], kit_darken(L["wall"], 0.78)), rough=0.82)
    wy = 6.0
    mesh_obj("wall", [(-64, wy, -12), (64, wy, -12), (64, wy, 34), (-64, wy, 34)], [(0, 1, 2, 3)], wall.mat, smooth=False)
    mesh_obj("breast", [(-64, -1.5, -12), (64, -1.5, -12), (64, -1.5, -0.55), (-64, -1.5, -0.55)], [(0, 1, 2, 3)], wall.mat, smooth=False)
    # a moulding along the wall, so the wall is a room's and not a backdrop
    rail = painted("rail_paint", kit_darken(L["wall"], 1.25) if look != "nordic" else "#4a5a6a", 0.6)
    place(box("rail", (128.0, 0.12, 0.26), rail, 0.0, 0.03, 3), (0, wy - 0.06, 9.6))
    # panelling: tall frames of thin moulding along the wall, so there is something for the light to catch
    for k in range(-9, 10):
        cx = k * 6.4
        for nm, size, loc in (("t", (5.2, 0.08, 0.12), (cx, wy - 0.04, 8.6)), ("b", (5.2, 0.08, 0.12), (cx, wy - 0.04, 1.0)), ("l", (0.12, 0.08, 7.72), (cx - 2.54, wy - 0.04, 1.0)), ("r", (0.12, 0.08, 7.72), (cx + 2.54, wy - 0.04, 1.0))):
            place(box("panel_%s%d" % (nm, k), size, rail, 0.0, 0.02, 2), loc)
    # a swag of small lights along the wall above the house, out of focus
    wire = plain("wire", "#1a160e", 0.6)
    socket = plain("socket", "#2a2418", 0.5)
    bulb = emissive("bulb", "#ffc878", 34.0)
    pts = [Vector((-32.0 + 2.9 * k, wy - 0.2, 7.9 - (0.7 if k % 2 else 0.0))) for k in range(23)]
    props.fairy_lights("wall_lights", pts, wire, bulb, socket, 1.05, 0.1, 8)
    # the garland lying along the mantel either side of the house, lights threaded through it, a few baubles
    needles = props.needle_material("needles")
    stem = plain("stem", "#4a3220", 0.7)
    k = 0
    for side in (-1, 1):
        for i in range(26):
            x = side * (1.75 + i * 0.52 + rnd.uniform(-0.2, 0.2))
            y = rnd.uniform(-0.85, 0.45)
            ln = rnd.uniform(2.4, 3.4)
            b = props.pine_branch("bough%d" % k, needles, stem, ln, 30 + k, 7, 0.2, 1.0)
            parent(b, "bough_pivot%d" % k, Vector((x, y, 0.03 + 0.05 * (k % 3))), (math.pi if side < 0 else 0.0) + rnd.uniform(-0.7, 0.7), 0.7)
            k += 1
    for side in (-1, 1):
        path = [Vector((side * (1.9 + 1.0 * q), -0.45 + 0.35 * math.sin(q * 1.3), 0.26 + 0.05 * math.sin(q * 2.1))) for q in range(13)]
        props.fairy_lights("garland_lights%d" % side, path, wire, emissive("garland_bulb%d" % side, "#ffd08a", 26.0), socket, 0.62, 0.05, 11 + side)
    glassy = [props.glass_paint("bauble_red", "#b3202a", 0.08), props.glass_paint("bauble_gold", "#d9a441", 0.12), props.glass_paint("bauble_cream", "#f1e6cf", 0.1)]
    cap = plain("bauble_cap", "#d9b25a", 0.3, 1.0)
    for i, (bx, by, br) in enumerate(((-2.35, -1.05, 0.2), (2.5, -0.95, 0.17), (-3.9, -0.8, 0.15), (4.3, -1.0, 0.21), (-6.2, -0.7, 0.18), (6.6, -0.6, 0.16))):
        parent(props.bauble("bauble%d" % i, br, glassy[i % 3], cap), "bauble_pivot%d" % i, Vector((bx, by, 0.0)), rnd.uniform(0, TAU))
    # two candles in brass sticks, lit
    brass = plain("stick_brass", "#c99a44", 0.3, 1.0)
    wax = plain("wax", "#f4ecd8", 0.5, sss=0.5, sss_scale=0.1)
    flame = emissive("flame", "#ffb040", 40.0)
    for i, (cx, cy, ch) in enumerate(((-2.75, 0.25, 2.3), (2.75, 0.35, 1.8), (-7.6, 0.6, 2.0), (7.9, 0.5, 2.5))):
        stick = lathe("stick%d" % i, [(0.0, 0.0), (0.36, 0.0), (0.38, 0.05), (0.14, 0.12), (0.07, 0.3), (0.1, 0.62), (0.06, 0.7), (0.17, 0.82), (0.18, 0.9), (0.0, 0.9)], 40, brass)
        taper = lathe("taper%d" % i, [(0.0, 0.86), (0.085, 0.86), (0.075, 0.86 + ch), (0.03, 0.9 + ch), (0.0, 0.9 + ch)], 24, wax)
        wick = tube("wick%d" % i, [Vector((0, 0, 0.88 + ch)), Vector((0.006, 0, 0.98 + ch))], 0.008, 6, plain("wick_mat%d" % i, "#2a1a10", 0.8))
        fl = lathe("flame%d" % i, [(0.0, 0.96 + ch), (0.035, 1.0 + ch), (0.05, 1.07 + ch), (0.034, 1.18 + ch), (0.012, 1.28 + ch), (0.0, 1.33 + ch)], 16, flame)
        parent([stick, taper, wick, fl], "candle_pivot%d" % i, Vector((cx, cy, 0.0)))
        persp.point("candle_light%d" % i, Vector((cx, cy - 0.05, 1.2 + ch)), 22.0, (1.0, 0.62, 0.28), 0.05)
    # two tealights at the house's front corners: the candles a phone's narrow screen still has
    cup = plain("tealight_cup", "#d9b25a", 0.3, 1.0)
    for i, (tx, ty) in enumerate(((-1.93, -0.98), (1.93, -0.98))):
        parent(desk.tealight("tealight%d" % i, cup, wax, emissive("tealight_flame%d" % i, "#ffb040", 34.0), plain("tealight_wick%d" % i, "#2a1a10", 0.8), 0.17), "tealight_pivot%d" % i, Vector((tx, ty, 0.0)), 0.0, 0.34)
        persp.point("tealight_light%d" % i, Vector((tx, ty - 0.02, 0.36)), 5.0, (1.0, 0.62, 0.28), 0.03)
    # presents further along, for a wide screen
    for i, (px, py, w, d, h, base, rib) in enumerate(((-10.6, 0.3, 1.9, 1.4, 1.2, "#a3151f", "#f6d488"), (10.9, 0.2, 1.6, 1.5, 1.5, "#f1e6cf", "#a3151f"), (-12.9, 0.5, 1.3, 1.2, 0.9, "#1f4a36", "#f6d488"), (13.2, 0.7, 1.2, 1.2, 0.8, "#c9963a", "#f1e6cf"))):
        body, ribs = props.present("gift%d" % i, w, d, h, kit.paper("gift_paper%d" % i, base), kit.satin("gift_ribbon%d" % i, rib), 0.22, True, 0.6)
        parent(([body] if not isinstance(body, (list, tuple)) else list(body)) + list(ribs), "gift_pivot%d" % i, Vector((px, py, 0.0)), rnd.uniform(-0.4, 0.4))


OPT = kit.cli()
CAM_AT = (0.0, -15.2, 3.0)
LOOK_AT = (0.0, 0.0, 2.74)


def build(look, doors_open):
    reset()
    kit.MANIFEST["bulbs"] = []
    rnd = random.Random(12)
    persp.setup(CAM_AT, LOOK_AT, lens=35.0, ppk=10.0, samples=OPT["samples"] or 220, preview=OPT["preview"], exposure=0.35, fstop=0.3, focus=(0.0, FRONT_Y, 2.4))
    persp.world_night("#0e0c0a", "#1c1611", 0.18)
    layer("lights")
    # a lamp in the room, warm, from the upper left; a cooler breath from the right so the shadows are not black
    persp.area("room_lamp", (-7.0, -8.0, 11.0), (0.0, 0.0, 2.4), 1250.0, 5.0, (1.0, 0.8, 0.58))
    persp.area("fill", (11.0, -10.0, 5.0), (0.0, 0.0, 2.4), 150.0, 10.0, (0.74, 0.84, 1.0), shadow=False)
    room(look, rnd)
    house(look, doors_open)
    kit.MANIFEST["bulbs"] = []
    glow(1.8, 7)


# ------------------------------------------------------------------------------------- what a niche holds

NICHE_SPRITES = ("envelope", "tag", "cane", "gingerbread", "starcookie", "bauble", "bell", "orange")
LOOK_DOWN = math.radians(6.0)   # how far down the lens looks into a niche: between the bottom row's ten degrees and the top row's none
BACK = NICHE * 0.45             # from where a thing stands (the middle of the floor, a little back) to the niche's back wall
FRONT = NICHE * 0.55


def _world_box(objs):
    dg = bpy.context.evaluated_depsgraph_get()
    lo, hi = Vector((1e9, 1e9, 1e9)), Vector((-1e9, -1e9, -1e9))
    for ob in objs:
        if ob.type not in ("MESH", "CURVE", "META"):
            continue
        ev = ob.evaluated_get(dg)
        for corner in ev.bound_box:
            q = ev.matrix_world @ Vector(corner)
            lo = Vector((min(lo.x, q.x), min(lo.y, q.y), min(lo.z, q.z)))
            hi = Vector((max(hi.x, q.x), max(hi.y, q.y), max(hi.z, q.z)))
    return lo, hi


def stand(parts, name, scale=1.0, lean=0.0, against_wall=True):
    """
    Stands a thing that was built lying on its back (its top up the table) on the niche's floor: upright, tipped back by
    `lean` degrees, its foot on the floor. `against_wall` rests its top on the back wall; otherwise it sits in the middle.
    """
    parts = list(parts) if isinstance(parts, (list, tuple)) else [parts]
    e = parent(parts, name + "_pivot", Vector((0, 0, 0)), 0.0, scale)
    e.rotation_euler = (math.radians(90.0 - lean), 0.0, 0.0)
    bpy.context.view_layer.update()
    lo, hi = _world_box(parts)
    e.location = Vector((-(lo.x + hi.x) / 2.0, (BACK - 0.004 - hi.y) if against_wall else -(lo.y + hi.y) / 2.0, -lo.z))
    bpy.context.view_layer.update()
    return e


def standing(out):
    """What a niche holds, each standing in one by itself: seen as the lens sees a niche, lit from its roof, its shadow on the floor and the back wall."""
    tilt = math.pi / 2.0 - LOOK_DOWN
    kit.TILT, kit.COS_T, kit.SIN_T = tilt, math.cos(tilt), math.sin(tilt)
    reset()
    kit.setup(160.0, 240.0, 10.0, OPT["samples"] or 220, OPT["preview"], exposure=0.35, contrast="Medium High Contrast")
    lights(key=0.0, world=0.22, hdri="studio.exr")
    layer("lights")
    # the niche's own lamp, under its roof near the front, and the room's from further off so nothing is one-sided
    persp.area("niche_lamp", (-0.06, -FRONT + 0.1, OPEN_H + 0.12), (0.0, 0.03, 0.12), 2.6, 0.32, (1.0, 0.78, 0.5))
    persp.area("room_lamp", (-1.6, -3.2, 2.4), (0.0, 0.0, 0.2), 9.0, 1.6, (1.0, 0.86, 0.68), shadow=False)
    # where shadows fall: the niche's floor and its back wall, and nothing in front of it
    layer("catch")
    grey = plain("catch_mat", "#808080", 0.9)
    hw = OPEN_W / 2.0
    for nm, verts in (("catch_floor", [(-hw, -FRONT, 0), (hw, -FRONT, 0), (hw, BACK, 0), (-hw, BACK, 0)]), ("catch_wall", [(-hw, BACK, 0), (hw, BACK, 0), (hw, BACK, OPEN_H), (-hw, BACK, OPEN_H)])):
        mesh_obj(nm, verts, [(0, 1, 2, 3)], grey, smooth=False).is_shadow_catcher = True

    layer("envelope")
    stand(desk.envelope("envelope", desk.letter_paper("envelope_paper", "#fbf3e2", "#f0e2c6"), plain("seal_wax", "#a3151f", 0.35, coat=0.4)), "envelope", 0.2, 13.0)
    layer("tag")
    # the tag a read note leaves behind: cream card, a brass eyelet; the name is written on it by the gift
    tw, th = 2.05, 1.25
    tag = stand(props.tag("tag", desk.letter_paper("tag_paper", "#fbf3e2", "#efe0c2"), tw, th, ring_mat=plain("tag_brass", "#d9a84a", 0.3, 1.0)), "tag", 0.265, 13.0)
    for nm, (lx, ly) in (("tagTL", (-tw / 2 + 0.52, th / 2 - 0.14)), ("tagBR", (tw / 2 - 0.12, -th / 2 + 0.14))):
        kit.anchor(nm, tag.matrix_world @ Vector((lx, ly, 0.045)))
    layer("cane")
    stand(props.candy_cane("cane", props.candy_material("cane_stripes"), 0.25, 0.03, 0.074), "cane", 1.0, 12.0)
    layer("gingerbread")
    cookie = props.cookie_material("cookie", "#b9783e")
    white = plain("icing", "#fffdf6", 0.42, sss=0.5, sss_scale=0.06)
    # built full size and stood small: a metaball has one fineness whatever its size, and a small one comes out in facets
    stand(props.gingerbread("man", cookie, white, plain("man_red", "#c4202a", 0.4), plain("man_dark", "#2a1608", 0.6), 1.0), "man", 0.21, 12.0)
    layer("starcookie")
    stand(props.star_cookie("starcookie", cookie, white, 0.2), "starcookie", 1.0, 14.0)
    layer("bauble")
    stand(props.bauble("bauble", 0.17, props.glass_paint("bauble_glass", "#1f6a48", 0.08), plain("bauble_cap", "#d9b25a", 0.3, 1.0)), "bauble", 1.0, 0.0, False)
    layer("bell")
    stand(desk.sleigh_bell("bell", plain("bell_gold", "#e0b24c", 0.26, 1.0), plain("bell_slit", "#2a1c0a", 0.8), 0.165), "bell", 1.0, 0.0, False)
    layer("orange")
    stand(props.orange_slice("orange", props.orange_slice_material("orange_mat"), 0.2), "orange", 1.0, 14.0)

    # the floor's middle as the lens sees it: the gift stands each sprite by this point on a door's own (d<n>C)
    kit.anchor("nicheFloor", Vector((0, 0, 0)))
    kit.anchor("nicheTL", Vector((-hw, -FRONT, OPEN_H)))
    kit.anchor("nicheBR", Vector((hw, -FRONT, 0)))
    for name in NICHE_SPRITES:
        render_sprite(name, os.path.join(out, name + ".png"), [name], catch=("catch",), pad=(1.6, 1.0, 1.6, 2.6), density=3.6)


def broken_rule(w, length, inset, gap, z=0.036):
    """A rule round a sheet, `inset` from its edge, open for `gap` either side of the middle of its top: where the star goes."""
    hw, hl = w / 2.0 - inset, length / 2.0 - inset
    return [Vector((x, y, z)) for (x, y) in ((gap, hl), (hw, hl), (hw, -hl), (-hw, -hl), (-hw, hl), (-gap, hl))]


def flat(out):
    """The papers a note and the sender's letter are read on, and the paper a photo is printed on: from straight above, each alone with its shadow."""
    kit.TILT = 0.0
    kit.COS_T, kit.SIN_T = 1.0, 0.0
    reset()
    kit.setup(160.0, 240.0, 10.0, OPT["samples"] or 200, OPT["preview"])
    lights(key=3000.0, world=0.3, hdri="studio.exr")
    foil = plain("card_gold", "#d9a84a", 0.3, 1.0)
    # the card a note is read on: cream card, a line of gold round it
    layer("card")
    w, length = 7.4, 10.4
    kit.prism("card", kit.rounded_rect(w, length, 0.22), 0.035, desk.letter_paper("card_paper", "#fbf5e8", "#f1e6cf"), 0.0, 0.008, 2)
    edge = kit.rounded_rect(w - 0.5, length - 0.5, 0.16)
    tube("card_line", [Vector((x, y, 0.036)) for (x, y) in edge + [edge[0]]], 0.012, 6, foil, cap=False)
    # the sender's letter: the same stock, wider and square-cornered, two rules of gold and a foil star at its head
    # (the star of the gable's window, which is what was tapped to get it)
    layer("letter")
    lw, ll = 8.8, 12.4
    kit.prism("letter", kit.rounded_rect(lw, ll, 0.05), 0.035, desk.letter_paper("letter_stock", "#fbf5e8", "#f1e6cf"), 0.0, 0.008, 2)
    tube("letter_rule0", broken_rule(lw, ll, 0.3, 0.74), 0.02, 6, foil)
    tube("letter_rule1", broken_rule(lw, ll, 0.42, 0.74), 0.008, 6, foil)
    star = kit.prism("letter_star", kit.star_outline(5, 0.46, 0.2), 0.012, plain("letter_foil", "#d9a441", 0.34, 0.0, coat=0.5, coat_rough=0.2), 0.035, 0.004, 2)
    place(star, (0, ll / 2 - 0.36, 0.0))
    # the paper a photo is printed on: white, a little thick, nothing on it. The gift cuts it into a frame of any shape.
    layer("print")
    pw = 3.0
    kit.prism("print", kit.rounded_rect(pw, pw, 0.03), 0.02, plain("print_paper", "#fdfbf5", 0.5, spec=0.3), 0.0, 0.006, 2)
    catcher()
    kit.anchor("printTL", Vector((-pw / 2, pw / 2, 0.02)))
    kit.anchor("printBR", Vector((pw / 2, -pw / 2, 0.02)))
    render_sprite("card", os.path.join(out, "card.png"), ["card"], catch=("catch",), pad=(1.5, 1.5, 3.0, 3.0), density=1.3)
    render_sprite("letter", os.path.join(out, "letter.png"), ["letter"], catch=("catch",), pad=(1.5, 1.5, 3.0, 3.0), density=1.2)
    render_sprite("print", os.path.join(out, "print.png"), ["print"], catch=("catch",), pad=(1.2, 1.2, 2.4, 2.4), density=3.0)
    kit.MANIFEST["sheets"] = {
        "card": {"sprite": "card", "top": 0.1, "mid": 0.5, "bottom": 0.1, "gain": 1.1},
        "letter": {"sprite": "letter", "top": 0.12, "mid": 0.5, "bottom": 0.08, "gain": 1.1},
    }


def main():
    out = OPT["out"]
    looks = OPT["look"] or list(LOOKS)
    only = OPT["only"] or ["closed", "open", "sprites", "papers"]
    for look in looks:
        if "closed" in only:
            build(look, False)
            persp.render(os.path.join(out, "plate-%s-closed-wide.png" % look))
        if "open" in only:
            build(look, True)
            persp.render(os.path.join(out, "plate-%s-open-wide.png" % look))
    # every pass starts from nothing, so what the passes before it found is kept by hand
    anchors = dict(kit.MANIFEST["anchors"])
    found = dict(kit.MANIFEST["sprites"])
    if "sprites" in only:
        standing(out)
        anchors.update(kit.MANIFEST["anchors"])
        found.update(kit.MANIFEST["sprites"])
    if "papers" in only:
        flat(out)
        anchors.update(kit.MANIFEST["anchors"])
        found.update(kit.MANIFEST["sprites"])
    kit.MANIFEST["anchors"] = anchors
    kit.MANIFEST["sprites"] = found
    kit.MANIFEST["doors"] = {str(n): {"col": c, "row": r} for (c, r), n in numbers().items()}
    kit.MANIFEST["niche"] = {"w": OPEN_W, "h": OPEN_H, "frame": T}
    # the note is read in front of the scene itself, dimmed: no out-of-focus plates. A photo's print is lifted to white.
    kit.MANIFEST["soft"] = False
    kit.MANIFEST["gains"] = {"print": 1.13}
    # the scene's own file name, for the line pack.mjs writes at the head of art-map.ts (it is not the gift's slug)
    persp.save(os.path.join(out, "manifest.json"), persp=True, scene="advent")


main()
