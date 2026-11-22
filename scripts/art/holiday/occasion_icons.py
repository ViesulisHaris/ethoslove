"""
The gallery's occasion tiles: one small rendered object for each day a gift is made for (the owner's
mock-up of 22 Nov 2026, docs/marketing/growth-build/shots/mockups/OWNER-MOCKUP-gallery.webp).

    blender --background --factory-startup --python occasion_icons.py -- --out <dir> [--preview] [--only birthday,all]

Each is seen from straight on, alone on nothing (the tile it stands on gives it its shadow), in its own colours:
a pink cake, an orange pumpkin, a green tree. The first set was all wine, as the mock-up's were, and
the owner called it depressing ("make the icons... a bit more colorful... even in the mockup they
lacked color"). One picture serves the pale tile and the dark tile of the occasion that is open.
A thing that stands (a cake, a pumpkin, a glass) is built standing and laid on its back under the
camera. scripts/art/holiday/pack-icons.mjs turns the PNGs into public/art/occasions/*.webp.
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import kit  # noqa: E402
from kit import TAU, emissive, lathe, layer, lights, parent, place, plain, render_sprite, reset, sphere, tube  # noqa: E402
import props  # noqa: E402
import props_desk as desk  # noqa: E402

# One palette for the fourteen: clear colours, a little soft, that sit on the site's cream.
RED, BERRY, ROSE, PINK = "#dd3a4f", "#b3203e", "#ee93a3", "#f6bcc8"
CREAM, WHITE = "#fbf0e2", "#fffaf2"
GOLD, YELLOW, CHAMPAGNE = "#e2b24a", "#f6c84c", "#f5d98e"
ORANGE, RUST = "#ef8a2e", "#d9622b"
LEAF, FIR, BROWN = "#62a05a", "#2f7a4f", "#7a4a2a"
NAVY, BLUE, SKY, AQUA = "#2c4674", "#3f6fb0", "#a9cbee", "#bfe6ec"

ICONS = ("all", "birthday", "anniversary", "valentines", "wedding", "graduation", "christmas", "halloween", "thanksgiving", "mothers-day", "fathers-day", "apology", "long-distance", "just-because")

_n = [0]


def clay(color, rough=0.5):
    """Matt and soft, like a painted wooden toy: a little light gets under the surface."""
    _n[0] += 1
    return plain("clay%d" % _n[0], color, rough, sss=0.25, sss_scale=0.04, coat=0.1, coat_rough=0.4)


def metal(color=GOLD):
    _n[0] += 1
    return plain("metal%d" % _n[0], color, 0.3, 1.0)


def stand(parts, name, lift=0.0, turn=0.0, tilt=-90.0):
    """Lays a thing built standing on its back, so the camera overhead sees its front; `turn` leans it as seen."""
    e = parent(parts, name, Vector((0, 0, lift)))
    e.rotation_euler = (math.radians(tilt), 0, 0)
    return parent([e], name + "_lean", Vector((0, 0, 0)), math.radians(turn))


def heart_outline(s=1.0, n=48):
    pts = []
    for i in range(n):
        t = TAU * i / n
        pts.append((s * 0.062 * 16 * math.sin(t) ** 3, s * 0.062 * (13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))))
    return list(reversed(pts))


def puff(name, outline, h, mat, r=0.06):
    """A flat shape made thick and round at its edges: the body of the icons that are a sign and not a thing."""
    return kit.prism(name, outline, h, mat, 0.0, r, 4)


def build(icon):
    layer(icon)
    if icon == "all":
        parts = desk.envelope("env", clay(CREAM), clay(RED), 2.0, 1.4)
        # the seal is a heart, not a blob of wax
        bpy.data.objects.remove(parts[2], do_unlink=True)
        heart = puff("env_heart", heart_outline(0.3), 0.07, clay(RED), 0.03)
        place(heart, (0.0, -0.12, 0.05))
        edge = kit.prism("env_edge", kit.rounded_rect(2.1, 1.5, 0.08), 0.02, clay(ROSE), -0.0, 0.0)
        return parts[:2] + [heart, edge]
    if icon == "birthday":
        white = clay(WHITE)
        plate = lathe("plate", [(0.0, 0.0), (1.05, 0.0), (1.1, 0.05), (1.05, 0.1), (0.0, 0.1)], 48, clay(SKY))
        low = lathe("cake", [(0.0, 0.1), (0.82, 0.1), (0.86, 0.16), (0.86, 0.7), (0.8, 0.76), (0.0, 0.76)], 48, clay(PINK))
        icing = lathe("icing", [(0.0, 0.74), (0.88, 0.74), (0.9, 0.8), (0.86, 0.9), (0.0, 0.92)], 48, white)
        drips = [place(sphere("drip%d" % i, 0.1, white, 12, 8, 1.5), (0.84 * math.cos(a), 0.84 * math.sin(a), 0.7)) for i, a in enumerate([-2.4, -1.95, -1.5, -1.05, -0.6])]
        candle = lathe("candle", [(0.0, 0.9), (0.07, 0.9), (0.07, 1.45), (0.0, 1.45)], 16, clay(YELLOW))
        flame = lathe("flame", [(0.0, 1.5), (0.06, 1.56), (0.085, 1.66), (0.05, 1.8), (0.0, 1.9)], 16, emissive("flame_mat", "#ffb040", 7.0))
        berries = [place(sphere("berry%d" % i, 0.13, clay(RED), 16, 10), (x, -0.5, 0.98)) for i, x in enumerate((-0.42, 0.38))]
        return [stand([plate, low, icing, candle, flame] + berries + drips, "cake_pivot", 0.9)]
    if icon == "anniversary":
        groups = []
        for s in (-1, 1):
            glass = lathe("flute%d" % s, [(0.0, 0.0), (0.3, 0.0), (0.32, 0.04), (0.06, 0.1), (0.04, 0.75), (0.2, 0.95), (0.26, 1.7), (0.22, 1.7), (0.17, 1.0), (0.0, 0.9)], 40, clay(WHITE, 0.25))
            fizz = lathe("fizz%d" % s, [(0.0, 0.94), (0.2, 0.99), (0.255, 1.55), (0.0, 1.55)], 32, clay(CHAMPAGNE, 0.3))
            fizz.scale = (1.03, 1.03, 1.0)
            g = parent([glass, fizz], "flute_pivot%d" % s, Vector((s * 0.36, 0, 0)))
            g.rotation_euler = (0, math.radians(s * 14), 0)
            groups.append(g)
        heart = puff("toast_heart", heart_outline(0.2), 0.08, clay(RED), 0.03)
        heart.rotation_euler = (math.radians(90), 0, 0)
        heart.location = (0.0, 0.04, 2.02)
        return [stand(groups + [heart], "flutes_pivot", 0.35)]
    if icon == "valentines":
        return [puff("heart", heart_outline(1.0), 0.32, clay(RED), 0.12)]
    if icon == "wedding":
        gold = metal(GOLD)
        ring = tube("ring", [Vector((0.62 * math.cos(TAU * i / 64), 0.62 * math.sin(TAU * i / 64) - 0.25, 0.14)) for i in range(65)], 0.115, 16, gold, cap=False)
        setting = place(lathe("setting", [(0.0, 0.0), (0.16, 0.0), (0.2, 0.1), (0.0, 0.1)], 16, gold), (0, 0.42, 0.1))
        gem = lathe("gem", [(0.0, 0.0), (0.2, 0.0), (0.3, 0.14), (0.2, 0.26), (0.0, 0.3)], 8, plain("gem_mat", AQUA, 0.08, coat=0.8, coat_rough=0.05), smooth=False)
        place(gem, (0, 0.42, 0.18))
        return [ring, setting, gem]
    if icon == "graduation":
        gold = metal(GOLD)
        cap = lathe("cap_band", [(0.0, 0.0), (0.62, 0.0), (0.66, 0.06), (0.6, 0.5), (0.0, 0.5)], 40, clay(NAVY))
        board = kit.prism("board", [(-1.15, 0.0), (0.0, -0.42), (1.15, 0.0), (0.0, 0.42)], 0.1, clay(BLUE), 0.5, 0.03, 3)
        button = place(sphere("button", 0.09, gold, 12, 8, 0.6), (0, 0, 0.62))
        tassel = tube("tassel", [Vector((0, 0, 0.64)), Vector((0.5, -0.1, 0.62)), Vector((0.86, -0.12, 0.5)), Vector((0.9, -0.12, 0.05))], 0.03, 8, gold)
        tuft = lathe("tuft", [(0.0, 0.0), (0.09, 0.0), (0.05, 0.26), (0.0, 0.28)], 12, gold)
        place(tuft, (0.9, -0.12, -0.22))
        return [stand([cap, board, button, tassel, tuft], "cap_pivot", 0.5, 0.0, -62.0)]
    if icon == "christmas":
        fir = clay(FIR)
        tiers = [lathe("fir%d" % i, [(0.0, z0), (r, z0), (r * 0.92, z0 + 0.06), (0.0, z0 + h)], 40, fir) for i, (r, z0, h) in enumerate(((0.95, 0.35, 0.8), (0.74, 0.85, 0.75), (0.52, 1.32, 0.72)))]
        trunk = lathe("trunk", [(0.0, 0.0), (0.16, 0.0), (0.16, 0.4), (0.0, 0.4)], 16, clay(BROWN))
        star = kit.prism("star", kit.star_outline(5, 0.2, 0.09), 0.08, metal(YELLOW), 0.0, 0.02, 2)
        star.rotation_euler = (math.radians(90), 0, 0)
        star.location = (0, 0.04, 2.14)
        colours = [clay(RED), clay(YELLOW), clay(WHITE)]
        dots = [place(sphere("bauble%d" % i, 0.08, colours[i % 3], 10, 6), (x, -abs(r_) * 0.9, z)) for i, (x, r_, z) in enumerate(((-0.4, 0.5, 0.62), (0.3, 0.6, 0.78), (-0.1, 0.5, 1.2), (0.28, 0.3, 1.36), (-0.12, 0.3, 1.66)))]
        return [stand(tiers + [trunk, star] + dots, "tree_pivot", 0.5)]
    if icon == "halloween":
        return [stand(desk.pumpkin("pumpkin", clay(ORANGE), clay(LEAF), 0.95, 7, 0.74, 3), "pumpkin_pivot", 0.95)]
    if icon == "thanksgiving":
        return [parent(desk.maple_leaf("maple", clay(RUST), 1.15, 2), "maple_pivot", Vector((0, 0, 0)), math.radians(-14))]
    if icon == "mothers-day":
        petals = []
        for i in range(5):
            a = TAU * i / 5 + math.pi / 2
            petals.append(place(sphere("petal%d" % i, 0.34, clay(PINK if i % 2 == 0 else ROSE), 20, 12, 0.45), (0.4 * math.cos(a), 0.55 + 0.4 * math.sin(a), 0.16)))
        eye = place(sphere("eye", 0.2, clay(YELLOW), 16, 10, 0.6), (0, 0.55, 0.26))
        green = clay(LEAF)
        stem = tube("stem", [Vector((0.0, 0.2, 0.06)), Vector((0.06, -0.4, 0.07)), Vector((0.0, -1.1, 0.06))], 0.05, 10, green)
        leaf = kit.prism("leaf", [(0.0, 0.0), (0.26, 0.16), (0.62, 0.14), (0.3, -0.06)], 0.06, green, 0.0, 0.02, 2)
        place(leaf, (0.04, -0.62, 0.02))
        return petals + [eye, stem, leaf]
    if icon == "fathers-day":
        blue = clay(BLUE)
        wings = [puff("wing%d" % s, [(0.0, 0.2), (s * 1.0, 0.52), (s * 1.08, 0.0), (s * 1.0, -0.52), (0.0, -0.2)] if s > 0 else [(0.0, -0.2), (-1.0, -0.52), (-1.08, 0.0), (-1.0, 0.52), (0.0, 0.2)], 0.22, blue, 0.08) for s in (-1, 1)]
        knot = puff("knot", kit.rounded_rect(0.42, 0.56, 0.1), 0.3, clay(NAVY), 0.08)
        white = clay(WHITE)
        dots = [place(sphere("dot%d" % i, 0.06, white, 10, 6, 0.5), (x, y, 0.23)) for i, (x, y) in enumerate(((-0.55, 0.14), (-0.78, -0.16), (-0.42, -0.14), (0.55, 0.14), (0.78, -0.16), (0.42, -0.14)))]
        return wings + [knot] + dots
    if icon == "apology":
        heart = puff("mended", heart_outline(0.95), 0.3, clay(ROSE), 0.12)
        strip = puff("plaster", kit.rounded_rect(1.0, 0.34, 0.14), 0.07, clay(CREAM), 0.03)
        place(strip, (0.02, 0.22, 0.3), (0, 0, math.radians(-28)))
        pad = puff("plaster_pad", kit.rounded_rect(0.3, 0.26, 0.05), 0.03, clay("#f0d2bd"), 0.01)
        place(pad, (0.02, 0.22, 0.365), (0, 0, math.radians(-28)))
        return [heart, strip, pad]
    if icon == "long-distance":
        # a paper plane as it is always drawn: a dart flying up to the right, the near wing pale and the far one in shade
        near = puff("plane_near", [(-1.15, 0.1), (1.2, 0.95), (-0.15, -0.3)], 0.1, clay(WHITE), 0.02)
        far = puff("plane_far", [(-0.15, -0.3), (1.2, 0.95), (0.25, -1.0)], 0.08, clay(SKY), 0.02)
        keel = puff("plane_keel", [(-0.15, -0.3), (0.25, -1.0), (-0.02, -0.62)], 0.06, clay(BLUE), 0.01)
        sky = clay(SKY)
        trail = [place(sphere("trail%d" % i, 0.05, sky, 8, 6), (-1.05 - 0.24 * i, -0.62 - 0.2 * i, 0.06)) for i in range(3)]
        return [near, far, keel] + trail
    if icon == "just-because":
        body, ribs = props.present("gift", 1.35, 1.35, 1.05, clay(YELLOW), clay(RED), 0.2, True, 0.75)
        return [stand([body] + list(ribs), "gift_pivot", 0.7, 0.0, -58.0)]
    raise ValueError(icon)


OPT = kit.cli()


def main():
    out = OPT["out"]
    only = OPT["only"] or list(ICONS)
    kit.TILT = 0.0
    kit.COS_T, kit.SIN_T = 1.0, 0.0
    reset()
    kit.setup(60.0, 60.0, 10.0, OPT["samples"] or 200, OPT["preview"])
    lights(key=2800.0, world=0.45, hdri="studio.exr")
    for icon in only:
        build(icon)
    # No ground under them: a tall thing's shadow ran off the picture's edge and showed as a box on the tile. The tile gives each its shadow (CSS).
    # A thing laid on its back was turned after it was made: the scene has to know before its bounds are read.
    bpy.context.view_layer.update()
    for icon in only:
        render_sprite(icon, os.path.join(out, "%s.png" % icon), [icon], catch=(), pad=(1.0, 1.0, 1.0, 1.0), density=2.5)
    kit.save_manifest(os.path.join(out, "manifest.json"))


main()
