"""
The made things that lie among the flowers: a phone with nobody's name on it, a polaroid, a note
card, a fountain pen, a sealed envelope. Each is built round the origin, lying on z = 0, and
returns its parts and whatever a page needs to know about it (a screen's corners, a photo's).
"""

import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "holiday"))

import kit  # noqa: E402
from kit import Mat, lathe, mesh_obj, plain, prism, rounded_rect  # noqa: E402
import props_desk as desk  # noqa: E402

SCREEN_BOX = (390, 844)


def flat(name, color, strength=1.0):
    """A colour that is the same whatever the light: an empty screen."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = kit.lin(color)
    em.inputs["Strength"].default_value = strength
    nt.links.new(em.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    return mat


def holdout(name="holdout"):
    """Nothing at all: where it is, the picture is cut through."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    ho = nt.nodes.new("ShaderNodeHoldout")
    nt.links.new(ho.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    return mat


def panel(name, w, h, r, z, mat, seg=10):
    """A flat rounded rectangle at height z, facing up, its UV running 0..1 across and up it."""
    pts = rounded_rect(w, h, r, seg)
    verts = [(x, y, z) for (x, y) in pts]
    uvs = [(x / w + 0.5, y / h + 0.5) for (x, y) in pts]
    return mesh_obj(name, verts, [tuple(range(len(pts)))], mat, False, uvs)


def phone(name, w=4.3, screen=None, screen_mat=None):
    """
    A phone lying face up: a dark metal band, black glass, a screen with nothing on it and no notch
    or camera drawn in it. Returns (parts, info): info has the screen's object, its corners (top left,
    top right, bottom right, bottom left, round the origin), its width and its corner radius.
    """
    h = w * 2.07
    t = w * 0.1
    r = w * 0.168
    band = Mat(name + "_band")
    grain, _ = band.noise(band.coords("Object"), 60.0, 2.0, 0.5)
    band.set(base="#2b2623", metal=0.92, rough=0.3, coat=0.25, coat_rough=0.12, normal=band.bump(grain, 0.03, 0.002))
    glass = Mat(name + "_glass")
    glass.set(base="#060505", rough=0.07, spec=0.6, coat=0.6, coat_rough=0.04)
    body = prism(name + "_body", rounded_rect(w, h, r, 14), t, band.mat, 0.0, w * 0.021, 4)
    rim = w * 0.014
    front = prism(name + "_front", rounded_rect(w - 2 * rim, h - 2 * rim, r - rim, 14), 0.012, glass.mat, t - 0.004, 0.005, 2)
    inset = w * 0.044
    sw = w - 2 * inset
    sh = sw * SCREEN_BOX[1] / SCREEN_BOX[0]
    sr = r - inset
    sz = t + 0.0095
    scr = panel(name + "_screen", sw, sh, sr, sz, screen_mat or flat(name + "_screen_mat", screen or "#0b0908"), 12)
    parts = [body, front, scr]
    for (side, y0, ln) in ((1.0, h * 0.2, h * 0.11), (-1.0, h * 0.25, h * 0.06), (-1.0, h * 0.165, h * 0.06)):
        b = kit.box("%s_button%d" % (name, len(parts)), (w * 0.02, ln, t * 0.3), band.mat, t * 0.35, 0.012, 2)
        b.location = Vector((side * (w / 2.0 + w * 0.004), y0, 0.0))
        parts.append(b)
    corners = [Vector((-sw / 2, sh / 2, sz)), Vector((sw / 2, sh / 2, sz)), Vector((sw / 2, -sh / 2, sz)), Vector((-sw / 2, -sh / 2, sz))]
    return parts, dict(screen=scr, corners=corners, width=sw, radius=sr, size=(w, h, t))


def paper_stock(name, color, warm=None, rough=0.72, fibre=0.25, lift=0.22):
    """
    Card or photo paper: a colour, a breath of unevenness in it, the tooth of its surface. `lift` is
    a little light of its own: the scene is exposed for petals, which glow, and a flat white card
    lit the same way would come out darker than the cream page it is laid on.
    """
    m = Mat(name)
    obj = m.coords("Object")
    cloud, _ = m.noise(obj, 1.4, 3.0, 0.55)
    fine, _ = m.noise(obj, 120.0, 2.0, 0.6)
    fib, _ = m.noise(m.mapping(obj, (6.0, 60.0, 6.0)), 3.0, 2.0, 0.5)
    col = m.mix(m.math("MULTIPLY", cloud, 0.35), color, kit.lin(warm or color))
    col = m.mix(m.math("MULTIPLY", fib, fibre * 0.22), col, kit.lin(warm or color))
    m.set(base=col, rough=rough, spec=0.25, sheen=0.15, emit=col, emit_strength=lift,
          normal=m.bump(m.math("ADD", m.math("MULTIPLY", fine, 0.5), m.math("MULTIPLY", fib, fibre)), 0.12, 0.004))
    return m.mat


def sheet(name, w, h, r, thick, mat, bend=0.0, seg=5, nx=10, ny=12):
    """A card with rounded corners, lying flat, perhaps lifted a little along one diagonal as paper is."""
    pts = rounded_rect(w, h, r, seg)
    ob = prism(name, pts, thick, mat, 0.0, min(thick * 0.3, 0.006), 2)
    if bend:
        for v in ob.data.vertices:
            d = (v.co.x / w + v.co.y / h)
            v.co.z += bend * d * d
    return ob


def soft_shadow(name, w, h, edge=0.14, strength=0.6):
    """
    A painted shadow: a dark sheet that fades to nothing at its edges, to slip under a card lying on an
    empty screen (which, being the same colour whatever the light, cannot take a real one).
    """
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.blend_method = "BLEND"
    m = Mat.__new__(Mat)
    m.mat, m.nt = mat, mat.node_tree
    m.bsdf, m.out = m.nt.nodes["Principled BSDF"], m.nt.nodes["Material Output"]
    u, v, _ = m.sep(m.coords("UV"))
    du = m.math("MINIMUM", u, m.math("SUBTRACT", 1.0, u))
    dv = m.math("MINIMUM", v, m.math("SUBTRACT", 1.0, v))
    f = m.math("MULTIPLY", m.math("SMOOTHSTEP", du, 0.0, edge), m.math("SMOOTHSTEP", dv, 0.0, edge * w / h))
    tr = m.nt.nodes.new("ShaderNodeBsdfTransparent")
    em = m.nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (0.0, 0.0, 0.0, 1.0)
    mix = m.nt.nodes.new("ShaderNodeMixShader")
    m.nt.links.new(m.math("MULTIPLY", f, strength), mix.inputs[0])
    m.nt.links.new(tr.outputs[0], mix.inputs[1])
    m.nt.links.new(em.outputs[0], mix.inputs[2])
    m.nt.links.new(mix.outputs[0], m.out.inputs["Surface"])
    ob = panel(name, w, h, 0.0, 0.0, mat, 1)
    ob.visible_shadow = False
    return ob


def polaroid(name, w=3.0, photo=None):
    """
    An instant photo: cream card, the picture's place (empty: a flat dark warm tone a page lays a
    photo over) high in it, the wide margin below. Returns (parts, info) like phone().
    """
    h = w * 1.2
    card = sheet(name, w, h, w * 0.012, 0.022, paper_stock(name + "_card", "#fcf8f0", "#f3ead9", 0.62, 0.12, 0.3))
    pw = w * 0.875
    ph = pw
    top = w * 0.0625
    cy = h / 2.0 - top - ph / 2.0
    pic_mat = Mat(name + "_pic")
    pic_mat.set(base=photo or "#3d2f29", rough=0.28, coat=0.5, coat_rough=0.15)
    pic = panel(name + "_photo", pw, ph, w * 0.006, 0.0236, pic_mat.mat, 3)
    pic.location = Vector((0.0, cy, 0.0))
    z = 0.0236
    corners = [Vector((-pw / 2, cy + ph / 2, z)), Vector((pw / 2, cy + ph / 2, z)), Vector((pw / 2, cy - ph / 2, z)), Vector((-pw / 2, cy - ph / 2, z))]
    return [card, pic], dict(photo=pic, corners=corners, width=pw, radius=w * 0.006, size=(w, h, 0.022))


def letter_sheet(name, w=3.7, h=2.55, color="#fff3d6", warm="#f6e0b8"):
    """
    A sheet of cream letter paper that has been folded once and opened out again: a soft fold line
    across its middle, the two halves not quite flat, one corner (the top right) lifting off the page.
    Blank. Returns (parts, info): the place for words is its face inside a margin, as flat as paper is.
    """
    m = Mat(name + "_paper")
    obj = m.coords("Object")
    _, y, _ = m.sep(obj)
    cloud, _ = m.noise(obj, 1.2, 3.0, 0.55)
    fine, _ = m.noise(obj, 130.0, 2.0, 0.6)
    fib, _ = m.noise(m.mapping(obj, (50.0, 5.0, 5.0)), 3.0, 2.0, 0.5)
    crease = m.math("SUBTRACT", 1.0, m.math("SMOOTHSTEP", m.math("ABSOLUTE", y), 0.0, 0.03))
    col = m.mix(m.math("MULTIPLY", cloud, 0.4), color, kit.lin(warm))
    col = m.mix(m.math("MULTIPLY", fib, 0.05), col, kit.lin(warm))
    col = m.mix(m.math("MULTIPLY", crease, 0.4), col, kit.lin("#cdb48a"))
    height = m.math("SUBTRACT", m.math("ADD", m.math("MULTIPLY", fine, 0.4), m.math("MULTIPLY", fib, 0.12)), m.math("MULTIPLY", crease, 1.6))
    # its own light is warmer than its colour: lit like the petals it would come out a grey white on a cream page
    m.set(base=col, rough=0.7, spec=0.22, sheen=0.15, emit=m.mix(0.6, col, kit.lin("#ffdfae")), emit_strength=0.5, normal=m.bump(height, 0.16, 0.006),
          sss=0.15, sss_radius=(1.0, 0.8, 0.5), sss_scale=0.05)
    nx, ny = 44, 30
    verts, faces = [], []
    for j in range(ny + 1):
        for i in range(nx + 1):
            x, yy = -w / 2 + w * i / nx, -h / 2 + h * j / ny
            # the fold: a low ridge along the middle, its two sides falling away a degree or two
            z = 0.11 * (1.0 - math.sqrt(yy * yy + 0.03 ** 2) / (h / 2))
            # a sheet never lies quite flat
            z += 0.012 * math.sin(x * 1.7 + 0.6) * math.sin(yy * 2.1 + 1.0)
            # the top right corner, lifting and curling back a little
            d = max(0.0, x / (w / 2) + yy / (h / 2) - 1.1)
            z += 0.85 * d * d
            pull = 0.2 * d * d
            verts.append((x - pull, yy - pull, max(z, 0.0)))
    for j in range(ny):
        for i in range(nx):
            a = j * (nx + 1) + i
            faces.append((a, a + 1, a + nx + 2, a + nx + 1))
    paper = mesh_obj(name, verts, faces, m.mat, True)
    kit.solidify(paper, 0.006, 1.0)
    kit.subsurf(paper, 1)
    mx, my = w * 0.1, h * 0.14
    z = 0.031
    corners = [Vector((-w / 2 + mx, h / 2 - my, z)), Vector((w / 2 - mx, h / 2 - my, z)), Vector((w / 2 - mx, -h / 2 + my, z)), Vector((-w / 2 + mx, -h / 2 + my, z))]
    return [paper], dict(corners=corners, width=w - 2 * mx, radius=0.0, size=(w, h, 0.03), aspect=(w - 2 * mx) / (h - 2 * my))


def glow_screen(name, top="#5a3524", bottom="#1d0f0b", sheen=0.05, strength=0.5):
    """
    A screen that is on but showing nothing: a soft warm gradient, lighter towards its top left as if
    lit from within, and the faintest band of a reflection across it. The same whatever the light.
    """
    m = Mat(name)
    u, v, _ = m.sep(m.coords("UV"))
    # how near the top left: 1 there, 0 at the bottom right
    lit = m.math("ADD", m.math("MULTIPLY", v, 0.72), m.math("MULTIPLY", m.math("SUBTRACT", 1.0, u), 0.28))
    col = m.mix(m.math("SMOOTHSTEP", lit, 0.05, 1.0), bottom, kit.lin(top))
    # a pool of warmth a third of the way down, as a lit page has
    du = m.math("SUBTRACT", u, 0.42)
    dv = m.math("MULTIPLY", m.math("SUBTRACT", v, 0.7), 1.6)
    pool = m.math("SUBTRACT", 1.0, m.math("SMOOTHSTEP", m.math("SQRT", m.math("ADD", m.math("MULTIPLY", du, du), m.math("MULTIPLY", dv, dv))), 0.0, 0.75))
    col = m.mix(m.math("MULTIPLY", pool, 0.28), col, kit.lin("#77482c"))
    # the reflection: a broad soft band running down from the top right
    band = m.math("ABSOLUTE", m.math("SUBTRACT", m.math("ADD", u, m.math("MULTIPLY", v, 0.55)), 1.12))
    shine = m.math("MULTIPLY", m.math("SUBTRACT", 1.0, m.math("SMOOTHSTEP", band, 0.0, 0.2)), sheen)
    col = m.mix(shine, col, (1.0, 0.93, 0.84, 1.0))
    m.set(base=(0.0, 0.0, 0.0, 1.0), spec=0.0, rough=1.0, emit=col, emit_strength=strength)
    return m.mat


def fountain_pen(name, length=3.5, color="#3d0f1c"):
    """A fountain pen lying along +X, uncapped, its cap posted on the back: lacquer, gold bands, a gold nib."""
    lac = Mat(name + "_lacquer")
    lac.set(base=color, rough=0.16, coat=0.7, coat_rough=0.05, spec=0.6)
    gold = kit.gold(name + "_gold", "#e9bf6c", 0.22)
    black = plain(name + "_section", "#15100f", 0.3, coat=0.4)
    L = length
    r = L * 0.036
    # along Z first (a lathe), then laid down
    barrel = [(0.0, 0.0), (r * 0.62, 0.0), (r * 0.8, L * 0.02), (r, L * 0.1), (r * 1.02, L * 0.42), (r * 0.98, L * 0.6)]
    body = lathe(name + "_barrel", barrel + [(0.0, L * 0.6)], 28, lac.mat)
    cap = lathe(name + "_cap", [(0.0, -L * 0.012), (r * 0.9, -L * 0.01), (r * 1.2, L * 0.012), (r * 1.22, L * 0.3), (r * 1.14, L * 0.305), (0.0, L * 0.305)], 28, lac.mat)
    band1 = lathe(name + "_band1", [(r * 1.235, L * 0.262), (r * 1.25, L * 0.27), (r * 1.25, L * 0.295), (r * 1.235, L * 0.303)], 28, gold)
    band2 = lathe(name + "_band2", [(r * 1.03, L * 0.586), (r * 1.05, L * 0.59), (r * 1.05, L * 0.602), (r * 1.03, L * 0.606)], 28, gold)
    section = lathe(name + "_section", [(r * 0.94, L * 0.6), (r * 0.8, L * 0.66), (r * 0.72, L * 0.74), (r * 0.78, L * 0.752), (0.0, L * 0.752)], 28, black)
    # the nib: a tapered leaf of gold, slit down the middle, curved over the feed
    nl = L * 0.2
    verts, faces = [], []
    n = 12
    for i in range(n + 1):
        f = i / n
        hw = r * 0.72 * (1.0 - f ** 1.6) + 0.002
        for j in range(5):
            u = j / 4.0 * 2.0 - 1.0
            verts.append((hw * u, r * 0.34 * (1.0 - u * u) * (1.0 - 0.8 * f) - r * 0.2 * f, L * 0.745 + nl * f))
    for i in range(n):
        for j in range(4):
            a = i * 5 + j
            faces.append((a, a + 1, a + 6, a + 5))
    nib = mesh_obj(name + "_nib", verts, faces, gold, True)
    kit.solidify(nib, 0.008, 0.0)
    feed = lathe(name + "_feed", [(0.0, L * 0.74), (r * 0.5, L * 0.745), (r * 0.36, L * 0.86), (0.0, L * 0.9)], 12, black)
    feed.location = Vector((0.0, -r * 0.32, 0.0))
    clip = kit.box(name + "_clip", (r * 0.42, r * 0.22, L * 0.2), gold, 0.0, 0.006, 2)
    clip.location = Vector((0.0, r * 1.28, L * 0.07))
    parts = [body, cap, band1, band2, section, nib, feed, clip]
    lay = Matrix.Translation(Vector((-L * 0.42, 0.0, r * 1.26))) @ Matrix.Rotation(math.radians(90.0), 4, "Y") @ Matrix.Rotation(math.radians(160.0), 4, "Z")
    bpy.context.view_layer.update()
    for ob in parts:
        ob.matrix_world = lay @ ob.matrix_world
    return parts


def envelope(name, w=2.9, h=2.0, color="#fbf4e6", seal="#7b1d3a"):
    """A sealed envelope seen from the back: the flap's point down the middle, a wax seal with a heart on it."""
    stock = paper_stock(name + "_paper", color, "#f0e3cc", 0.66, 0.15, 0.3)
    body = sheet(name, w, h, 0.04, 0.04, stock)
    # the side and bottom folds show as the faintest steps; the flap is a real second layer
    flap_pts = [(-w / 2 + 0.02, h / 2 - 0.02), (-w * 0.06, -h * 0.1), (0.0, -h * 0.13), (w * 0.06, -h * 0.1), (w / 2 - 0.02, h / 2 - 0.02)]
    flap = prism(name + "_flap", flap_pts, 0.03, stock, 0.04, 0.006, 2)
    low_pts = [(-w / 2 + 0.02, -h / 2 + 0.02), (w / 2 - 0.02, -h / 2 + 0.02), (0.0, -h * 0.02)]
    low = prism(name + "_fold", low_pts, 0.006, stock, 0.04, 0.002, 1)
    wm = Mat(name + "_wax")
    n, _ = wm.noise(wm.coords("Object"), 6.0, 3.0, 0.5)
    wm.set(base=seal, rough=0.26, coat=0.5, coat_rough=0.12, sss=0.25, sss_scale=0.05, normal=wm.bump(n, 0.05, 0.01))
    parts = [body, low, flap]
    for ob in desk.wax_seal(name + "_seal", wm.mat, h * 0.2):
        ob.location = Vector((0.0, -h * 0.11, 0.052))
        parts.append(ob)
    return parts


def place(name, parts, loc=(0.0, 0.0, 0.0), yaw=0.0, pitch=0.0, roll=0.0, scale=1.0):
    """Puts a thing built round the origin somewhere: turned `yaw` on the page, tipped `pitch` about its width and `roll` about its length (degrees)."""
    root = bpy.data.objects.new(name, None)
    kit.link(root)
    bpy.context.view_layer.update()
    for ob in parts:
        local = ob.matrix_world.copy()
        ob.parent = root
        ob.matrix_parent_inverse = Matrix.Identity(4)
        ob.matrix_basis = local
    root.matrix_world = (Matrix.Translation(Vector(loc)) @ Matrix.Rotation(math.radians(yaw), 4, "Z") @ Matrix.Rotation(math.radians(pitch), 4, "X")
                         @ Matrix.Rotation(math.radians(roll), 4, "Y") @ Matrix.Scale(scale, 4))
    bpy.context.view_layer.update()
    return root


def world_corners(root, info):
    return [root.matrix_world @ c for c in info["corners"]]
