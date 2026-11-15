"""
String the Lights: a cottage in the snow on Christmas Eve, seen from the road through a lens, before and after its lights go up.

    blender --background --factory-startup --python house_lights.py -- --out <dir> [--preview] [--look red] [--only dark,lit]

Per look it renders the view twice: the house dark under the moon (a street lamp, a neighbour's
window), and the same with a string of coloured bulbs along its gable and its porch, every window lit
and a glow on the board in the garden. The gift draws the bulbs being hung over the first picture
(their places go in the manifest, in order along the string) and fades to the second when the switch
is thrown. Lengths are in metres.
"""

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import kit  # noqa: E402
from kit import TAU, box, emissive, glow, layer, mesh_obj, parent, place, plain, reset, sphere, tube, wood  # noqa: E402
import persp  # noqa: E402
import winter  # noqa: E402
from cottage import cottage  # noqa: E402

LOOKS = {
    "red": ("#8a2620", "#f2ece0", "#1f3a2c", "#1f3a2c"),
    "navy": ("#26384e", "#f2ece0", "#a8261e", "#e9e2d2"),
    "sage": ("#6a7a5c", "#f6f1e4", "#7a2a22", "#3a4a34"),
}
BULB_COLORS = ["#ff3b30", "#ffd23a", "#34c759", "#3a8dff", "#ff9a2a"]
GABLE_BULBS = 17   # along each side of the gable
PORCH_BULBS = 6    # along each side of the porch


def move(objs, name):
    coll = layer(name)
    for ob in objs:
        for c in list(ob.users_collection):
            c.objects.unlink(ob)
        coll.objects.link(ob)


def string_points(info):
    """Where the bulbs hang, in the order a hand would string them: up the gable and down it, then over the porch."""
    pts = []
    for (edges, n) in ((info["gable"], GABLE_BULBS), (info["porch"], PORCH_BULBS)):
        a, b, c = edges
        for k in range(n):
            pts.append(a.lerp(b, (k + 0.5) / n))
        for k in range(n):
            pts.append(b.lerp(c, (k + 0.5) / n))
    # each hangs a little below the board, and the wire sags between them
    return [p + Vector((0, 0, -0.05 - 0.03 * (i % 2))) for i, p in enumerate(pts)]


def garden(look, rnd):
    """Everything round the house: the snow, a fence with its gate open, firs, shrubs under the windows, a street lamp, a snowman, the neighbours."""
    layer("table")
    snow = winter.snow_material("ground_snow")
    ground = mesh_obj("ground", [(-90, -40, 0), (90, -40, 0), (90, 120, 0), (-90, 120, 0)], [(0, 1, 2, 3)], snow, False)
    mod = ground.modifiers.new("sub", "SUBSURF")
    mod.subdivision_type = "SIMPLE"
    mod.levels = mod.render_levels = 7
    kit.displace(ground, 0.22, 2.2)
    # the fence along the road, the gate standing open
    paint = plain("fence_paint", "#f2ece0", 0.6)
    fsnow = winter.snow_material("fence_snow")
    for k in range(-52, 53):
        x = k * 0.3
        if abs(x) < 1.7:
            continue
        p = box("picket%d" % k, (0.11, 0.05, 0.95 + 0.04 * (k % 3)), paint, 0.0)
        place(p, (x, -10.0, 0))
    for s in (-1, 1):
        rail = box("rail%d" % s, (14.0, 0.06, 0.08), paint, 0.6)
        place(rail, (s * 8.7, -9.96, 0))
        cap = box("railsnow%d" % s, (14.0, 0.14, 0.07), fsnow, 0.97, 0.03, 2)
        place(cap, (s * 8.7, -10.0, 0))
        post = box("gatepost%d" % s, (0.22, 0.22, 1.35), paint, 0.0, 0.02, 1)
        place(post, (s * 1.75, -10.0, 0))
        knob = sphere("gateknob%d" % s, 0.17, fsnow, 14, 8)
        place(knob, (s * 1.75, -10.0, 1.42))
    # firs: two by the house, a wood of them behind
    for k, (fx, fy, fh, lit_) in enumerate(((-4.6, 1.0, 5.2, False), (4.8, 2.0, 6.0, False), (-8.5, 6.0, 8.0, False), (9.5, 7.5, 9.0, False), (-13.0, -3.0, 4.6, False), (13.5, -1.5, 5.0, False),
                                             (-18.0, 12.0, 10.0, False), (17.0, 14.0, 11.0, False), (-3.0, 16.0, 11.0, False), (4.0, 18.0, 12.0, False), (-24.0, 4.0, 7.0, False), (25.0, 6.0, 8.0, False))):
        winter.snowy_fir("fir%d" % k, fx, fy, fh, rnd, lit_)
    # shrubs under the ground-floor windows, rounded with snow
    leaf = plain("shrub", "#1c3a26", 0.8)
    for k, (sx, sr) in enumerate(((-1.75, 0.55), (-2.3, 0.4), (1.75, 0.55), (2.35, 0.42))):
        b = sphere("shrub%d" % k, sr, leaf, 20, 12, 0.8)
        kit.displace(b, 0.1, 0.4)
        place(b, (sx, -0.65, sr * 0.6))
        c = sphere("shrubsnow%d" % k, sr * 0.92, snow, 20, 12, 0.5)
        kit.displace(c, 0.06, 0.5)
        place(c, (sx, -0.65, sr * 1.05))
    # a street lamp by the gate, always lit
    iron = plain("iron", "#16161a", 0.4, 0.7)
    tube("lamp_post", [Vector((-3.4, -8.6, 0)), Vector((-3.4, -8.6, 3.3))], 0.07, 10, iron)
    cage = sphere("lamp_glass", 0.2, emissive("lamp_glow", "#ffcf88", 9.0), 16, 8)
    place(cage, (-3.4, -8.6, 3.5))
    hood = kit.lathe("lamp_hood", [(0.0, 0.3), (0.2, 0.22), (0.3, 0.14), (0.3, 0.12), (0.0, 0.12)], 16, iron)
    place(hood, (-3.4, -8.6, 3.55))
    persp.point("lamp_light", (-3.4, -8.75, 3.35), 900.0, (1.0, 0.72, 0.42), 0.12)
    # a snowman keeping watch, and a far neighbour with a light on
    winter.snowman("snowman", 4.2, -5.4)
    _, far_lit, _ = cottage("neighbour", (-21.0, 9.0, 0.0), ("#3a3f4e", "#d9d4c8", "#4a2a22", "#2a2a30"), 6.0, 3.2, 2.6, 7.0, porch=False)
    cottage("neighbour2", (23.0, 12.0, 0.0), ("#5a4a3a", "#d9d4c8", "#2a3a4a", "#2a2a30"), 6.5, 3.0, 2.8, 7.0, porch=False)
    del far_lit


def board():
    """A board on two posts in the garden, for the words that come on in lights."""
    layer("table")
    rim = wood("board_wood", "#5a3a22", "#2e1c10", 0.25, 0.7)
    bw, bh, z0 = 2.0, 0.62, 0.5
    y = -12.6
    b = box("board", (bw, 0.07, bh), plain("board_face", "#1c1612", 0.9), z0, 0.01, 1)
    place(b, (0, y, 0))
    for (sx, sz, w, h) in ((0, z0 + bh, bw + 0.14, 0.09), (0, z0 - 0.09, bw + 0.14, 0.09), (-bw / 2 - 0.03, z0, 0.09, bh), (bw / 2 + 0.03, z0, 0.09, bh)):
        e = box("board_rim%d" % int(sx * 10 + sz * 100), (w, 0.1, h), rim, sz)
        place(e, (sx, y - 0.01, 0))
    for s in (-1, 1):
        tube("board_post%d" % s, [Vector((s * (bw / 2 - 0.3), y + 0.06, 0)), Vector((s * (bw / 2 - 0.3), y + 0.06, z0))], 0.06, 8, rim)
    cap = box("board_snow", (bw + 0.2, 0.2, 0.08), winter.snow_material("board_snow"), z0 + bh + 0.09, 0.035, 2)
    place(cap, (0, y, 0))
    persp.anchor("boardTopLeft", Vector((-bw / 2 + 0.08, y - 0.04, z0 + bh - 0.06)))
    persp.anchor("boardBottomRight", Vector((bw / 2 - 0.08, y - 0.04, z0 + 0.06)))
    return Vector((0, y - 0.5, z0 + bh / 2))


OPT = kit.cli()
CAM_AT = (0.0, -27.0, 2.3)
LOOK_AT = (0.0, 0.0, 4.15)


def build(look):
    reset()
    kit.MANIFEST["bulbs"] = []
    rnd = random.Random(8)
    persp.setup(CAM_AT, LOOK_AT, lens=35.0, ppk=10.0, samples=OPT["samples"] or 220, preview=OPT["preview"], exposure=0.9)
    persp.world_night("#060a1c", "#1c2a52", 0.5, stars=2.2)
    layer("lights")
    moon = bpy.data.lights.new("moon", "SUN")
    moon.energy = 0.42
    moon.color = (0.62, 0.74, 1.0)
    moon.angle = math.radians(2.5)
    mo = bpy.data.objects.new("moon", moon)
    kit.link(mo)
    mo.rotation_euler = (math.radians(52), 0, math.radians(-38))
    garden(look, rnd)
    layer("table")
    _, lit, info = cottage("house", (0.0, 0.0, 0.0), LOOKS[look])
    move(lit, "lit")
    centre = board()
    # the lights being on: the windows' glow out onto the snow, the string, the board
    layer("lit")
    for (wx, wy, wz) in info["windows"]:
        persp.area("spill%d" % int(wx * 10 + wz * 100), (wx, wy - 0.25, wz), (wx, wy - 4.0, wz - 1.6), 240.0, 1.0, (1.0, 0.7, 0.4))
    persp.area("board_glow", centre, centre + Vector((0, -3.0, -1.2)), 90.0, 1.8, (1.0, 0.8, 0.5))
    wire = plain("wire", "#101410", 0.6)
    pts = string_points(info)
    # two lengths of wire: one along the gable, one over the porch
    cut = 2 * GABLE_BULBS
    tube("string_wire", [p + Vector((0, 0, 0.07)) for p in pts[:cut]], 0.012, 5, wire, cap=False)
    tube("porch_wire", [p + Vector((0, 0, 0.07)) for p in pts[cut:]], 0.012, 5, wire, cap=False)
    mats = [emissive("bulb%d" % k, c, 38.0) for k, c in enumerate(BULB_COLORS)]
    for i, p in enumerate(pts):
        b = sphere("bulb_%d" % i, 0.062, mats[i % len(mats)], 12, 8, 1.35)
        place(b, p)
        if i % 3 == 0:
            c = kit.lin(BULB_COLORS[i % len(BULB_COLORS)])
            persp.point("bulb_light%d" % i, p + Vector((0, -0.12, 0)), 9.0, (c[0], c[1], c[2]), 0.05, shadow=False)
    kit.MANIFEST["bulbs"] = [list(persp.on_stage(p)) for p in pts]
    glow(1.6, 7)


def main():
    out = OPT["out"]
    looks = OPT["look"] or list(LOOKS)
    only = OPT["only"] or ["dark", "lit"]
    for look in looks:
        build(look)
        if "dark" in only:
            persp.render(os.path.join(out, "plate-%s-dark-wide.png" % look), hide=("lit",))
        if "lit" in only:
            persp.render(os.path.join(out, "plate-%s-lit-wide.png" % look))
    persp.save(os.path.join(out, "manifest.json"), persp=True)


main()
