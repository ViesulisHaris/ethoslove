"""
Winter things shared by the scenes that have snow in them: the snow itself, firs with snow on their
boughs, a snowman holding a blackboard. Lengths are in metres.
"""

import math

import bpy  # noqa: F401
from mathutils import Vector

import kit
from kit import TAU, box, cloth, emissive, lathe, parent, place, plain, sphere, tube, wood
import props


def snow_material(name="snow"):
    m = kit.Mat(name)
    obj = m.coords("Object")
    n, _ = m.noise(obj, 1.2, 4.0, 0.6)
    sparkle, _ = m.noise(obj, 220.0, 1.0, 0.5)
    m.set(base=m.ramp(n, [(0.3, "#c9d4e4"), (0.7, "#edf2f9")]), rough=0.55, sss=0.35, sss_scale=0.08, spec=0.6,
          coat=m.math("GREATER_THAN", sparkle, 0.78), coat_rough=0.05, normal=m.bump(n, 0.25, 0.05))
    return m.mat


def kit_darken(hexcolor, f=0.7):
    h = hexcolor.lstrip("#")
    return "#%02x%02x%02x" % tuple(int(int(h[i:i + 2], 16) * f) for i in (0, 2, 4))


def snowy_fir(name, x, y, h, rnd, lights=False):
    """A fir in the snow: a trunk and stacked skirts of needles, each with snow lying on it."""
    needles = props.needle_material(name + "_needles", "#0f2a18", "#24502e")
    snow = snow_material(name + "_snow")
    parts = [tube(name + "_trunk", [Vector((0, 0, 0)), Vector((0, 0, h * 0.25))], h * 0.035, 8, plain(name + "_bark", "#3a2a1c", 0.9))]
    tiers = 6
    for k in range(tiers):
        t = k / tiers
        r = h * 0.32 * (1 - t) + 0.12
        z0 = h * (0.12 + 0.8 * t)
        skirt = lathe("%s_skirt%d" % (name, k), [(0.0, z0 + h * 0.2), (r * 0.25, z0 + h * 0.14), (r, z0), (r * 0.9, z0 - 0.06), (0.0, z0 + 0.02)], 18, needles)
        kit.displace(skirt, 0.08, 0.25)
        parts.append(skirt)
        cap = lathe("%s_snowcap%d" % (name, k), [(0.0, z0 + h * 0.205), (r * 0.25, z0 + h * 0.15), (r * 0.8, z0 + 0.05), (r * 0.6, z0 + 0.03), (0.0, z0 + 0.1)], 18, snow)
        kit.displace(cap, 0.05, 0.3)
        parts.append(cap)
        if lights:
            for q in range(9):
                a = rnd.uniform(0, TAU)
                rr = r * rnd.uniform(0.7, 0.95)
                b = sphere("%s_light%d_%d" % (name, k, q), 0.05, emissive("%s_l%d" % (name, q % 3), ["#ffd27a", "#ff5a4a", "#7ab8ff"][q % 3], 40.0), 8, 5)
                place(b, (rr * math.cos(a), rr * math.sin(a), z0 + 0.05))
                parts.append(b)
    parent(parts, name + "_pivot", (x, y, 0), rnd.uniform(0, TAU))


def snowman(name, x, y):
    """A snowman holding a little blackboard on a stick, turned to the window. Returns the board's four corners, for the words."""
    snow = snow_material(name + "_snow")
    coal = plain(name + "_coal", "#141414", 0.7)
    parts = []
    for (r, z) in ((0.55, 0.45), (0.42, 1.2), (0.3, 1.78)):
        s = sphere(name + "_ball%d" % len(parts), r, snow, 32, 16)
        kit.displace(s, 0.03, 1.5)
        place(s, (0, 0, z))
        parts.append(s)
    for ex in (-0.1, 0.1):
        e = sphere(name + "_eye%d" % int(ex * 10), 0.035, coal, 8, 6)
        place(e, (ex, -0.27, 1.86))
        parts.append(e)
    nose = lathe(name + "_nose", [(0.0, 0.0), (0.045, 0.0), (0.0, 0.26)], 10, plain(name + "_carrot", "#e0702a", 0.6))
    place(nose, (0, -0.29, 1.78), rot=(math.radians(90), 0, 0))
    parts.append(nose)
    for k in range(4):
        b = sphere(name + "_button%d" % k, 0.035, coal, 8, 6)
        place(b, (0, -0.42 + 0.02 * k, 1.42 - 0.17 * k))
        parts.append(b)
    scarf = tube(name + "_scarf", [Vector((0.25 * math.cos(a), 0.25 * math.sin(a), 1.52)) for a in [TAU * i / 24 for i in range(25)]], 0.07, 10, cloth(name + "_wool", "#b3302a", 40.0, 0.9, 0.8, "#f2ece0", 0.08))
    parts.append(scarf)
    hat = lathe(name + "_hat", [(0.0, 2.0), (0.32, 2.0), (0.32, 2.03), (0.2, 2.03), (0.19, 2.32), (0.0, 2.32)], 24, plain(name + "_felt", "#1e1e22", 0.6))
    parts.append(hat)
    stick = plain(name + "_stick", "#4a3422", 0.9)
    parts.append(tube(name + "_arm_l", [Vector((-0.38, 0, 1.3)), Vector((-0.75, -0.1, 1.55)), Vector((-0.95, -0.12, 1.7))], 0.025, 6, stick))
    parts.append(tube(name + "_arm_r", [Vector((0.38, 0, 1.3)), Vector((0.62, -0.32, 1.25)), Vector((0.5, -0.5, 1.35))], 0.025, 6, stick))
    # the blackboard he holds out, on its stake
    bw, bh = 1.7, 1.05
    board = box(name + "_board", (bw, 0.05, bh), plain(name + "_slate", "#24302a", 0.85), 0.0, 0.01, 1)
    place(board, (1.3, -0.55, 0.95))
    rim = wood(name + "_rim", "#8a5a32", "#5a3a1e", 0.2, 0.6)
    for (sx, sz, w, h) in ((0, 0.95 + bh, bw + 0.1, 0.06), (0, 0.95 - 0.03, bw + 0.1, 0.06), (-bw / 2 - 0.02, 0.95, 0.06, bh + 0.03), (bw / 2 + 0.02, 0.95, 0.06, bh + 0.03)):
        b = box(name + "_rim%d" % len(parts), (w, 0.07, h), rim, 0.0)
        place(b, (1.3 + sx, -0.56, sz))
        parts.append(b)
    parts.append(board)
    parts.append(tube(name + "_stake", [Vector((1.3, -0.5, 0.0)), Vector((1.3, -0.5, 0.95))], 0.04, 8, rim))
    parent(parts, name + "_pivot", (x, y, 0))
    cx, cy = x + 1.3, y - 0.6
    return [Vector((cx - bw / 2 + 0.06, cy, 0.95 + bh - 0.06)), Vector((cx + bw / 2 - 0.06, cy, 0.95 + bh - 0.06)), Vector((cx + bw / 2 - 0.06, cy, 1.01)), Vector((cx - bw / 2 + 0.06, cy, 1.01))]

