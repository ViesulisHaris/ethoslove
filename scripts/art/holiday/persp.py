"""
Scenes seen through a real lens, for the gifts that are a room or a street rather than a table from above.

The picture is still laid out on the gift's stage (100 by 170 units, in the middle of a plate 360 wide
and 240 tall), but it is rendered in perspective, with depth of field, so nothing in it can be a sprite
that slides about: what changes is rendered as a second picture of the same view (the candles lit, the
door open) and the gift fades between them, or lays the difference over the first (see pack.mjs).
Anything the gift has to find (a wick, a bulb, a board) is projected through the camera into stage units.
"""

import math
import os

import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

import kit

PLATE_W, PLATE_H = 360.0, 240.0


def setup(cam_at, look_at, lens=35.0, ppk=10.0, samples=200, preview=False, exposure=0.0, fstop=None, focus=None, contrast="Medium High Contrast"):
    """The renderer as the table scenes have it, and a perspective camera at `cam_at` looking at `look_at`. `focus` is a point to keep sharp (with `fstop`)."""
    kit.setup(PLATE_W, PLATE_H, ppk, samples, preview, exposure=exposure, contrast=contrast)
    sc = bpy.context.scene
    old = sc.camera
    data = bpy.data.cameras.new("lens")
    data.lens = lens
    data.sensor_width = 36.0
    data.sensor_fit = "HORIZONTAL"
    data.clip_start = 0.05
    data.clip_end = 2000.0
    cam = bpy.data.objects.new("lens", data)
    sc.collection.objects.link(cam)
    cam.location = Vector(cam_at)
    cam.rotation_euler = (Vector(look_at) - Vector(cam_at)).to_track_quat("-Z", "Y").to_euler()
    if fstop:
        data.dof.use_dof = True
        data.dof.aperture_fstop = fstop
        data.dof.focus_distance = (Vector(focus if focus is not None else look_at) - Vector(cam_at)).length
        data.dof.aperture_blades = 7
    sc.camera = cam
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    sc.cycles.max_bounces = 8
    return cam


def on_stage(point):
    """A point in the world, as stage units from the stage's top left (x across, y down), through the lens."""
    sc = bpy.context.scene
    bpy.context.view_layer.update()
    u, v, _ = world_to_camera_view(sc, sc.camera, Vector(point))
    return (round(u * PLATE_W - (PLATE_W - 100.0) / 2.0, 3), round((1.0 - v) * PLATE_H - (PLATE_H - 170.0) / 2.0, 3))


def anchor(name, point):
    x, y = on_stage(point)
    kit.MANIFEST["anchors"][name] = {"x": x, "y": y}
    return x, y


def world_night(top="#0a1226", horizon="#27365c", strength=0.5, stars=0.0):
    """A sky that is a gradient from the horizon up, and a few stars if asked."""
    w = bpy.data.worlds.new("sky")
    w.use_nodes = True
    nt = w.node_tree
    bg = nt.nodes["Background"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = kit.lin(horizon)
    ramp.color_ramp.elements[1].position = 0.45
    ramp.color_ramp.elements[1].color = kit.lin(top)
    nt.links.new(sep.outputs["Z"], ramp.inputs["Fac"])
    out = ramp.outputs["Color"]
    if stars:
        noise = nt.nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = 700.0
        thr = nt.nodes.new("ShaderNodeMath")
        thr.operation = "GREATER_THAN"
        thr.inputs[1].default_value = 0.76
        nt.links.new(noise.outputs["Fac"], thr.inputs[0])
        add = nt.nodes.new("ShaderNodeMixRGB")
        add.blend_type = "ADD"
        nt.links.new(thr.outputs[0], add.inputs["Fac"])
        nt.links.new(out, add.inputs["Color1"])
        add.inputs["Color2"].default_value = (stars, stars, stars * 1.1, 1.0)
        out = add.outputs["Color"]
    nt.links.new(out, bg.inputs["Color"])
    bg.inputs["Strength"].default_value = strength
    bpy.context.scene.world = w
    return w


def area(name, loc, aim, energy, size=1.0, color=(1.0, 1.0, 1.0), shadow=True):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.size = size
    data.color = color
    try:
        data.cycles.cast_shadow = shadow
    except Exception:
        pass
    ob = bpy.data.objects.new(name, data)
    kit.link(ob)
    ob.location = Vector(loc)
    ob.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return ob


def point(name, loc, energy, color=(1.0, 0.72, 0.38), radius=0.1, shadow=True):
    return kit.lamp(name, Vector(loc), energy, color, radius, shadow)


def render(path, hide=(), transparent=False):
    """One picture of the whole plate, with everything in the collections named in `hide` left out."""
    sc = bpy.context.scene
    for coll in bpy.data.collections:
        coll.hide_render = coll.name in hide
    sc.render.film_transparent = transparent
    sc.render.use_border = False
    sc.render.use_compositing = True
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("PLATE", path)


def save(path, **extra):
    kit.MANIFEST.update(extra)
    kit.save_manifest(path)
