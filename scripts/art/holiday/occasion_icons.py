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


def glossy(color):
    """Clay with a glaze on it: the light slides over a round thing and shows that it is round."""
    _n[0] += 1
    return plain("glossy%d" % _n[0], color, 0.32, sss=0.25, sss_scale=0.04, coat=0.6, coat_rough=0.12)


def dome(name, outline, h, mat, centre=(0.0, 0.0), rings=12):
    """
    A flat shape puffed up like a cushion: its edge on the ground, rising in a quarter round to a top
    over `centre` (a point from which the whole edge can be seen). `puff` gives a slab with soft
    edges, which from straight above is a flat colour; this has no flat part, so the light falls
    off across it and it reads as a solid thing.

    As it rises the shape is smoothed round its edge, more with every ring, and drawn towards an
    oval: scaled down as it is, a heart kept its cleft and its point all the way to the top, and the
    two met in a hard crease down the middle with the light on one side of it and the shade on the
    other. Now the cleft is a valley that opens out as it climbs, and the top is one round swell.
    """
    n = len(outline)
    cx, cy = centre
    polar = [(math.atan2(y - cy, x - cx), math.hypot(x - cx, y - cy)) for (x, y) in outline]
    mean = sum(r for (_, r) in polar) / n
    verts, faces = [], []
    for k in range(rings):
        a = (math.pi / 2) * k / rings
        s, z = math.cos(a), h * math.sin(a)
        # how far round the edge a point is averaged with its neighbours, in points, and how far towards the oval
        sigma = 0.6 + 0.16 * n * (k / rings)
        m = 0.55 * (k / rings) ** 1.5
        reach = int(3 * sigma) + 1
        weights = [math.exp(-0.5 * (d / sigma) ** 2) for d in range(-reach, reach + 1)]
        total = sum(weights)
        for i, (t, _) in enumerate(polar):
            r = sum(w * polar[(i + d) % n][1] for d, w in zip(range(-reach, reach + 1), weights)) / total if k else polar[i][1]
            r = (1.0 - m) * r + m * mean
            verts.append((cx + s * r * math.cos(t), cy + s * r * math.sin(t), z))
    verts.append((cx, cy, h))
    top = len(verts) - 1
    for k in range(rings - 1):
        for i in range(n):
            j = (i + 1) % n
            faces.append((k * n + i, k * n + j, (k + 1) * n + j, (k + 1) * n + i))
    last = (rings - 1) * n
    for i in range(n):
        faces.append((last + i, last + (i + 1) % n, top))
    faces.append(tuple(range(n - 1, -1, -1)))
    return kit.mesh_obj(name, verts, faces, mat, True)


def ribbed_pumpkin(name, mat, stem_mat, r=1.0, lobes=8, squash=0.78, rib=0.3):
    """
    A pumpkin whose ribs can be seen from the front: broad round lobes with a narrow groove between
    each two, a lobe (not a groove) facing the camera. props_desk.pumpkin is drawn for a desk seen
    from above, where its shallow ribs show in the top; from the front it was one smooth ball.
    """
    seg, rings = lobes * 12, 26
    front = -math.pi / 2 - math.pi / lobes
    verts, faces = [], []
    for i in range(rings + 1):
        v = i / rings
        phi = math.pi * v
        for j in range(seg):
            th = TAU * j / seg
            groove = 1.0 - abs(math.sin(lobes * (th - front) / 2.0)) ** 0.5
            rr = r * math.sin(phi) ** 0.82 * (1.0 - rib * groove * math.sin(phi) ** 0.5)
            zz = r * squash * (-math.cos(phi)) * (1.0 - 0.16 * math.cos(phi) ** 8)
            if v > 0.86:
                zz -= r * 0.2 * ((v - 0.86) / 0.14) ** 2
            verts.append((rr * math.cos(th), rr * math.sin(th), zz + r * squash))
    for i in range(rings):
        for j in range(seg):
            a, b = i * seg + j, i * seg + (j + 1) % seg
            faces.append((a, b, b + seg, a + seg))
    body = kit.mesh_obj(name, verts, faces, mat, True)
    top = r * squash * 2 - r * 0.2
    path = [Vector((0.14 * r * math.sin(t * 2.0) * t, 0.12 * r * t * t, top - 0.06 * r + 0.5 * r * t)) for t in [i / 10 for i in range(11)]]
    stem = tube(name + "_stem", path, [0.2 * r * (1.0 - 0.45 * i / 10) for i in range(11)], 10, stem_mat)
    return [body, stem]


def veined_leaf(name, mat, vein_mat, size=1.0, curl=0.16):
    """
    A maple leaf with its veins standing on it and a stalk thick enough to be a stalk: props_desk's
    leaf is one of many scattered on a table, and alone on a tile it was a spiky shape on a wire.
    """
    half = desk.MAPLE[1:-1]
    outline = [desk.MAPLE[0]] + half + [desk.MAPLE[-1]] + [(-x, y) for (x, y) in reversed(half)]

    def lift(x, y):
        return 0.02 + curl * size * (x * x + 0.4 * (y - 0.1) ** 2)

    verts = [(0.0, 0.1 * size, lift(0.0, 0.1))] + [(x * size, y * size, lift(x, y)) for (x, y) in outline]
    n = len(outline)
    leaf = kit.mesh_obj(name, verts, [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)], mat, True)
    kit.solidify(leaf, 0.03 * size, 0.0)
    # The midrib runs from the stalk to the top lobe; four side veins leave it at the blade's middle
    # for the four large lobes, half sunk in the blade and thinning as they go. Run from the stalk's
    # foot to every lobe they crossed the notches between the lobes and stood out past the blade's
    # edge like twigs.
    hub = (0.0, -0.05)
    veins = [((0.0, -0.44), (0.0, 0.78), 0.024), (hub, (0.5, 0.42), 0.016), (hub, (-0.5, 0.42), 0.016), (hub, (0.72, 0.08), 0.016), (hub, (-0.72, 0.08), 0.016)]
    parts = [leaf]
    for k, (a, b, thick) in enumerate(veins):
        path = []
        for step in range(6):
            f = 0.84 * step / 5
            x, y = a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f
            path.append(Vector((x * size, y * size, lift(x, y) + 0.018 * size)))
        parts.append(tube("%s_vein%d" % (name, k), path, [thick * size * (1.0 - 0.8 * i / 5) for i in range(6)], 6, vein_mat))
    stalk = tube(name + "_stalk", [Vector((0.0, -0.4 * size, lift(0.0, -0.4) + 0.03 * size)), Vector((0.0, -0.56 * size, 0.04)), Vector((0.04 * size, -0.8 * size, 0.04)), Vector((0.13 * size, -1.02 * size, 0.04))], [0.03 * size, 0.034 * size, 0.036 * size, 0.042 * size], 8, vein_mat)
    return parts + [stalk]


def build(icon):
    layer(icon)
    if icon == "all":
        # A letter seen from its back: the body, the flap lying on it as a triangle with an edge of its
        # own, the two folds under the flap's point, and a heart where the seal goes. It was one flat
        # sheet with a line on it.
        w, h = 2.0, 1.4
        body = kit.prism("env", kit.rounded_rect(w, h, 0.07), 0.07, clay(WHITE), 0.0, 0.02, 3)
        flap = kit.prism("env_flap", [(-w / 2 + 0.04, h / 2 - 0.04), (0.0, -h * 0.14), (w / 2 - 0.04, h / 2 - 0.04)], 0.05, clay("#f9d8d0"), 0.07, 0.015, 2)
        fold = clay("#ecd9c6")
        folds = [tube("env_fold%d" % s, [Vector((s * (w / 2 - 0.06), -h / 2 + 0.06, 0.072)), Vector((s * 0.1, -h * 0.1, 0.072))], 0.012, 6, fold) for s in (-1, 1)]
        heart = dome("env_heart", heart_outline(0.3), 0.1, glossy(RED), (0.0, -0.01))
        place(heart, (0.0, -0.17, 0.12))
        edge = kit.prism("env_edge", kit.rounded_rect(2.1, 1.5, 0.08), 0.02, clay(ROSE), -0.0, 0.0)
        return [body, flap, heart, edge] + folds
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
        # Puffed, like a heart of blown glass: a slab with soft edges is a flat red shape from above.
        return [dome("heart", heart_outline(1.0, 72), 0.62, glossy(RED), (0.0, -0.05), 14)]
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
        return [stand(ribbed_pumpkin("pumpkin", desk.pumpkin_material("pumpkin_mat", ORANGE, RUST), clay("#5f7f3a"), 0.95), "pumpkin_pivot", 0.95)]
    if icon == "thanksgiving":
        return [parent(veined_leaf("maple", desk.leaf_material("maple_mat", ORANGE, RUST), clay("#9c3f17"), 1.15), "maple_pivot", Vector((0, 0, 0)), math.radians(-14))]
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
