"""
The pages' art (lilies, loose petals, a phone lying among flowers), made by the same means as the
holiday gifts' (../holiday/kit.py: Blender 4.0, Cycles, a camera that looks down and leans 20 degrees
towards the viewer), but for a page, not a stage: each piece is a picture by itself on nothing, that
a page lays on its cream ground wherever it likes.

A piece is rendered twice from the one camera:

    <id>.png          the thing itself, lit as it would be lying on the page's cream (#f1e3d3) ground
    <id>-shadow.png   only the shadow it throws on that ground, as alpha

and pack.mjs puts the two together, the shadow in a warm brown. Keeping the shadow apart is what
lets its faint outer breath (which shows as a box on a pale page) be taken off without touching
the thing's own soft edges. A piece with an empty place in it (a phone's screen, a polaroid's
photo) also says, in <id>.json, where that place's four corners fell in the picture.

Everything here is in Blender units (ten of the holiday kit's stage units).
"""

import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "holiday"))

import kit  # noqa: E402
from kit import COS_T, SIN_T, K  # noqa: E402

GROUND = "#f1e3d3"
UP = Vector((0.0, COS_T, SIN_T))

# One light for every piece, so two of them side by side on a page were lit by the same window.
LIGHT = dict(key=3500.0, world=0.28, fill=320.0, exposure=0.9, contrast="Medium High Contrast", at=(-10.5, 9.0, 21.0), shadow_at=(-6.2, 5.3, 23.5))


def cli():
    """The holiday kit's arguments, and --colour NAME[,NAME] for the flowers' colourway."""
    opt = kit.cli()
    a = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    opt["colour"] = a[a.index("--colour") + 1].split(",") if "--colour" in a else ["ivory"]
    return opt


def begin():
    kit.reset()
    kit.layer("things")


def ground(hole=None):
    """
    The page the piece lies on: seen by the light (it warms the undersides), never by the camera.
    `hole` (x, y, radius) leaves an opening in it, for a flower whose throat dips below the page: the
    light must still reach down into it.
    """
    kit.layer("ground")
    s = 120.0
    n = 48
    hx, hy, hr = hole or (0.0, 0.0, 0.0)
    verts = [(s * math.cos(math.tau * i / n), s * math.sin(math.tau * i / n), 0.0) for i in range(n)]
    if hole:
        verts += [(hx + hr * math.cos(math.tau * i / n), hy + hr * math.sin(math.tau * i / n), 0.0) for i in range(n)]
        faces = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    else:
        faces = [tuple(range(n))]
    ob = kit.mesh_obj("ground", verts, faces, kit.plain("ground_mat", GROUND, 0.9), smooth=False)
    ob.visible_camera = False
    kit.layer("things")
    return ob


def rig(opt):
    """The key from the top left, a warm fill from the bottom right that casts nothing, and a studio's sky warmed to match."""
    look = dict(LIGHT)
    key = kit.lights(key=look["key"], world=look["world"], hdri="studio.exr", key_color=(1.0, 0.935, 0.83), size=14.0, fill=0.0)
    # higher than the gifts' key: a page's decoration wants its shadow short and close under it
    key.location = Vector(look["at"])
    key.rotation_euler = (Vector((0, 0, 0)) - key.location).to_track_quat("-Z", "Y").to_euler()
    coll = bpy.data.collections["lights"]
    fd = bpy.data.lights.new("fill", "AREA")
    fd.shape = "DISK"
    fd.size = 24.0
    fd.energy = look["fill"]
    fd.color = (1.0, 0.86, 0.7)
    fo = bpy.data.objects.new("fill", fd)
    coll.objects.link(fo)
    fo.location = Vector((13.0, -15.0, 13.0))
    fo.rotation_euler = (Vector((0, 0, 0)) - fo.location).to_track_quat("-Z", "Y").to_euler()
    fd.cycles.cast_shadow = False
    w = bpy.context.scene.world
    nt = w.node_tree
    bg = nt.nodes["Background"]
    if bg.inputs["Color"].links:
        src = bg.inputs["Color"].links[0].from_socket
        mix = nt.nodes.new("ShaderNodeMixRGB")
        mix.blend_type = "MULTIPLY"
        mix.inputs["Fac"].default_value = 1.0
        nt.links.new(src, mix.inputs["Color1"])
        mix.inputs["Color2"].default_value = (1.0, 0.82, 0.62, 1.0)
        nt.links.new(mix.outputs[0], bg.inputs["Color"])


def verts_world(objs):
    """Every vertex of these things as they will be rendered (modifiers and all), in the world."""
    dg = bpy.context.evaluated_depsgraph_get()
    out = []
    for ob in objs:
        if ob.type != "MESH":
            continue
        ev = ob.evaluated_get(dg)
        me = ev.to_mesh()
        n = len(me.vertices)
        if n:
            co = np.empty(n * 3, dtype=np.float64)
            me.vertices.foreach_get("co", co)
            co = co.reshape(n, 3)
            m = np.array(ev.matrix_world)
            out.append(co @ m[:3, :3].T + m[:3, 3])
        ev.to_mesh_clear()
    return np.concatenate(out) if out else np.zeros((0, 3))


def settle(root, objs, lift=0.0):
    """Lowers (or raises) a posed thing till its lowest point rests on the ground."""
    bpy.context.view_layer.update()
    v = verts_world(objs)
    root.location.z += lift - float(v[:, 2].min())
    bpy.context.view_layer.update()


def screen_bounds(objs):
    v = verts_world(objs)
    sx = v[:, 0]
    sy = v[:, 1] * COS_T + v[:, 2] * SIN_T
    return float(sx.min()), float(sy.min()), float(sx.max()), float(sy.max())


class Shot:
    """The camera's frame for one piece: where a point of the world falls in the picture."""

    def __init__(self, cx, cy, vw, vh, pw, ph):
        self.cx, self.cy, self.vw, self.vh, self.pw, self.ph = cx, cy, vw, vh, pw, ph
        self.ppu = pw / vw

    def px(self, p):
        p = Vector(p)
        sx, sy = p.x, p.y * COS_T + p.z * SIN_T
        return [round((sx - self.cx + self.vw / 2.0) * self.ppu, 3), round((self.vh / 2.0 - (sy - self.cy)) * self.ppu, 3)]


def frame(objs, px_long, pad=(0.5, 0.5, 1.4, 1.4), opt=None, samples=220):
    """Points the camera at these things with room round them (left, top, right, bottom) for their shadow."""
    opt = opt or {}
    bpy.context.view_layer.update()
    x0, y0, x1, y1 = screen_bounds(objs)
    scale = 0.5 if opt.get("preview") else 1.0
    # `px_long` is the thing's own longer side; pack.mjs brings thing and shadow together down to it
    ppu = px_long * scale / max(x1 - x0, y1 - y0)
    x0, y1, x1, y0 = x0 - pad[0], y1 + pad[1], x1 + pad[2], y0 - pad[3]
    vw, vh = x1 - x0, y1 - y0
    pw, ph = int(math.ceil(vw * ppu)), int(math.ceil(vh * ppu))
    vw, vh = pw / ppu, ph / ppu
    for ob in [o for o in bpy.data.objects if o.type == "CAMERA"]:
        bpy.data.objects.remove(ob, do_unlink=True)
    look = LIGHT
    cam = kit.setup(vw / K, vh / K, ppu * K, opt.get("samples") or samples, False, exposure=opt.get("exposure") if opt.get("exposure") is not None else look["exposure"],
                    view=opt.get("view") or "Filmic", contrast=opt.get("contrast") or look["contrast"])
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = pw, ph
    if opt.get("preview"):
        sc.cycles.samples = 64
        sc.cycles.adaptive_threshold = 0.03
    cam.data.ortho_scale = max(vw, vh)
    cx, cy = (x0 + x1) / 2.0, (y0 + y1) / 2.0
    cam.location = cam.location + Vector((cx, 0.0, 0.0)) + UP * cy
    return Shot(cx, cy, vw, vh, pw, ph)


def _render(path, transparent=True):
    sc = bpy.context.scene
    sc.render.film_transparent = transparent
    sc.render.use_border = False
    sc.render.use_compositing = False
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("SAVED", path)


def shoot(pid, out, objs, ground_ob, shot, meta=None, extra=None, shadow_samples=160):
    """
    The piece and then its shadow. `extra` is a list of (suffix, visible objects, before, after): further
    pictures from the same camera with only those objects seen (a phone's bezel, say); `before` and
    `after` are called round the render, to swap a material in and back.
    """
    sc = bpy.context.scene
    every = [o for o in bpy.data.objects if o.type == "MESH" and o is not ground_ob]
    ground_ob.visible_camera = False
    ground_ob.is_shadow_catcher = False
    _render(os.path.join(out, pid + ".png"))
    for (suffix, seen, before, after) in (extra or []):
        keep = {o.name: o.visible_camera for o in every}
        for o in every:
            o.visible_camera = o in seen
        if before:
            before()
        _render(os.path.join(out, "%s-%s.png" % (pid, suffix)))
        if after:
            after()
        for o in every:
            o.visible_camera = keep[o.name]
    keep = {o.name: o.visible_camera for o in every}
    for o in every:
        o.visible_camera = False
    ground_ob.visible_camera = True
    ground_ob.is_shadow_catcher = True
    samples = sc.cycles.samples
    sc.cycles.samples = min(samples, shadow_samples)
    # The shadow alone is thrown from higher up than the light the thing is seen by: on a page a
    # decoration's shadow wants to stay short and under it, however tall the thing is.
    key = bpy.data.objects["key"]
    was = (key.location.copy(), key.rotation_euler.copy())
    key.location = Vector(LIGHT["shadow_at"])
    key.rotation_euler = (Vector((0, 0, 0)) - key.location).to_track_quat("-Z", "Y").to_euler()
    _render(os.path.join(out, pid + "-shadow.png"))
    key.location, key.rotation_euler = was
    sc.cycles.samples = samples
    ground_ob.is_shadow_catcher = False
    ground_ob.visible_camera = False
    for o in every:
        o.visible_camera = keep[o.name]
    info = {"id": pid, "w": shot.pw, "h": shot.ph, "ppu": round(shot.ppu, 4), "layers": [e[0] for e in (extra or [])]}
    info.update(meta or {})
    with open(os.path.join(out, pid + ".json"), "w") as f:
        json.dump(info, f, indent=1)
    print("PIECE", pid, shot.pw, shot.ph)


def area(shot, corners, box, radius_units, width_units):
    """
    An empty flat place in the picture (a screen, a photo), from its four corners in the world, given
    top left, top right, bottom right, bottom left. `box` is the size of the thing a page will lay
    into it; the camera has no perspective, so one matrix() takes that box exactly onto the place.
    """
    tl, tr, br, bl = [shot.px(c) for c in corners]
    return {"corners": [tl, tr, br, bl], "box": list(box), "radius": round(radius_units / width_units * box[0], 2)}
