"""
Frosted Window's room: a window at night on Christmas Eve, seen straight on from inside, frost over the
glass, a snowy street outside, candles and a fir garland on the sill.

    blender --background --factory-startup --python frosted_window.py -- --out <dir> [--preview] [--look cottage] [--only beauty]

It is made in two passes. First the street outside is built in 3D and rendered through a real
(perspective) lens, as if from the room: snow on the ground, houses across the road with their
windows lit, fir trees, a snowman holding a little blackboard. That picture is then hung, glowing,
behind the window of the room, which is built and rendered like the other gifts' tables but with the
camera looking straight at the wall. Per look it makes the plate (the window clear), the frost (the
glass alone, frosted over: the gift wipes it away with a finger) for phones and wide screens, and the
room out of focus for the note; once, the note's paper and a ribbon for the photos.
"""

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402
from mathutils import noise as mnoise  # noqa: E402
from bpy_extras.object_utils import world_to_camera_view  # noqa: E402

import kit  # noqa: E402

# Straight on: no tilt, so the wall is the picture plane and a stage unit is K across and up it.
kit.TILT = 0.0
kit.COS_T, kit.SIN_T = 1.0, 0.0

from kit import (TAU, anchor, at, box, catcher, cloth, emissive, glow, lathe, layer, lights, mesh_obj, parent, place, plain,  # noqa: E402
                 render_plate, render_sprite, reset, save_manifest, setup, sphere, tube, wood)
import props  # noqa: E402
import props_desk as desk  # noqa: E402

# The window's glass, in stage units from the stage's middle (x right, y up).
GLASS_L, GLASS_R, GLASS_T, GLASS_B = -35.0, 35.0, 66.0, -26.0
FRAME = 3.2          # the painted frame round the glass, stage units
SILL_Y = GLASS_B - FRAME
OUTSIDE_PX = (1000, 1314)   # the street's picture: the glass's shape, with a little over

LOOKS = {
    "cottage": dict(wall="#efe2cc", wall_dark="#d9c7a8", frame="#f6f1e6", sill=("#b98a58", "#7a5430"), curtain=("#a8322a", "#6a1a16"), candle="#fbf1de"),
    "cabin": dict(wall=None, wall_dark=None, frame="#5a3a22", sill=("#8a5a32", "#4a2e18"), curtain=("#2f5a3a", "#1a3a22"), candle="#fbf1de"),
    "midnight": dict(wall="#2a3448", wall_dark="#1a2232", frame="#e9e4da", sill=("#c9b08a", "#8a7050"), curtain=("#c9b48a", "#8a7a5a"), candle="#fff6e8"),
}


# ------------------------------------------------------------------------------------------ the street

def snow_material(name="snow"):
    m = kit.Mat(name)
    obj = m.coords("Object")
    n, _ = m.noise(obj, 1.2, 4.0, 0.6)
    sparkle, _ = m.noise(obj, 220.0, 1.0, 0.5)
    m.set(base=m.ramp(n, [(0.3, "#c9d4e4"), (0.7, "#edf2f9")]), rough=0.55, sss=0.35, sss_scale=0.08, spec=0.6,
          coat=m.math("GREATER_THAN", sparkle, 0.78), coat_rough=0.05, normal=m.bump(n, 0.25, 0.05))
    return m.mat


def house(name, x, y, w, d, h, wall_color, roof_color, rnd, lights_on=True):
    """A house across the road: walls, a steep roof deep in snow, windows lit warm, a string of coloured bulbs along the eaves."""
    parts = []
    walls = wood(name + "_boards", wall_color, kit_darken(wall_color), 0.35, 0.7, along="X")
    parts.append(box(name, (w, d, h), walls, 0.0, 0.02, 1))
    ridge = h + w * 0.45
    roof = mesh_obj(name + "_roof", [(-w / 2 - 0.35, -d / 2 - 0.35, h - 0.05), (w / 2 + 0.35, -d / 2 - 0.35, h - 0.05), (0, -d / 2 - 0.35, ridge), (-w / 2 - 0.35, d / 2 + 0.35, h - 0.05), (w / 2 + 0.35, d / 2 + 0.35, h - 0.05), (0, d / 2 + 0.35, ridge)],
                    [(0, 1, 2), (3, 5, 4), (0, 3, 4, 1), (1, 4, 5, 2), (0, 2, 5, 3)], snow_material(name + "_snowroof"), False)
    parts.append(roof)
    glow_mat = emissive(name + "_window", "#ffb860", 9.0)
    frame_mat = plain(name + "_trim", "#f2ece0", 0.6)
    cols = max(2, int(w / 1.6))
    for k in range(cols):
        wx = -w / 2 + w * (k + 0.5) / cols
        for row, wz in enumerate((h * 0.3, h * 0.72)):
            if rnd.random() < (0.85 if lights_on else 0.3):
                win = box("%s_win%d_%d" % (name, k, row), (0.62, 0.05, 0.82), glow_mat, wz - 0.41)
                place(win, (wx, -d / 2 - 0.01, 0))
                parts.append(win)
                trim = box("%s_trim%d_%d" % (name, k, row), (0.74, 0.04, 0.94), frame_mat, wz - 0.47)
                place(trim, (wx, -d / 2 + 0.005, 0))
                parts.append(trim)
                lamp = bpy.data.lights.new("%s_lamp%d_%d" % (name, k, row), "AREA")
                lamp.energy = 25.0
                lamp.size = 0.6
                lamp.color = (1.0, 0.7, 0.4)
                lo = bpy.data.objects.new(lamp.name, lamp)
                kit.link(lo)
                lo.location = (x + wx, y - d / 2 - 0.3, wz)
                lo.rotation_euler = (math.radians(90), 0, 0)
    door = box(name + "_door", (0.9, 0.06, 1.9), plain(name + "_doorpaint", "#7a1e1a", 0.5), 0.0)
    place(door, (w * 0.2, -d / 2 - 0.02, 0))
    parts.append(door)
    # bulbs along the eaves
    colors = ["#ff4a3a", "#ffd24a", "#4ad27a", "#4a9aff", "#ff9a3a"]
    n = int(w / 0.32)
    for k in range(n + 1):
        bx = -w / 2 - 0.3 + (w + 0.6) * k / n
        b = sphere("%s_bulb%d" % (name, k), 0.07, emissive("%s_bulbmat%d" % (name, k % 5), colors[k % 5], 30.0), 10, 6)
        place(b, (bx, -d / 2 - 0.4, h - 0.12 - 0.08 * math.sin(math.pi * (k % 6) / 6)))
        parts.append(b)
    parent(parts, name + "_pivot", (x, y, 0))


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


def street(path):
    """The street through the window, rendered through a lens. Writes the picture and returns where the snowman's board is in it (shares of its width and height, from the top left)."""
    reset()
    rnd = random.Random(12)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "OPTIX"
        prefs.get_devices()
        for d in prefs.devices:
            d.use = d.type == "OPTIX"
        sc.cycles.device = "GPU"
    except Exception:
        pass
    sc.cycles.samples = 48 if OPT["preview"] else 256
    sc.cycles.use_denoising = True
    sc.view_settings.view_transform = "Filmic"
    try:
        sc.view_settings.look = "Medium High Contrast"
    except Exception:
        pass
    sc.view_settings.exposure = 0.15
    sc.render.film_transparent = False
    scale = 0.5 if OPT["preview"] else 1.0
    sc.render.resolution_x, sc.render.resolution_y = int(OUTSIDE_PX[0] * scale), int(OUTSIDE_PX[1] * scale)
    layer("street")
    # the night: a deep blue sky, a few stars, moonlight
    w = bpy.data.worlds.new("night")
    w.use_nodes = True
    nt = w.node_tree
    bg = nt.nodes["Background"]
    sky = nt.nodes.new("ShaderNodeTexGradient")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Rotation"].default_value = (0, math.radians(-90), 0)
    nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"])
    nt.links.new(mp.outputs[0], sky.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = kit.lin("#2a3a5c")
    ramp.color_ramp.elements[1].color = kit.lin("#070b18")
    nt.links.new(sky.outputs["Fac"], ramp.inputs["Fac"])
    stars = nt.nodes.new("ShaderNodeTexNoise")
    stars.inputs["Scale"].default_value = 900.0
    thr = nt.nodes.new("ShaderNodeMath")
    thr.operation = "GREATER_THAN"
    thr.inputs[1].default_value = 0.74
    nt.links.new(stars.outputs["Fac"], thr.inputs[0])
    add = nt.nodes.new("ShaderNodeMixRGB")
    add.blend_type = "ADD"
    nt.links.new(thr.outputs[0], add.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], add.inputs["Color1"])
    add.inputs["Color2"].default_value = (2.0, 2.0, 2.2, 1.0)
    nt.links.new(add.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 0.6
    sc.world = w
    moon = bpy.data.lights.new("moon", "SUN")
    moon.energy = 0.35
    moon.color = (0.7, 0.8, 1.0)
    moon.angle = math.radians(3)
    mo = bpy.data.objects.new("moon", moon)
    kit.link(mo)
    mo.rotation_euler = (math.radians(55), 0, math.radians(30))
    # the ground: the yard, the road, the far side
    ground = mesh_obj("ground", [(-80, -20, 0), (80, -20, 0), (80, 120, 0), (-80, 120, 0)], [(0, 1, 2, 3)], snow_material("ground_snow"), False)
    g = ground
    mod = g.modifiers.new("sub", "SUBSURF")
    mod.subdivision_type = "SIMPLE"
    mod.levels = mod.render_levels = 6
    kit.displace(g, 0.25, 2.5)
    road = box("road", (80, 3.2, 0.02), plain("road_snow", "#c9d2de", 0.6), 0.03)
    place(road, (0, 15.5, 0))
    # houses across the road
    for k, (hx, w_, d_, h_, wall, roof) in enumerate(((-9.5, 6.0, 5.0, 4.2, "#7a2a22", "#ffffff"), (-1.5, 5.2, 5.0, 5.0, "#2f4a5a", "#ffffff"), (6.0, 6.4, 5.0, 4.4, "#d9c7a0", "#ffffff"), (13.5, 5.6, 5.0, 4.8, "#4a5a3a", "#ffffff"))):
        house("house%d" % k, hx, 22.0 + (k % 2) * 1.5, w_, d_, h_, wall, roof, rnd)
    # firs, one of them lit
    for k, (fx, fy, fh, lit) in enumerate(((-6.0, 12.0, 4.2, False), (4.2, 9.5, 3.4, True), (-13.0, 9.0, 5.0, False), (11.0, 13.0, 4.0, False), (-3.0, 30.0, 6.0, False), (18.0, 28.0, 6.5, False))):
        snowy_fir("fir%d" % k, fx, fy, fh, rnd, lit)
    # a picket fence along the front of the yard
    paint = plain("fence_paint", "#f2ece0", 0.6)
    for k in range(-30, 31):
        p = box("picket%d" % k, (0.12, 0.05, 0.9), paint, 0.0)
        place(p, (k * 0.32, 6.0, 0))
    rail = box("rail", (20.0, 0.06, 0.08), paint, 0.55)
    place(rail, (0, 6.03, 0))
    fence_snow = box("rail_snow", (20.0, 0.12, 0.06), snow_material("fence_snow"), 0.92)
    place(fence_snow, (0, 6.0, 0))
    # a lamp post
    post = tube("post", [Vector((-4.5, 8.0, 0)), Vector((-4.5, 8.0, 3.2))], 0.06, 10, plain("iron", "#1a1a1e", 0.4, 0.7))
    lamp_glass = sphere("lamp_glass", 0.22, emissive("lamp_glow", "#ffcf88", 30.0), 16, 8)
    place(lamp_glass, (-4.5, 8.0, 3.35))
    pl = bpy.data.lights.new("post_light", "POINT")
    pl.energy = 300.0
    pl.color = (1.0, 0.75, 0.45)
    plo = bpy.data.objects.new("post_light", pl)
    kit.link(plo)
    plo.location = (-4.5, 7.8, 3.2)
    # the snowman in the yard, holding his board up to the window
    corners = snowman("snowman", -1.0, 4.6)
    warm = bpy.data.lights.new("window_spill", "AREA")
    warm.energy = 80.0
    warm.size = 3.0
    warm.color = (1.0, 0.78, 0.5)
    wo = bpy.data.objects.new("window_spill", warm)
    kit.link(wo)
    wo.location = (0.5, -2.0, 1.8)
    wo.rotation_euler = (math.radians(80), 0, 0)
    # the lens: standing in the room, a little above the sill, looking out and slightly down
    cam_data = bpy.data.cameras.new("street_cam")
    cam_data.lens = 30.0
    cam_data.sensor_fit = "VERTICAL"
    cam = bpy.data.objects.new("street_cam", cam_data)
    kit.link(cam)
    cam.location = (0.0, -3.4, 1.75)
    cam.rotation_euler = (math.radians(84), 0, 0)
    sc.camera = cam
    sc.render.filepath = path
    sc.use_nodes = False
    bpy.ops.render.render(write_still=True)
    print("STREET", path)
    return [tuple(world_to_camera_view(sc, cam, c))[:2] for c in corners]


# ------------------------------------------------------------------------------------------ the room

def wall_material(look):
    L = LOOKS[look]
    if L["wall"] is None:
        return wood("log_wall", "#8a5a34", "#4a2e18", 0.9, 0.55, along="X")
    m = kit.Mat("plaster")
    obj = m.coords("Object")
    n, _ = m.noise(obj, 0.8, 5.0, 0.6)
    fine, _ = m.noise(obj, 9.0, 3.0, 0.6)
    m.set(base=m.ramp(n, [(0.2, L["wall_dark"]), (0.8, L["wall"])]), rough=0.9, normal=m.bump(m.math("ADD", n, fine), 0.06, 0.02))
    return m.mat


def room(look, street_png):
    L = LOOKS[look]
    layer("table")
    gl, gr, gt, gb = at(GLASS_L, 0).x, at(GLASS_R, 0).x, at(0, GLASS_T).y, at(0, GLASS_B).y
    f = FRAME * kit.K
    wall = wall_material(look)
    big = 30.0
    # the wall, in four pieces round the opening
    for (name, x0, x1, y0, y1) in (("wall_l", -big, gl - f, -big, big), ("wall_r", gr + f, big, -big, big), ("wall_t", gl - f, gr + f, gt + f, big), ("wall_b", gl - f, gr + f, -big, gb - f)):
        mesh_obj(name, [(x0, y0, 0), (x1, y0, 0), (x1, y1, 0), (x0, y1, 0)], [(0, 1, 2, 3)], wall, smooth=False)
    # the frame: four painted boards round the glass, standing a little proud of the wall, and the reveal behind
    paint = plain("frame_paint", L["frame"], 0.45, coat=0.2)
    for (name, cx, cy, w, h) in (("frame_l", gl - f / 2, (gt + gb) / 2, f, gt - gb + 2 * f), ("frame_r", gr + f / 2, (gt + gb) / 2, f, gt - gb + 2 * f), ("frame_t", (gl + gr) / 2, gt + f / 2, gr - gl + 2 * f, f), ("frame_b", (gl + gr) / 2, gb - f / 2, gr - gl + 2 * f, f)):
        b = box(name, (w, h, 0.22), paint, -0.12, 0.03, 2)
        place(b, (cx, cy, 0))
    for (name, cx, cy, w, h) in (("reveal_l", gl - 0.02, (gt + gb) / 2, 0.04, gt - gb), ("reveal_r", gr + 0.02, (gt + gb) / 2, 0.04, gt - gb), ("reveal_t", (gl + gr) / 2, gt + 0.02, gr - gl, 0.04)):
        b = box(name, (w, h, 0.9), paint, -0.9)
        place(b, (cx, cy, 0))
    # the sill: a deep board under the window, out into the room
    sill_mat = wood("sill_wood", L["sill"][0], L["sill"][1], 0.4, 0.4, along="X")
    sill_top = gb - f
    s = box("sill", (gr - gl + 2 * f + 1.6, 0.26, 1.5), sill_mat, -0.9, 0.04, 2)
    place(s, ((gl + gr) / 2, sill_top - 0.13, 0))
    s.rotation_euler = (0, 0, 0)
    # the street, glowing behind the glass
    img = bpy.data.images.load(street_png)
    m = kit.Mat("street")
    tex = m.node("ShaderNodeTexImage")
    tex.image = img
    tex.extension = "EXTEND"
    m.set(base=(0, 0, 0, 1), emit=tex.outputs["Color"], emit_strength=0.7, rough=1.0)
    bw, bh = gr - gl, gt - gb
    mesh_obj("street_plane", [(gl, gb, -5.0), (gr, gb, -5.0), (gr, gt, -5.0), (gl, gt, -5.0)], [(0, 1, 2, 3)], m.mat, smooth=False, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
    anchor("glassTopLeft", Vector((gl, gt, 0)))
    anchor("glassBottomRight", Vector((gr, gb, 0)))
    return (gl, gr, gt, gb, bw, bh, sill_top)


def curtains(look, gl, gr, gt, sill_top):
    """Heavy curtains drawn back either side, falling from above the window to below the sill in soft folds."""
    L = LOOKS[look]
    mat = cloth("curtain", L["curtain"][0], 28.0, 0.9, 0.9, None)
    for side, x_in in ((-1, gl - 0.5), (1, gr + 0.5)):
        nx, ny = 28, 40
        top, bottom = gt + 2.2, sill_top - 3.0
        verts = []
        for j in range(ny + 1):
            v = j / ny
            y = top + (bottom - top) * v
            # gathered in at the tie-back two-thirds down, spread above and below it
            gather = 1.0 - 0.45 * math.exp(-((v - 0.62) / 0.12) ** 2)
            width = 2.6 * gather
            for i in range(nx + 1):
                u = i / nx
                x = x_in + side * u * width
                z = 0.35 + 0.22 * math.sin(u * TAU * 3.5 + v * 0.5) * (0.6 + 0.4 * gather)
                verts.append((x, y, z))
        faces = [(j * (nx + 1) + i, j * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i) for j in range(ny) for i in range(nx)]
        c = mesh_obj("curtain_%d" % side, verts, faces, mat, True)
        kit.solidify(c, 0.03, 0.0)
        tie = tube("tie_%d" % side, [Vector((x_in + side * w * 1.4, top + (bottom - top) * 0.62, 0.62 + 0.05 * math.sin(w * 6))) for w in [i / 10 for i in range(11)]], 0.08, 10, plain("tie_gold", "#d9a441", 0.3, 0.8))
        del tie
    rod = tube("curtain_rod", [Vector((gl - 3.4, gt + 2.3, 0.45)), Vector((gr + 3.4, gt + 2.3, 0.45))], 0.08, 14, plain("rod_brass", "#c9a050", 0.3, 1.0))
    del rod


def upright(objs):
    """Things are modelled standing on a table (z up); on the sill they stand towards the top of the picture (y up), facing the room."""
    from mathutils import Matrix
    turn = Matrix.Rotation(math.radians(-90), 4, "X")
    for ob in objs:
        ob.matrix_basis = turn @ ob.matrix_basis
    return objs


def sill_dressing(look, gl, gr, gt, sill_top):
    L = LOOKS[look]
    rnd = random.Random(3)
    layer("props")
    # the garland: fir boughs along the top of the frame, lights through them, a few red berries
    needles = props.needle_material("garland_needles")
    stem = plain("garland_stem", "#4a3422", 0.8)
    for k in range(5):
        x = gl - 0.8 + (gr - gl + 1.6) * k / 4
        b = props.pine_branch("bough%d" % k, needles, stem, 3.4, 10 + k, 7, 0.22, 1.0)
        parent(b, "bough_pivot%d" % k, Vector((x - 1.6, gt + 0.45 + 0.12 * math.sin(k * 1.7), 0.2)), math.radians(rnd.uniform(-8, 8)))
    wire = plain("wire", "#1e2418", 0.6)
    bulb = emissive("bulb", "#ffd28a", 26.0)
    socket = plain("socket", "#2a3020", 0.5)
    pts = [Vector((gl - 1.0 + (gr - gl + 2.0) * k / 8, gt + 0.4 - 0.32 * math.sin(math.pi * (k % 2)), 0.42)) for k in range(9)]
    props.fairy_lights("garland_lights", pts, wire, bulb, socket, 0.9, 0.1, 31)
    berry = props.glass_paint("berry", "#b01620", 0.15)
    for k in range(6):
        parent(props.berries("berries%d" % k, berry, 3, 0.11, k + 3), "berry_pivot%d" % k, Vector((gl + (gr - gl) * (k + 0.5) / 6, gt + 0.25, 0.5)))
    # on the sill: candles in jars, a small fir in a pot, a mug, pinecones, a little present with a tag
    jar = desk.glass_material("jar_glass", "#fff4e0", 0.04)
    wax = plain("wax", L["candle"], 0.5, sss=0.5, sss_scale=0.2)
    flame = emissive("flame", "#ffb85a", 60.0)
    wick = plain("wick", "#1a1208", 0.9)
    for k, (x, h) in enumerate(((gl + 0.9, 1.0), (gl + 1.9, 0.7), (gr - 1.5, 0.85))):
        objs = [lathe("jar%d" % k, [(0.0, 0.0), (0.42, 0.0), (0.44, 0.04), (0.44, h), (0.41, h), (0.41, 0.04), (0.0, 0.04)], 32, jar),
                lathe("candle%d" % k, [(0.0, 0.04), (0.36, 0.04), (0.36, h * 0.55), (0.0, h * 0.56)], 32, wax),
                tube("wick%d" % k, [Vector((0, 0, h * 0.56)), Vector((0.01, 0, h * 0.62))], 0.012, 6, wick),
                lathe("flame%d" % k, [(0.0, h * 0.6), (0.05, h * 0.63), (0.07, h * 0.7), (0.05, h * 0.8), (0.0, h * 0.9)], 16, flame)]
        parent(upright(objs), "jar_pivot%d" % k, Vector((x, sill_top, 0.75)))
        kit.lamp("candle_light%d" % k, Vector((x, sill_top + h * 0.75, 0.8)), 6.0)
    pot = lathe("pot", [(0.0, 0.0), (0.42, 0.0), (0.55, 0.8), (0.58, 0.82), (0.0, 0.82)], 32, plain("terracotta", "#b8653a", 0.75))
    fir = []
    for k in range(5):
        t = k / 5
        r = 0.75 * (1 - t) + 0.12
        z0 = 0.95 + 1.6 * t
        sk = lathe("pot_fir%d" % k, [(0.0, z0 + 0.45), (r * 0.25, z0 + 0.3), (r, z0), (r * 0.9, z0 - 0.06), (0.0, z0 + 0.02)], 18, needles)
        kit.displace(sk, 0.06, 0.3)
        fir.append(sk)
    star = kit.prism("pot_star", kit.star_outline(5, 0.2, 0.09), 0.05, plain("star_gold", "#e8c06a", 0.25, 1.0))
    place(star, (0, 0.02, 2.75), rot=(math.radians(90), 0, 0))
    lights_ = []
    for q in range(16):
        t = q / 16
        a = q * 2.3
        rr = (0.75 * (1 - t * 0.9) + 0.1) * 0.9
        b = sphere("pot_light%d" % q, 0.045, emissive("pot_lightmat%d" % (q % 3), ["#ffd27a", "#ff6a5a", "#ffe8b0"][q % 3], 40.0), 8, 5)
        place(b, (rr * math.cos(a), rr * math.sin(a), 1.0 + 1.5 * t))
        lights_.append(b)
    parent(upright([pot] + fir + [star] + lights_), "potfir_pivot", Vector((gr - 2.9, sill_top, 0.7)))
    china = props.glass_paint("mug_glaze", "#f2ece0", 0.15)
    cocoa = plain("cocoa", "#4a2618", 0.1, coat=0.5)
    mug = props.mug("mug", china, cocoa, [plain("mallow", "#fffaf2", 0.7)], 0.5, 0.75, seed=5)
    for extra in mug[3:]:
        bpy.data.objects.remove(extra, do_unlink=True)
    parent(upright(mug[:3]), "mug_pivot", Vector((gl + 3.1, sill_top, 0.85)), 0.0)
    paper = kit.paper("gift_paper", "#b3302a", "stripes", "#f2ece0", 1.2)
    ribbon = kit.satin("gift_ribbon", "#e8c06a")
    body, rib = props.present("gift", 1.1, 0.9, 0.8, paper, ribbon, 0.16, True, 0.6)
    parent(upright([body] + rib), "gift_pivot", Vector((gl + 4.6, sill_top, 0.7)))
    cone_mat = plain("cone", "#6a4426", 0.8)
    for k, x in enumerate((gr - 0.7, gr - 1.0)):
        c = lathe("pinecone%d" % k, [(0.0, 0.0), (0.2, 0.05), (0.24, 0.25), (0.16, 0.48), (0.0, 0.56)], 12, cone_mat)
        kit.displace(c, 0.05, 6.0)
        parent(upright([c]), "cone_pivot%d" % k, Vector((x, sill_top, 0.55 + 0.3 * k)), 0.0)
    anchor("gift", Vector((gl + 4.6, sill_top + 0.45, 1.2)))
    stockings(look, sill_top)
    anchor("sill", Vector(((gl + gr) / 2, sill_top, 0.9)))


def frost(gl, gr, gt, gb):
    """Frost on the inside of the glass: feathery crystals growing in from the edges, thick in the corners, a thin bloom in the middle."""
    layer("frost")
    m = kit.Mat("frost")
    obj = m.coords("Object")
    x, y, z = m.sep(obj)
    cx, cy = (gl + gr) / 2, (gt + gb) / 2
    hx, hy = (gr - gl) / 2, (gt - gb) / 2
    ex = m.math("DIVIDE", m.math("ABSOLUTE", m.math("SUBTRACT", x, cx)), hx)
    ey = m.math("DIVIDE", m.math("ABSOLUTE", m.math("SUBTRACT", y, cy)), hy)
    edge = m.math("MAXIMUM", m.math("POWER", ex, 3.0), m.math("POWER", ey, 3.0))
    fern, _ = m.noise(obj, 9.0, 14.0, 0.72, 2.6)
    fine, _ = m.noise(obj, 40.0, 6.0, 0.65, 1.2)
    crystals = m.math("ADD", m.math("MULTIPLY", fern, 0.75), m.math("MULTIPLY", fine, 0.25))
    density = m.math("ADD", m.math("MULTIPLY", edge, 0.9), m.math("MULTIPLY", crystals, 0.7))
    alpha = m.ramp(density, [(0.36, "#bcbcbc"), (0.56, "#ffffff")])
    m.set(base=m.ramp(crystals, [(0.38, "#aebfd2"), (0.58, "#ffffff")]), rough=0.25, sss=0.3, sss_scale=0.04, spec=0.8, alpha=alpha, normal=m.bump(crystals, 1.0, 0.006))
    try:
        m.mat.blend_method = "BLEND"
    except Exception:
        pass
    mesh_obj("frost", [(gl, gb, -0.05), (gr, gb, -0.05), (gr, gt, -0.05), (gl, gt, -0.05)], [(0, 1, 2, 3)], m.mat, smooth=False)
    # behind the frost, the glass itself fogged: what is outside goes soft through it
    fog = kit.Mat("fogged_glass")
    fog.set(base="#ffffff", rough=0.35, trans=1.0, ior=1.45)
    mesh_obj("fogged_glass", [(gl, gb, -0.1), (gr, gb, -0.1), (gr, gt, -0.1), (gl, gt, -0.1)], [(0, 1, 2, 3)], fog.mat, smooth=False)


def stockings(look, sill_top):
    """Two stockings hung from the front of the sill on brass hooks, their white cuffs left blank for a name each."""
    knit = cloth("stocking_knit", "#b3241e", 34.0, 0.95, 0.9, "#7a1612", 0.18)
    fluff = cloth("cuff_fluff", "#fbf8f2", 60.0, 1.0, 1.0)
    brass = plain("hook_brass", "#c9a050", 0.3, 1.0)
    for side, x in ((-1, -1.7), (1, 1.7)):
        # its edge anticlockwise, the foot pointing away from the middle
        foot = [(-0.55, 0.0), (-0.55, -2.3), (0.0, -2.66), (1.2, -2.62), (1.45, -2.32), (1.3, -1.98), (0.55, -1.75), (0.55, 0.0)]
        outline = foot if side > 0 else [(-px, py) for (px, py) in reversed(foot)]
        body = kit.prism("stocking%d" % side, outline, 0.32, knit, 0.0, 0.12, 3)
        cuff = box("cuff%d" % side, (1.36, 0.62, 0.46), fluff, -0.07, 0.16, 3)
        place(cuff, (0.0, -0.31, 0.0))
        cuff.rotation_euler = (math.radians(90), 0, 0)
        cuff.location = (0.0, -0.31, 0.16)
        loop = tube("loop%d" % side, [Vector((0.42 + 0.12 * math.cos(a), 0.12 + 0.16 * math.sin(a), 0.2)) for a in [TAU * i / 16 for i in range(17)]], 0.025, 6, fluff)
        hook = tube("hook%d" % side, [Vector((0.42, 0.24, 0.2)), Vector((0.42, 0.42, 0.2)), Vector((0.42, 0.48, 0.0))], 0.035, 8, brass)
        top = Vector((x, sill_top - 0.3, 0.62))
        parent([body, cuff, loop, hook], "stocking_pivot%d" % side, top, math.radians(-3 * side))
        anchor("cuffLeft" if side < 0 else "cuffRight", top + Vector((0.0, -0.31, 0.4)))


NOTE = ("sheet", "catch_sheet", "ribbon")


def stationery():
    """The note's things, on a place of their own in front of the wall: the letter's paper and a short length of red velvet ribbon for the photos."""
    layer("sheet")
    top = Vector((0, 6.0, 3.0))
    parent(desk.letter_sheet("sheet", desk.letter_paper("sheet_paper", "#fcf7ec", "#f2e8d2"), 7.6, 12.0, kit.gold("sheet_line", "#e0a860", 0.3)), "sheet_pivot", top)
    catcher(3.0, 9.0, "catch_sheet", (top.x, top.y - 6.0))
    layer("ribbon")
    vel = cloth("velvet", "#a8221e", 60.0, 0.6, 1.0)
    path = [Vector((-1.4 + 2.8 * i / 16, 0.05 * math.sin(i * 0.8), 3.0)) for i in range(17)]
    r = tube("ribbon", path, 0.05, 4, vel, flat=6.0)
    place(r, (0, -4.0, 0))


WIDE = (160.0, 240.0, 10.0)
PHONE = (100.0, 240.0, 12.0)
OPT = kit.cli()


def build(look, street_png, view=WIDE, with_frost=False):
    reset()
    kit.MANIFEST["bulbs"] = []
    setup(view[0], view[1], view[2], OPT["samples"] or 220, OPT["preview"], exposure=0.55)
    key = lights(key=1100.0, world=0.06, hdri="studio.exr", key_color=(1.0, 0.86, 0.7))
    key.location = Vector((-8.0, 6.0, 20.0))
    key.rotation_euler = (Vector((0, 0, 0)) - key.location).to_track_quat("-Z", "Y").to_euler()
    gl, gr, gt, gb, bw, bh, sill_top = room(look, street_png)
    curtains(look, gl, gr, gt, sill_top)
    sill_dressing(look, gl, gr, gt, sill_top)
    if with_frost:
        frost(gl, gr, gt, gb)
    stationery()
    catcher(-50.0, 1.0, "catch")
    glow(1.4, 7)
    return gl, gr, gt, gb


def main():
    out = OPT["out"]
    looks = OPT["look"] or list(LOOKS)
    only = OPT["only"] or ["street", "plates", "soft", "note"]
    street_png = os.path.join(out, "street.png")
    if "street" in only or not os.path.exists(street_png):
        board = street(street_png)
        kit.MANIFEST["board"] = [[round(u, 4), round(1.0 - v, 4)] for (u, v) in board]
    for look in looks:
        if "beauty" in only:
            build(look, street_png, WIDE, with_frost=True)
            render_plate(os.path.join(out, "beauty-%s.png" % look), hide=("catch",) + NOTE)
        if "plates" in only:
            for (tag_, view) in (("wide", WIDE), ("phone", PHONE)):
                build(look, street_png, view)
                render_plate(os.path.join(out, "plate-%s-%s.png" % (look, tag_)), hide=("catch",) + NOTE)
            # the frost, the glass alone: what the finger wipes away
            build(look, street_png, WIDE, with_frost=True)
            render_sprite("frost-%s" % look, os.path.join(out, "frost-%s.png" % look), ["table", "props", "frost"], catch=(), pad=(0, 0, 0, 0), density=1.2, bounds_of=["frost"])
        if "soft" in only:
            for (tag_, view) in (("wide", WIDE), ("phone", PHONE)):
                build(look, street_png, view)
                kit.render_soft(os.path.join(out, "soft-%s-%s.png" % (look, tag_)), hide=("catch",) + NOTE, lift=20.0)
    if "note" in only:
        build(looks[0], street_png, WIDE)
        render_sprite("sheet", os.path.join(out, "sheet.png"), ["sheet"], catch=("catch_sheet",), pad=(1.5, 1.5, 3.0, 3.0), density=1.3)
        render_sprite("ribbon", os.path.join(out, "ribbon.png"), ["ribbon"], catch=(), pad=(0.5, 0.5, 0.5, 0.5), density=1.6)
    kit.MANIFEST["sheets"] = {"letter": {"sprite": "sheet", "top": 0.12, "mid": 0.5, "bottom": 0.1, "gain": 1.05}}
    save_manifest(os.path.join(out, "manifest.json"))


main()
