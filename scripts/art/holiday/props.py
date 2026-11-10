"""The things on the holiday tables: presents and bows, pine and lights, sweets and trinkets. All built round the origin."""

import math
import random

import bpy
from mathutils import Vector

from kit import (K, MANIFEST, TAU, Mat, at, bevel, box, on_stage, emissive, gold, grid, lathe, lin, link, mesh_obj, parent, place, plain, prism,
                 rounded_rect, satin, solidify, sphere, star_outline, strip, subsurf, tube)

Z = Vector((0, 0, 1))


# ------------------------------------------------------------------------------- bows and boxes

def bow(name, mat, w=0.95, length=1.95, height=0.9, z=0.0, fan=math.radians(10), tails=2.3, tail_spread=0.5, ground=None, edge=0.6):
    """
    A tied satin bow sitting on z: two loops pinched at the knot and full at their far ends, leaning back
    so the inside of each shows, a knot over where they meet, and two tails lying towards the viewer,
    each ending in a swallowtail.
    """
    parts = []
    z0 = z + 0.24 * height + 0.05
    n = 34
    back = Vector((0.0, 1.0, 0.0))
    for side in (-1, 1):
        e = Vector((side * math.cos(fan), math.sin(fan), 0.0))
        ax = Z.cross(e).normalized()
        centre0 = e * (length * 0.5) + Z * (z0 + 0.34 * height)
        stations = []
        for i in range(n + 1):
            th = TAU * i / n
            a = (length / 2.0) * (1.0 - math.cos(th))
            far = a / length
            hz = height * (math.sin(th) ** 0.85) if th <= math.pi else 0.24 * height * math.sin(th)
            lean = 0.42 * height * math.sin(th) * math.sin(th / 2.0)
            c = e * a + Z * (z0 + hz + 0.16 * height * far) + back * lean
            out = (c - centre0)
            out = out.normalized() if out.length > 1e-6 else Z
            hw = (w / 2.0) * (0.3 + 0.7 * math.sin(th / 2.0) ** 1.15)
            stations.append((c, ax, hw, out, 0.09 * math.sin(th / 2.0)))
        parts.append(strip("%s_loop%d" % (name, side), stations, mat, 0.035, 2))
    # the knot: a short fat band over where the loops meet
    knot = box(name + "_knot", (0.5 * w, 0.62 * w, 0.44 * w), mat, 0.0, 0.1 * w, 4)
    subsurf(knot, 1)
    place(knot, (0.0, 0.02, z0 - 0.06 * height))
    parts.append(knot)
    if tails:
        m = 18
        across = 5
        for side in (-1, 1):
            d = Vector((side * tail_spread, -1.0, 0.0)).normalized()
            ax = Z.cross(d).normalized()
            verts, faces = [], []
            for j in range(m + 1):
                s = tails * j / m
                sway = ax * (side * 0.16 * math.sin(s / tails * math.pi))
                zc = z + 0.07 + 0.05 * math.sin(s * 3.1 + side * 1.3) + 0.2 * math.exp(-s * 2.4)
                if ground is not None:
                    # past the edge of what the bow sits on, the tails fall to what is under it
                    f = min(1.0, max(0.0, (s - edge) / 0.8))
                    f = f * f * (3.0 - 2.0 * f)
                    zc = zc * (1.0 - f) + (ground + 0.03 + 0.03 * math.sin(s * 3.1 + side)) * f
                c = d * s + sway + Z * zc
                hw = (w / 2.0) * (0.34 + 0.6 * min(1.0, s / 0.9) ** 0.8)
                for q in range(across):
                    u = q / (across - 1) * 2.0 - 1.0
                    notch = -0.46 * (1.0 - abs(u)) if j == m else 0.0
                    verts.append(c + ax * (hw * u) + d * notch + Z * (0.035 * (1 - u * u)))
            for j in range(m):
                for q in range(across - 1):
                    a = j * across + q
                    faces.append((a, a + 1, a + across + 1, a + across))
            tail = mesh_obj("%s_tail%d" % (name, side), verts, faces, mat, True)
            solidify(tail, 0.03, 0.0)
            subsurf(tail, 2)
            parts.append(tail)
    return parts


def wrap(name, w, d, h, mat, width=0.9, e=0.022):
    """Ribbon round a box both ways: two bands, each over the top and down two sides."""
    a = box(name + "_x", (w + 2 * e, width, h + e), mat, 0.0, 0.012, 2)
    b = box(name + "_y", (width, d + 2 * e, h + e + 0.006), mat, 0.0, 0.012, 2)
    return [a, b]


def present(name, w, d, h, paper_mat, ribbon_mat=None, ribbon_w=0.9, with_bow=True, bow_scale=1.0, r=0.05):
    """A wrapped box standing on the table, its ribbon and its bow. Returns (box, ribbon parts)."""
    body = box(name, (w, d, h), paper_mat, 0.0, r, 3)
    ribbons = []
    if ribbon_mat is not None:
        ribbons += wrap(name + "_wrap", w, d, h, ribbon_mat, ribbon_w)
        if with_bow:
            bw = ribbon_w * 1.05 * bow_scale
            ribbons += bow(name + "_bow", ribbon_mat, bw, min(w, d) * 0.3 * bow_scale + 0.25, 0.42 * bw + 0.42, h + 0.03, tails=min(w, d) * 0.36 * bow_scale)
    return body, ribbons


def tag(name, mat, w=2.0, h=0.95, string_to=None, string_mat=None, ring_mat=None, back_mat=None):
    """A luggage-shaped gift tag lying flat, its point and eyelet to the left, on a backing card, and the twine it is tied by."""
    def outline(w_, h_, c_):
        return [(-w_ / 2 + c_, -h_ / 2), (w_ / 2, -h_ / 2), (w_ / 2, h_ / 2), (-w_ / 2 + c_, h_ / 2), (-w_ / 2, h_ / 2 - c_), (-w_ / 2, -h_ / 2 + c_)]
    parts = []
    z = 0.0
    if back_mat is not None:
        parts.append(prism(name + "_back", outline(w + 0.2, h + 0.2, 0.36), 0.02, back_mat, 0.0, 0.006, 2))
        z = 0.021
    parts.append(prism(name, outline(w, h, 0.3), 0.022, mat, z, 0.006, 2))
    hole = Vector((-w / 2 + 0.3, 0.0, z + 0.024))
    ring = tube(name + "_ring", [hole + Vector((0.1 * math.cos(TAU * i / 20), 0.1 * math.sin(TAU * i / 20), 0)) for i in range(21)], 0.024, 8, ring_mat, cap=False)
    parts.append(ring)
    dot = lathe(name + "_hole", [(0.0, z + 0.0245), (0.078, z + 0.0245)], 20, plain(name + "_dark", "#2a1a10", 0.9))
    place(dot, (hole.x, hole.y, 0.0))
    parts.append(dot)
    if string_to is not None:
        a_, b_ = hole, Vector(string_to)
        pts = []
        for i in range(17):
            t = i / 16.0
            pt = a_.lerp(b_, t)
            pt.z = a_.z + (b_.z - a_.z) * t + 0.14 * math.sin(math.pi * t)
            pt += Vector((0.0, 0.12 * math.sin(math.pi * t * 2.0), 0.0))
            pts.append(pt)
        parts.append(tube(name + "_string", pts, 0.016, 6, string_mat))
    return parts


# ------------------------------------------------------------------------------- pine and holly

def needle_material(name="needles", dark="#12391f", light="#2f6b3a"):
    m = Mat(name)
    geo = m.node("ShaderNodeNewGeometry")
    col = m.ramp(geo.outputs["Random Per Island"], [(0.0, dark), (1.0, light)])
    m.set(base=col, rough=0.5, spec=0.35)
    return m.mat


def _needles(verts, faces, base, direction, length, r):
    d = direction.normalized()
    up = Z if abs(d.dot(Z)) < 0.95 else Vector((1, 0, 0))
    b = d.cross(up).normalized()
    n = b.cross(d).normalized()
    i0 = len(verts)
    for q in range(3):
        a = TAU * q / 3
        verts.append(base + (n * math.cos(a) + b * math.sin(a)) * r)
    verts.append(base + d * length)
    faces.extend([(i0, i0 + 1, i0 + 3), (i0 + 1, i0 + 2, i0 + 3), (i0 + 2, i0, i0 + 3), (i0 + 2, i0 + 1, i0)])


def pine_branch(name, needle_mat, stem_mat, length=4.4, seed=1, twigs=8, lift=0.22, fullness=1.0):
    """A fir bough lying on the table along +X: a stem, twigs to either side, and flat sprays of needles on all of them."""
    rnd = random.Random(seed)
    verts, faces = [], []
    stems = []

    def twig(origin, direction, ln, z_arc):
        d = direction.normalized()
        side = Z.cross(d).normalized()
        steps = max(8, int(ln / 0.05 * fullness))
        path = []
        for i in range(steps + 1):
            t = i / steps
            p = origin + d * (ln * t) + Z * (z_arc * math.sin(math.pi * t * 0.9)) + side * (0.06 * ln * math.sin(t * 2.4 + rnd.random()))
            path.append(p)
        for i in range(1, steps + 1):
            t = i / steps
            p = path[i]
            fwd = (path[i] - path[i - 1]).normalized()
            sd = Z.cross(fwd).normalized()
            nl = (0.5 - 0.22 * t) * (0.85 + 0.3 * rnd.random())
            for s in (-1, 1):
                ang = math.radians(rnd.uniform(48, 68))
                rise = rnd.uniform(0.05, 0.3)
                dirn = fwd * math.cos(ang) + sd * (s * math.sin(ang)) + Z * rise
                _needles(verts, faces, p, dirn, nl, 0.017)
            if i % 2 == 0:
                dirn = fwd * 0.75 + Z * rnd.uniform(0.45, 0.8) + sd * rnd.uniform(-0.25, 0.25)
                _needles(verts, faces, p, dirn, nl * 0.8, 0.016)
        _needles(verts, faces, path[-1], (path[-1] - path[-2]), 0.34, 0.017)
        return path

    main_dir = Vector((1, 0, 0))
    main = twig(Vector((0, 0, 0.05)), main_dir, length, lift)
    stems.append(tube(name + "_stem", main, [0.05 - 0.035 * i / (len(main) - 1) for i in range(len(main))], 6, stem_mat))
    for k in range(twigs):
        t = 0.12 + 0.72 * (k + rnd.random() * 0.5) / twigs
        base = main[int(t * (len(main) - 1))]
        s = -1 if k % 2 else 1
        ang = math.radians(rnd.uniform(34, 52)) * s
        d = Vector((math.cos(ang), math.sin(ang), 0.0))
        ln = length * (0.2 + 0.36 * (1.0 - t)) * rnd.uniform(0.85, 1.15)
        path = twig(base, d, ln, lift * 0.5)
        stems.append(tube("%s_twig%d" % (name, k), path, [0.028 - 0.018 * i / (len(path) - 1) for i in range(len(path))], 5, stem_mat))
    needles = mesh_obj(name + "_needles", verts, faces, needle_mat, smooth=False)
    return [needles] + stems


def berries(name, mat, n=3, r=0.13, seed=3, stem_mat=None):
    rnd = random.Random(seed)
    parts = []
    for i in range(n):
        a = TAU * i / n + rnd.random()
        p = Vector((math.cos(a) * r * 1.05, math.sin(a) * r * 1.05, r * (0.95 + 0.3 * rnd.random())))
        b = sphere("%s_%d" % (name, i), r * rnd.uniform(0.9, 1.1), mat, 20, 10)
        place(b, p)
        parts.append(b)
    return parts


def holly_leaf(name, mat, length=1.1):
    """A holly leaf: a spiked outline folded a little along its midrib."""
    pts = []
    lobes = 4
    for sgn in (1, -1):
        rng = range(lobes * 2 + 1) if sgn == 1 else range(lobes * 2 - 1, 0, -1)
        for i in rng:
            t = i / (lobes * 2)
            x = (t - 0.5) * length
            env = math.sin(math.pi * t) ** 0.7
            spike = 0.3 if i % 2 else 0.17
            pts.append((x, sgn * spike * env * length * 0.9))
    verts = [(0.0, 0.0, 0.03)] + [(x, y, 0.02 + 0.16 * abs(y)) for (x, y) in pts]
    n = len(pts)
    faces = [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)]
    ob = mesh_obj(name, verts, faces, mat, True)
    solidify(ob, 0.02, 0.0)
    return ob


# -------------------------------------------------------------------------------- lights, balls

def smooth_path(points, per=10):
    """A soft curve through the points (Catmull-Rom)."""
    pts = [Vector(p) for p in points]
    out = []
    for i in range(len(pts) - 1):
        p0, p1, p2, p3 = pts[max(i - 1, 0)], pts[i], pts[i + 1], pts[min(i + 2, len(pts) - 1)]
        for j in range(per):
            t = j / per
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(pts[-1])
    return out


def fairy_lights(name, points, wire_mat, bulb_mat, socket_mat, spacing=1.15, bulb=0.105, seed=5):
    """A string of small warm bulbs along a path lying on the table."""
    rnd = random.Random(seed)
    path = smooth_path(points, 12)
    parts = [tube(name + "_wire", path, 0.02, 6, wire_mat)]
    acc = 0.0
    k = 0
    for i in range(1, len(path)):
        acc += (path[i] - path[i - 1]).length
        if acc >= spacing:
            acc = 0.0
            fwd = (path[i] - path[i - 1]).normalized()
            side = Z.cross(fwd).normalized() * (1 if k % 2 else -1)
            base = path[i] + side * 0.05
            tip = base + side * 0.2 + Z * rnd.uniform(0.02, 0.1)
            parts.append(tube("%s_sock%d" % (name, k), [base, base + (tip - base) * 0.45], 0.045, 8, socket_mat))
            b = sphere("%s_bulb%d" % (name, k), bulb, bulb_mat, 16, 10)
            place(b, tip + Z * bulb * 0.4, scale=(1.0, 1.0, 1.0))
            parts.append(b)
            sx, sy = on_stage(tip + Z * bulb * 0.4)
            MANIFEST["bulbs"].append([round(sx + 50.0, 2), round(85.0 - sy, 2)])
            k += 1
    return parts


def bauble(name, r, mat, cap_mat):
    """A glass ball with its little metal cap and loop, lying on the table."""
    ball = sphere(name, r, mat, 40, 20)
    place(ball, (0, 0, r))
    cap = lathe(name + "_cap", [(0.0, 0.0), (0.2 * r, 0.0), (0.2 * r, 0.16 * r), (0.14 * r, 0.2 * r), (0.0, 0.2 * r)], 16, cap_mat)
    # the cap points up the table (away from the viewer), where the ball's top would be seen
    place(cap, (0, r * 0.98, r), rot=(-math.pi / 2, 0, 0))
    loop = tube(name + "_loop", [Vector((0.1 * r * math.cos(TAU * i / 16), r * 1.22 + 0.1 * r * math.sin(TAU * i / 16), r)) for i in range(17)], 0.012 * max(1.0, r), 6, cap_mat, cap=False)
    return [ball, cap, loop]


def glass_paint(name, color, rough=0.1):
    m = Mat(name)
    m.set(base=color, rough=rough, coat=1.0, coat_rough=0.04, metal=0.35, spec=0.7)
    return m.mat


def stars(name, mat, count, area, seed=2, size=(0.11, 0.2), avoid=None):
    """Foil stars thrown about: `area` is (x0, y0, x1, y1) on the stage; `avoid` is a list of such boxes kept clear."""
    rnd = random.Random(seed)
    parts = []
    tries = 0
    while len(parts) < count and tries < count * 30:
        tries += 1
        sx, sy = rnd.uniform(area[0], area[2]), rnd.uniform(area[1], area[3])
        if avoid and any(a[0] <= sx <= a[2] and a[1] <= sy <= a[3] for a in avoid):
            continue
        s = rnd.uniform(*size)
        ob = prism("%s_%d" % (name, len(parts)), star_outline(5, s, s * 0.45), 0.012, mat, 0.0)
        place(ob, at(sx, sy, 0.004), rot=(rnd.uniform(-0.12, 0.12), rnd.uniform(-0.12, 0.12), rnd.uniform(0, TAU)))
        parts.append(ob)
    return parts


# ---------------------------------------------------------------------------------------- sweets

def candy_material(name="candy", red="#d4202a"):
    m = Mat(name)
    uv = m.node("ShaderNodeUVMap").outputs["UV"]
    u, v, _ = m.sep(uv)
    t = m.math("ADD", m.math("MULTIPLY", u, 1.5), v)
    wide = m.band(t, 0.42, 0.03)
    thin = m.band(m.math("ADD", t, 0.5), 0.1, 0.02)
    col = m.mix(m.math("MAXIMUM", wide, thin), "#fbf7f2", red)
    m.set(base=col, rough=0.14, coat=0.7, coat_rough=0.05, sss=0.15, sss_scale=0.05)
    return m.mat


def candy_cane(name, mat, length=2.5, r=0.14, hook=0.42):
    pts = [Vector((0, y, r)) for y in [length * i / 14 for i in range(15)]]
    for i in range(1, 17):
        a = math.pi * i / 16
        pts.append(Vector((hook - hook * math.cos(a), length + hook * math.sin(a), r)))
    for i in range(1, 4):
        pts.append(Vector((2 * hook, length - 0.14 * i, r)))
    return tube(name, pts, r, 20, mat)


def cookie_material(name="cookie", color="#b9783e"):
    m = Mat(name)
    obj = m.coords("Object")
    n, _ = m.noise(obj, 9.0, 4.0, 0.6)
    col = m.mix(m.math("MULTIPLY", n, 0.35), color, "#8a5328")
    m.set(base=col, rough=0.8, sss=0.2, sss_scale=0.03, normal=m.bump(n, 0.5, 0.01))
    return m.mat


def star_cookie(name, cookie_mat, icing_mat, r=0.62):
    base = prism(name, star_outline(5, r, r * 0.52), 0.11, cookie_mat, 0.0, 0.035, 3)
    ice = prism(name + "_ice", star_outline(5, r * 0.78, r * 0.4), 0.03, icing_mat, 0.105, 0.012, 2)
    return [base, ice]


def gingerbread(name, cookie_mat, icing_mat, red_mat, dark_mat, s=1.0):
    """A gingerbread person: a soft blobby cookie, piped with icing, with two eyes, a smile and two buttons."""
    mb = bpy.data.metaballs.new(name)
    mb.resolution = 0.035
    mb.render_resolution = 0.035
    mb.threshold = 0.9
    ob = bpy.data.objects.new(name, mb)
    link(ob)

    def ball(x, y, r):
        el = mb.elements.new(type="BALL")
        el.co = (x * s, y * s, 0.0)
        el.radius = r * s

    ball(0.0, 0.62, 0.52)                       # head
    for y in (0.22, -0.02, -0.26):
        ball(0.0, y, 0.52)                      # body
    for sgn in (-1, 1):
        for i in range(4):
            ball(sgn * (0.22 + 0.17 * i), 0.2 - 0.03 * i, 0.36 - 0.02 * i)      # arms
            ball(sgn * (0.16 + 0.06 * i), -0.45 - 0.17 * i, 0.38 - 0.02 * i)    # legs
    ob.scale = (1.0, 1.0, 0.32)
    ob.data.materials.append(cookie_mat)
    top = 0.105 * s
    parts = [ob]
    for sgn in (-1, 1):
        eye = sphere("%s_eye%d" % (name, sgn), 0.035 * s, dark_mat, 12, 8)
        place(eye, (sgn * 0.1 * s, 0.68 * s, top + 0.03 * s))
        parts.append(eye)
        cuff = tube("%s_cuff%d" % (name, sgn), [Vector((sgn * (0.56 + 0.012 * math.sin(i * 1.9)) * s, (0.02 + 0.04 * i) * s, top * 0.72)) for i in range(6)], 0.018 * s, 6, icing_mat)
        ankle = tube("%s_ankle%d" % (name, sgn), [Vector((sgn * (0.2 + 0.04 * i) * s, (-0.8 + 0.012 * math.sin(i * 1.9)) * s, top * 0.76)) for i in range(6)], 0.018 * s, 6, icing_mat)
        parts += [cuff, ankle]
    smile = tube(name + "_smile", [Vector((0.12 * s * math.sin(a), (0.56 - 0.07 * math.cos(a)) * s, top + 0.045 * s)) for a in [(-1.1 + 2.2 * i / 10) for i in range(11)]], 0.014 * s, 6, icing_mat)
    parts.append(smile)
    for i, y in enumerate((0.16, -0.08)):
        b = sphere("%s_button%d" % (name, i), 0.05 * s, red_mat, 12, 8, 0.6)
        place(b, (0.0, y * s, top + 0.045 * s))
        parts.append(b)
    return parts


def mug(name, body_mat, cocoa_mat, mallow_mats, r=0.95, h=1.35, seed=4):
    """A mug of cocoa seen from above: the rim, the dark surface a little way down, marshmallows afloat, a handle."""
    rnd = random.Random(seed)
    t = 0.09
    prof = [(0.0, 0.0), (r * 0.82, 0.0), (r, 0.12), (r, h - 0.04), (r - t * 0.5, h), (r - t, h - 0.04), (r - t, h * 0.3), (0.0, h * 0.3)]
    body = lathe(name, prof, 56, body_mat)
    cocoa = lathe(name + "_cocoa", [(0.0, h - 0.2), (r - t - 0.005, h - 0.2)], 48, cocoa_mat)
    handle = tube(name + "_handle", [Vector((r - 0.04 + 0.52 * math.sin(a), 0.0, h * 0.52 + 0.4 * math.cos(a))) for a in [math.pi * i / 14 for i in range(15)]], 0.1, 12, body_mat, flat=0.8)
    parts = [body, cocoa, handle]
    for i in range(7):
        a = rnd.uniform(0, TAU)
        d = rnd.uniform(0.0, r - t - 0.3)
        mm = box("%s_m%d" % (name, i), (0.26, 0.26, 0.2), mallow_mats[i % len(mallow_mats)], 0.0, 0.07, 3)
        place(mm, (d * math.cos(a), d * math.sin(a), h - 0.24 + rnd.uniform(0.0, 0.05)), rot=(rnd.uniform(-0.3, 0.3), rnd.uniform(-0.3, 0.3), rnd.uniform(0, TAU)))
        parts.append(mm)
    return parts


def cinnamon(name, mat, length=1.9, r=0.11):
    a = tube(name + "_a", [Vector((-length / 2, 0.0, r)), Vector((length / 2, 0.0, r))], r, 12, mat)
    b = tube(name + "_b", [Vector((-length / 2, r * 1.5, r * 0.9)), Vector((length / 2, r * 1.5, r * 0.9))], r * 0.85, 12, mat)
    return [a, b]


def orange_slice_material(name="orange"):
    m = Mat(name)
    x, y, z = m.sep(m.coords("Object"))
    ang = m.math("ARCTAN2", y, x)
    rad = m.math("SQRT", m.math("ADD", m.math("MULTIPLY", x, x), m.math("MULTIPLY", y, y)))
    seg = m.band(m.math("MULTIPLY", ang, 8.0 / TAU), 0.86, 0.04)
    flesh = m.math("MULTIPLY", seg, m.math("SMOOTHSTEP", rad, 0.06, 0.12))
    flesh = m.math("MULTIPLY", flesh, m.math("SUBTRACT", 1.0, m.math("SMOOTHSTEP", rad, 0.5, 0.53)))
    pith = m.mix(flesh, "#f6d9a0", "#e0781e")
    rind = m.math("SMOOTHSTEP", rad, 0.57, 0.6)
    col = m.mix(rind, pith, "#c85a12")
    n, _ = m.noise(m.coords("Object"), 22.0, 2.0, 0.5)
    m.set(base=col, rough=0.45, sss=0.5, sss_scale=0.08, coat=0.3, normal=m.bump(n, 0.25, 0.01))
    return m.mat


def orange_slice(name, mat, r=0.62):
    ob = lathe(name, [(0.0, 0.0), (0.62, 0.0), (0.63, 0.025), (0.62, 0.05), (0.0, 0.05)], 48, mat)
    ob.scale = (r / 0.62, r / 0.62, 1.0)
    return ob
