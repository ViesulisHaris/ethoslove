"""
A lily, built the way the flower is: six tepals in two whorls of three (three narrower sepals
outside, three broader petals inside and between them), each a long blade that leaves the throat
as a channel, opens flat and rolls back at its tip, with a midrib furrow, a ruffled edge and real
thickness; six stamens with rust anthers hung crosswise on their filaments; a pistil; a green
receptacle and a stalk. No two tepals are alike: each gets its own length, curl, twist and ruffle.

The colour is a palette, not part of the model (PALETTES: ivory, blush, wine, moonlight), so a
page in a gift's own colours can have the same flowers in them.
"""

import math
import random

import bpy
from mathutils import Matrix, Vector

import kit
from kit import TAU, Mat, mesh_obj, solidify, subsurf, tube

import pkit

PALETTES = {
    # base: the open petal. throat: what it deepens to going in. deep: the very bottom of the cup.
    # streak: the line along the midrib. vein: the fine parallel veins. glow: light coming through a petal.
    "ivory": dict(base="#f8efdd", tip="#fcf6ea", throat="#e2c47e", deep="#bfa257", streak="#cbc07a", vein="#c9b384", vein_mix=0.16, glow="#f6cf98",
                  sss=0.6, sss_radius=(1.0, 0.55, 0.28), sss_scale=0.3, trans=0.3, rough=0.52, sheen=0.25,
                  back="#ece3c9", anther="#4f260c", pollen="#8a4c1a", filament="#e3e2b8", stigma="#c4bd7c"),
    # Every colourway stays as soft as the ivory one: muted, low in saturation, made for a pale ground.
    "blush": dict(base="#f3d6d2", tip="#f9e8e4", throat="#e4a5a5", deep="#cf898b", streak="#dc9d9d", vein="#e0b0ac", vein_mix=0.2, glow="#f6c2ba",
                  sss=0.6, sss_radius=(1.0, 0.5, 0.4), sss_scale=0.3, trans=0.3, rough=0.52, sheen=0.28,
                  back="#efcdc8", anther="#4f260c", pollen="#8a4c1a", filament="#efe3ca", stigma="#d6b48f"),
    # wine is a dusty rose-burgundy, not a dark red: less light is let through it, or it glows pink
    "wine": dict(base="#9d5068", tip="#b97a8a", throat="#702b44", deep="#551c31", streak="#7b344c", vein="#803a52", vein_mix=0.32, glow="#c67a8b",
                 sss=0.42, sss_radius=(1.0, 0.34, 0.32), sss_scale=0.22, trans=0.2, rough=0.5, sheen=0.4,
                 back="#96506a", anther="#46220e", pollen="#b58040", filament="#e8d2c2", stigma="#bd908a"),
    "moonlight": dict(base="#eef0f5", tip="#f9fafc", throat="#dae5ce", deep="#b8cba1", streak="#ccdab8", vein="#c9cde2", vein_mix=0.22, glow="#e2e5f7",
                      sss=0.6, sss_radius=(0.78, 0.82, 1.0), sss_scale=0.3, trans=0.3, rough=0.52, sheen=0.25,
                      back="#e3e6f0", anther="#5a3418", pollen="#b08a4a", filament="#e4edd6", stigma="#bccf9f"),
}
GREENS = dict(stem="#75744a", stem_dark="#555632", leaf="#7b7a45", leaf_dark="#5a5c31", leaf_light="#a19d61", rib="#b9b47c")


def sm(x, a, b):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)


# -------------------------------------------------------------------------------------- materials

def _translucent(m, color, fac, normal=None):
    """Lets light through a thin thing: what makes a petal a petal and not a piece of card."""
    nt = m.nt
    tr = nt.nodes.new("ShaderNodeBsdfTranslucent")
    m._in(tr.inputs["Color"], color)
    if normal is not None:
        nt.links.new(normal, tr.inputs["Normal"])
    mix = nt.nodes.new("ShaderNodeMixShader")
    mix.inputs[0].default_value = fac
    nt.links.new(m.bsdf.outputs[0], mix.inputs[1])
    nt.links.new(tr.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], m.out.inputs["Surface"])


def petal_material(name, pal):
    """
    Across a tepal the mesh's UV runs 0..1 (0.5 the midrib), along it 0 (in the throat) to 1 (the tip).
    The colour deepens into the throat and along the midrib, fine veins run its length, and it is lit
    from within (subsurface) and from behind (translucency).
    """
    m = Mat(name)
    uv = m.coords("UV")
    u, t, _ = m.sep(uv)
    c = m.math("MULTIPLY", m.math("ABSOLUTE", m.math("SUBTRACT", u, 0.5)), 2.0)
    throat = m.math("SUBTRACT", 1.0, m.math("SMOOTHSTEP", t, 0.14, 0.74))
    throat = m.math("MULTIPLY", throat, m.math("SUBTRACT", 1.0, m.math("MULTIPLY", c, 0.4)))
    col = m.mix(m.math("SMOOTHSTEP", t, 0.5, 1.0), pal["base"], pal["tip"])
    col = m.mix(m.math("MULTIPLY", throat, pal.get("throat_mix", 0.9)), col, kit.lin(pal["throat"]))
    deep = m.math("SUBTRACT", 1.0, m.math("SMOOTHSTEP", t, 0.05, 0.36))
    col = m.mix(m.math("MULTIPLY", deep, pal.get("deep_mix", 0.85)), col, kit.lin(pal["deep"]))
    mid = m.math("SUBTRACT", 1.0, m.math("SMOOTHSTEP", c, 0.0, 0.3))
    mid = m.math("MULTIPLY", mid, m.math("SUBTRACT", 1.0, m.math("SMOOTHSTEP", t, 0.3, 0.92)))
    col = m.mix(m.math("MULTIPLY", mid, pal.get("streak_mix", 0.7)), col, kit.lin(pal["streak"]))
    # the veins: fine lines down the length, wandering a little, fading towards the tip and the edge
    wander, _ = m.noise(m.mapping(uv, (2.0, 1.4, 1.0)), 2.0, 2.0, 0.5)
    lines = m.math("SINE", m.math("ADD", m.math("MULTIPLY", u, TAU * 13.0), m.math("MULTIPLY", wander, 9.0)))
    ridge = m.math("SMOOTHSTEP", lines, 0.35, 1.0)
    fade = m.math("MULTIPLY", m.math("SUBTRACT", 1.0, m.math("SMOOTHSTEP", t, 0.55, 1.0)), m.math("SUBTRACT", 1.0, m.math("MULTIPLY", c, 0.5)))
    vein = m.math("MULTIPLY", ridge, fade)
    col = m.mix(m.math("MULTIPLY", vein, pal["vein_mix"]), col, kit.lin(pal["vein"]))
    cells, _ = m.noise(m.coords("Object"), 38.0, 2.0, 0.5)
    soft, _ = m.noise(m.coords("Object"), 1.6, 2.0, 0.5)
    col = m.mix(m.math("MULTIPLY", soft, 0.07), col, kit.lin(pal["throat"]))
    height = m.math("ADD", m.math("MULTIPLY", vein, 0.6), m.math("MULTIPLY", cells, 0.12))
    normal = m.bump(height, 0.4, 0.02)
    m.set(base=col, rough=pal["rough"], sheen=pal["sheen"], sheen_rough=0.5, spec=0.3, normal=normal,
          sss=pal["sss"], sss_radius=pal["sss_radius"], sss_scale=pal["sss_scale"])
    _translucent(m, m.mix(0.5, col, kit.lin(pal["glow"])), pal["trans"], normal)
    return m.mat


def leaf_material(name, color=None, dark=None, light=None, rib=None):
    """A lily's blade leaf: olive, a pale midrib, close parallel veins, a dusty bloom on it."""
    g = GREENS
    m = Mat(name)
    uv = m.coords("UV")
    u, t, _ = m.sep(uv)
    c = m.math("MULTIPLY", m.math("ABSOLUTE", m.math("SUBTRACT", u, 0.5)), 2.0)
    tone, _ = m.noise(m.mapping(uv, (1.5, 3.0, 1.0)), 2.2, 3.0, 0.55)
    col = m.ramp(tone, [(0.15, dark or g["leaf_dark"]), (0.5, color or g["leaf"]), (0.95, light or g["leaf_light"])])
    lines = m.math("SINE", m.math("MULTIPLY", u, TAU * 11.0))
    ridge = m.math("SMOOTHSTEP", lines, 0.5, 1.0)
    col = m.mix(m.math("MULTIPLY", ridge, 0.16), col, kit.lin(light or g["leaf_light"]))
    mid = m.math("SUBTRACT", 1.0, m.math("SMOOTHSTEP", c, 0.0, 0.11))
    col = m.mix(m.math("MULTIPLY", mid, 0.6), col, kit.lin(rib or g["rib"]))
    normal = m.bump(m.math("ADD", m.math("MULTIPLY", ridge, 0.5), mid), 0.3, 0.012)
    m.set(base=col, rough=0.5, sheen=0.35, sheen_rough=0.5, spec=0.35, normal=normal, sss=0.12, sss_radius=(0.5, 1.0, 0.3), sss_scale=0.08)
    _translucent(m, m.mix(0.4, col, kit.lin("#b9c25a")), 0.14, normal)
    return m.mat


def stem_material(name, color=None, dark=None):
    """A lily's stalk: olive, mottled, fine ribs running its length (the tube's UV runs along it and round it)."""
    g = GREENS
    m = Mat(name)
    obj = m.coords("Object")
    along, around, _ = m.sep(m.coords("UV"))
    tone, _ = m.noise(obj, 1.6, 4.0, 0.6)
    col = m.ramp(tone, [(0.3, dark or g["stem_dark"]), (0.7, color or g["stem"])])
    ribs = m.math("SINE", m.math("MULTIPLY", around, TAU * 9.0))
    fine, _ = m.noise(obj, 26.0, 2.0, 0.5)
    col = m.mix(m.math("MULTIPLY", m.math("SMOOTHSTEP", ribs, 0.2, 1.0), 0.14), col, kit.lin(g["rib"]))
    m.set(base=col, rough=0.5, sheen=0.3, spec=0.3, normal=m.bump(m.math("ADD", m.math("MULTIPLY", ribs, 0.5), m.math("MULTIPLY", fine, 0.4)), 0.3, 0.012),
          sss=0.12, sss_radius=(0.5, 1.0, 0.3), sss_scale=0.08)
    return m.mat


def kit_of_materials(colour="ivory", tag=""):
    """Everything a lily in this colourway is made of."""
    pal = PALETTES[colour]
    n = colour + tag
    anther = Mat("anther_" + n)
    grain, _ = anther.noise(anther.coords("Object"), 90.0, 2.0, 0.6)
    blot, _ = anther.noise(anther.coords("Object"), 9.0, 2.0, 0.5)
    anther.set(base=anther.mix(blot, pal["anther"], kit.lin(pal["pollen"])), rough=0.95, sheen=0.0, spec=0.05, normal=anther.bump(grain, 0.7, 0.01))
    fil = Mat("filament_" + n)
    fil.set(base=pal["filament"], rough=0.45, sss=0.4, sss_radius=(0.8, 1.0, 0.4), sss_scale=0.08, spec=0.35)
    stig = Mat("stigma_" + n)
    stig.set(base=pal["stigma"], rough=0.3, coat=0.3, coat_rough=0.2, sss=0.3, sss_scale=0.05)
    return dict(pal=pal, petal=petal_material("petal_" + n, pal), anther=anther.mat, filament=fil.mat, stigma=stig.mat,
                stem=stem_material("stem_" + n), leaf=leaf_material("leaf_" + n), bud=bud_material("bud_" + n, pal))


def bud_material(name, pal):
    """A bud is the backs of its tepals: the flower's colour at the tip, green still at the stalk."""
    m = Mat(name)
    uv = m.coords("UV")
    u, t, _ = m.sep(uv)
    col = m.mix(m.math("SMOOTHSTEP", t, 0.1, 0.75), kit.lin("#8f9a55"), kit.lin(pal["back"]))
    seam = m.math("ABSOLUTE", m.math("SINE", m.math("MULTIPLY", u, math.pi * 3.0)))
    edge = m.math("SUBTRACT", 1.0, m.math("SMOOTHSTEP", seam, 0.0, 0.16))
    col = m.mix(m.math("MULTIPLY", edge, 0.3), col, kit.lin(pal["throat"]))
    lines = m.math("SMOOTHSTEP", m.math("SINE", m.math("MULTIPLY", u, TAU * 30.0)), 0.3, 1.0)
    normal = m.bump(m.math("SUBTRACT", m.math("MULTIPLY", lines, 0.3), edge), 0.25, 0.015)
    m.set(base=col, rough=0.5, sheen=0.3, spec=0.3, normal=normal, sss=0.35, sss_radius=pal["sss_radius"], sss_scale=0.15)
    return m.mat


# ------------------------------------------------------------------------------------------ blades

def ribbon(name, mat, length, hw, alpha, cup, twist=None, side=None, groove=0.0, ruffle=0.0, ruffle_f=2.5, phase=0.0,
           r0=0.0, z0=0.0, thick=0.03, nt=40, nu=13, az=0.0, levels=2, pleat=0.0):
    """
    A blade (a tepal, a leaf) as a surface along a curve in the plane of +X (out from the axis) and +Z.
    `hw(t)` is its half width at t (0 the base, 1 the tip); `alpha(t)` how far the curve has swung
    from straight up towards straight out, in degrees; `cup(t)` how far, in radians, the two edges
    are folded up round the midrib (negative: rolled back); `twist(t)` a turn about its own length;
    `side(t)` a drift sideways; `groove` the depth of the furrow along the midrib; `ruffle` the
    height of the wave in its edge. The whole is then turned `az` about Z and given its thickness.
    """
    verts, faces, uvs = [], [], []
    p = Vector((r0, 0.0, z0))
    prev = None
    rot = Matrix.Rotation(az, 4, "Z")
    hw_max = max(hw(i / nt) for i in range(nt + 1))
    for i in range(nt + 1):
        t = i / nt
        a = math.radians(alpha(t))
        tau = Vector((math.sin(a), 0.0, math.cos(a)))
        if prev is not None:
            p = p + (prev + tau) * 0.5 * (length / nt)
        prev = tau
        nrm = Vector((-math.cos(a), 0.0, math.sin(a)))
        across = Vector((0.0, 1.0, 0.0))
        if twist is not None:
            tw = twist(t)
            across, nrm = across * math.cos(tw) + nrm * math.sin(tw), nrm * math.cos(tw) - across * math.sin(tw)
        c = p + (Vector((0.0, 1.0, 0.0)) * side(t) if side is not None else Vector())
        w = max(hw(t), 0.004 * length)
        k = cup(t)
        env = sm(t, 0.12, 0.5) * (1.0 - 0.45 * sm(t, 0.82, 1.0))
        for j in range(nu):
            u = j / (nu - 1) * 2.0 - 1.0
            if abs(k) < 1e-3:
                x, h = w * u, 0.0
            else:
                x, h = w * math.sin(k * u) / k, w * (1.0 - math.cos(k * u)) / k
            h -= groove * hw_max * min(1.0, 1.3 * w / hw_max) * (1.0 - 0.6 * sm(t, 0.6, 1.0)) * math.exp(-(u / 0.17) ** 2)
            if pleat:
                # the long folds either side of the midrib, deepest in the throat and gone by the tip
                h += pleat * w * (1.0 - 0.8 * sm(t, 0.35, 0.95)) * math.sin(math.pi * 2.5 * abs(u)) ** 2 * (1.0 - abs(u) ** 4)
            if ruffle:
                side_ph = 2.1 if u > 0 else 0.0
                h += ruffle * length * env * abs(u) ** 1.7 * math.sin(TAU * ruffle_f * t + phase + side_ph)
                h += 0.35 * ruffle * length * env * abs(u) ** 3.0 * math.sin(TAU * ruffle_f * 2.3 * t + 1.7 * phase + side_ph)
            verts.append(rot @ (c + across * x + nrm * h))
            uvs.append((u * 0.5 + 0.5, t))
    for i in range(nt):
        for j in range(nu - 1):
            a_ = i * nu + j
            faces.append((a_, a_ + 1, a_ + nu + 1, a_ + nu))
    ob = mesh_obj(name, verts, faces, mat, True, uvs)
    if thick:
        solidify(ob, thick, 0.0)
    if levels:
        subsurf(ob, levels)
    return ob


def tepal_shape(width, a=1.3, b=0.85, claw=0.3):
    """A lily tepal's outline: a narrow claw in the throat, widest a little past the middle, drawn out to a point."""
    peak = a / (a + b)
    top = (peak ** a) * ((1.0 - peak) ** b)

    def hw(t):
        t = min(t, 0.985)
        f = (t ** a) * ((1.0 - t) ** b) / top
        cl = claw * (1.0 - sm(t, 0.0, 0.4))
        return width * (f + cl * (1.0 - f))
    return hw


def tepal(name, mat, length=3.0, width=0.5, az=0.0, a0=6.0, a1=58.0, a2=125.0, open_from=0.1, open_to=0.5, curl_from=0.5, curl_p=1.7,
          cup0=1.25, cup1=0.42, cup2=-0.35, twist=0.0, side=0.0, ruffle=0.022, ruffle_f=2.6, phase=0.0, groove=0.16, r0=0.07, z0=0.0,
          thick=0.03, claw=0.3, nt=44, nu=21, pleat=0.07):
    """One tepal in the flower's own frame: the flower's axis is +Z, its base at the origin."""
    def alpha(t):
        return a0 + (a1 - a0) * sm(t, open_from, open_to) + (a2 - a1) * max(0.0, (t - curl_from) / (1.0 - curl_from)) ** curl_p

    def cup(t):
        return cup0 + (cup1 - cup0) * sm(t, 0.0, 0.45) + (cup2 - cup1) * sm(t, 0.45, 1.0)
    return ribbon(name, mat, length, tepal_shape(width, claw=claw), alpha, cup, twist=lambda t: twist * sm(t, 0.3, 1.0), side=lambda t: side * length * t * t,
                  groove=groove, ruffle=ruffle, ruffle_f=ruffle_f, phase=phase, r0=r0, z0=z0, thick=thick, nt=nt, nu=nu, az=az, pleat=pleat)


# ------------------------------------------------------------------------------------- the flower

def _capsule(name, r, half, mat, seg=14, rings=10):
    """A rounded rod along Z, for an anther's lobe."""
    prof = [(0.0, -half - r)]
    for i in range(1, rings):
        a = math.pi * i / rings
        z = -r * math.cos(a)
        prof.append((r * math.sin(a), z + (half if z > 0 else -half)))
        if i == rings // 2:
            prof.insert(-1, (r, -half))
    prof.append((0.0, half + r))
    return kit.lathe(name, prof, seg, mat)


def bloom(name, mats, length=3.0, seed=1, opened=1.0, curl=1.0, stamens=True):
    """
    The flower, its axis +Z and its base at the origin. `opened` 1 is a flower fully out (0.7 one
    still a trumpet); `curl` scales how far the tips roll back. Returns its parts.
    """
    rnd = random.Random(seed)
    L = length
    parts = []
    for i in range(6):
        inner = i % 2 == 1
        ln = L * (1.0 if inner else 0.96) * rnd.uniform(0.95, 1.05)
        parts.append(tepal(
            "%s_tepal%d" % (name, i), mats["petal"], ln, (0.2 if inner else 0.16) * L * rnd.uniform(0.95, 1.05),
            az=TAU * i / 6.0 + rnd.uniform(-0.06, 0.06),
            a0=rnd.uniform(8.0, 10.5), a1=(56.0 if inner else 62.0) * opened + rnd.uniform(-6.0, 6.0),
            a2=(62.0 * opened) + (rnd.uniform(50.0, 95.0) if inner else rnd.uniform(62.0, 110.0)) * curl,
            open_from=rnd.uniform(0.2, 0.26), open_to=rnd.uniform(0.68, 0.76), curl_from=rnd.uniform(0.56, 0.66), curl_p=rnd.uniform(1.4, 2.0),
            # in the throat each is folded round far enough to close the tube with its neighbours
            cup0=1.45 if inner else 1.4, cup1=rnd.uniform(0.5, 0.7), cup2=rnd.uniform(-0.6, -0.2),
            twist=rnd.uniform(-0.4, 0.4), side=rnd.uniform(-0.05, 0.05),
            ruffle=rnd.uniform(0.016, 0.027) * (1.15 if inner else 0.85), ruffle_f=rnd.uniform(2.2, 3.2), phase=rnd.uniform(0.0, TAU),
            groove=rnd.uniform(0.15, 0.22), r0=(0.027 if inner else 0.037) * L, z0=(-0.04 if inner else -0.05) * L,
            thick=0.0065 * L, claw=0.26 if inner else 0.36))
    if stamens:
        for i in range(6):
            az = TAU * (i + 0.5) / 6.0 + rnd.uniform(-0.2, 0.2)
            ln = L * rnd.uniform(0.6, 0.7)
            b1 = rnd.uniform(16.0, 30.0) * opened
            p = Vector((0.012 * L * math.cos(az), 0.012 * L * math.sin(az), 0.03 * L))
            path = [p.copy()]
            n = 16
            drift = rnd.uniform(-0.25, 0.25)
            for s in range(1, n + 1):
                f = s / n
                b = math.radians(2.0 + (b1 - 2.0) * f ** 1.4)
                a = az + drift * f
                p = p + Vector((math.sin(b) * math.cos(a), math.sin(b) * math.sin(a), math.cos(b))) * (ln / n)
                path.append(p.copy())
            parts.append(tube("%s_filament%d" % (name, i), path, [0.0095 * L * (1.0 - 0.45 * s / n) for s in range(n + 1)], 8, mats["filament"]))
            # the anther: two long lobes side by side, hung by its middle across the filament's tip
            tip, heading = path[-1], (path[-1] - path[-2]).normalized()
            r, half = 0.009 * L, rnd.uniform(0.034, 0.044) * L
            # it lies crosswise, at whatever angle it happened to swing to, and tipped a little
            turn = rnd.uniform(0.0, math.pi)
            ref = Vector((math.cos(az + math.pi / 2), math.sin(az + math.pi / 2), 0.0))
            ref = (ref - heading * ref.dot(heading)).normalized()
            other = heading.cross(ref).normalized()
            long_axis = (ref * math.cos(turn) + other * math.sin(turn) + heading * rnd.uniform(-0.35, 0.35)).normalized()
            x_axis = long_axis.cross(heading).normalized()
            y_axis = long_axis.cross(x_axis).normalized()
            m = Matrix((x_axis, y_axis, long_axis)).transposed().to_4x4()
            m.translation = tip + heading * r * 0.5
            for side_ in (-1.0, 1.0):
                lobe = _capsule("%s_anther%d_%d" % (name, i, int(side_ + 1)), r, half, mats["anther"])
                lobe.matrix_world = m @ Matrix.Translation(Vector((side_ * r * 0.72, 0.0, 0.0)))
                parts.append(lobe)
        # the pistil: a longer style leaning out of the stamens, a three-lobed stigma on it
        az = rnd.uniform(0.0, TAU)
        ln = L * rnd.uniform(0.72, 0.8)
        p = Vector((0.0, 0.0, 0.03 * L))
        path = [p.copy()]
        n = 18
        for s in range(1, n + 1):
            f = s / n
            b = math.radians(1.0 + 10.0 * opened * f ** 1.6)
            p = p + Vector((math.sin(b) * math.cos(az), math.sin(b) * math.sin(az), math.cos(b))) * (ln / n)
            path.append(p.copy())
        parts.append(tube(name + "_style", path, [0.019 * L * (1.0 - 0.3 * s / n) for s in range(n + 1)], 10, mats["filament"]))
        heading = (path[-1] - path[-2]).normalized()
        for k in range(3):
            a = TAU * k / 3.0
            side_dir = Vector((math.cos(a), math.sin(a), 0.0))
            side_dir = (side_dir - heading * side_dir.dot(heading)).normalized()
            lobe = kit.sphere("%s_stigma%d" % (name, k), 0.026 * L, mats["stigma"], 14, 8, 0.8)
            lobe.location = path[-1] + heading * 0.012 * L + side_dir * 0.017 * L
            parts.append(lobe)
    # the receptacle: where six tepals narrow into one green stalk
    prof = [(0.0, -0.24 * L), (0.026 * L, -0.23 * L), (0.03 * L, -0.16 * L), (0.04 * L, -0.09 * L), (0.05 * L, -0.03 * L), (0.05 * L, 0.0), (0.042 * L, 0.03 * L), (0.0, 0.045 * L)]
    rec = kit.lathe(name + "_receptacle", prof, 20, mats["stem"])
    subsurf(rec, 1)
    parts.append(rec)
    return parts


def pose(name, parts, tilt=0.0, heading=0.0, spin=0.0, loc=(0.0, 0.0), lift=0.0, rest=None):
    """
    Leans a flower built upright: its axis `tilt` degrees from straight up, towards `heading` (degrees
    round Z, 0 = +X), turned `spin` about itself first; then rests it on the ground at `loc`.
    """
    root = bpy.data.objects.new(name, None)
    kit.link(root)
    bpy.context.view_layer.update()
    for ob in parts:
        local = ob.matrix_world.copy()
        ob.parent = root
        ob.matrix_parent_inverse = Matrix.Identity(4)
        ob.matrix_basis = local
    h = math.radians(heading)
    root.matrix_world = Matrix.Translation(Vector((loc[0], loc[1], 0.0))) @ Matrix.Rotation(h, 4, "Z") @ Matrix.Rotation(math.radians(tilt), 4, "Y") @ Matrix.Rotation(math.radians(spin) - h, 4, "Z")
    pkit.settle(root, rest or parts, lift)
    return root


def axis_of(root):
    m = root.matrix_world
    return (m.to_3x3() @ Vector((0.0, 0.0, 1.0))).normalized(), m.translation.copy()


def rest_on_blades(root, tepals, from_t=0.5, lift=0.02):
    """
    Lowers a flower that faces up till the open part of its lowest tepal lies on the page, which is how
    it reads from above; its throat then dips below the page (see throat_hole).
    """
    bpy.context.view_layer.update()
    low = 1e9
    for ob in tepals:
        m = ob.matrix_world
        uv = ob.data.uv_layers[0].data
        seen = {}
        for loop in ob.data.loops:
            seen[loop.vertex_index] = uv[loop.index].uv[1]
        for v in ob.data.vertices:
            if seen.get(v.index, 0.0) >= from_t:
                low = min(low, (m @ v.co).z)
    root.location.z += lift - low
    bpy.context.view_layer.update()


def throat_hole(root, r):
    """Where a flower's throat passes through the page, if it dips below it: for pkit.ground(hole=...)."""
    ax, base = axis_of(root)
    if base.z >= 0.0 or ax.z < 0.05:
        return None
    p = base + ax * (-base.z / ax.z)
    return (p.x, p.y, r)


def bezier(p0, p1, p2, p3, n=28):
    out = []
    for i in range(n + 1):
        t = i / n
        out.append(p0 * (1 - t) ** 3 + p1 * 3 * t * (1 - t) ** 2 + p2 * 3 * t * t * (1 - t) + p3 * t ** 3)
    return out


def stalk(name, root, mat, heading, length, length_scale=3.0, r=None, end_r=None, sag=0.0, start=-0.12, to=None):
    """The stalk behind a posed flower: out of the back of the receptacle, down to the ground and along it towards `heading`."""
    L = length_scale
    r = r or 0.025 * L
    end_r = end_r or r * 1.25
    ax, base = axis_of(root)
    p0 = base + ax * start * L
    flat = Vector((p0.x, p0.y, 0.0))
    if to is not None:
        # to a given point on the page (where it joins a stem), not off in a direction
        gap = Vector((to[0], to[1], 0.0)) - flat
        heading, length = math.degrees(math.atan2(gap.y, gap.x)), gap.length
    d = Vector((math.cos(math.radians(heading)), math.sin(math.radians(heading)), 0.0))
    p3 = flat + d * length
    p3.z = end_r
    reach = max(0.5, length * 0.45)
    p1 = p0 - ax * reach
    p2 = p3 - d * reach
    p2.z = end_r + sag
    path = bezier(p0, p1, p2, p3, 40)
    n = len(path) - 1
    wob = Vector((-d.y, d.x, 0.0))
    for i, p in enumerate(path):
        f = i / n
        p += wob * (0.035 * length * math.sin(f * 5.2 + heading) * f * (1.0 - 0.3 * f))
        p.z = max(p.z, end_r)
    radii = [r + (end_r - r) * i / n for i in range(n + 1)]
    return tube(name, path, radii, 14, mat)


def lying_lily(name, mats, loc=(0.0, 0.0), tilt=55.0, heading=0.0, spin=0.0, stalk_to=None, stalk_len=3.0, seed=1, length=3.2, opened=1.0, curl=1.0, face_up=False):
    """A whole flower laid on the page with its stalk. Returns (root, everything it is made of)."""
    parts = bloom(name, mats, length, seed, opened, curl)
    root = pose(name + "_root", parts, tilt, heading, spin, loc, rest=parts[:6])
    if face_up:
        # seen from above, a flower that faces up rests on its open tepals and its throat dips below the page
        rest_on_blades(root, parts[:6])
    objs = list(parts)
    if stalk_len:
        objs.append(stalk(name + "_stalk", root, mats["stem"], heading + 180.0 if stalk_to is None else stalk_to, stalk_len, length))
    return root, objs


def laid(name, ob, loc=(0.0, 0.0), yaw=0.0, roll=0.0, lift=0.004):
    """Lays one blade (a leaf, a loose petal) built along +X on the page: pointing `yaw`, turned `roll` about its length."""
    root = bpy.data.objects.new(name, None)
    kit.link(root)
    ob.parent = root
    root.matrix_world = Matrix.Translation(Vector((loc[0], loc[1], 0.0))) @ Matrix.Rotation(math.radians(yaw), 4, "Z") @ Matrix.Rotation(math.radians(roll), 4, "X")
    pkit.settle(root, [ob], lift)
    return root


def leaf(name, mat, length=3.4, width=0.3, arch=18.0, lift=6.0, twist=0.0, side=0.0, fold=0.55, thick=0.022, curl=0.0):
    """
    A blade leaf lying along +X from the origin: folded a little along its midrib, arching up off the
    ground and coming back down to it, perhaps turning over towards its tip.
    """
    def alpha(t):
        return 90.0 - lift - arch * math.cos(math.pi * t) * (1.0 - 0.3 * t) + curl * t * t

    def cup(t):
        return fold * (1.0 - 0.5 * t)
    hw = tepal_shape(width, a=0.7, b=0.9, claw=0.08)
    return ribbon(name, mat, length, hw, alpha, cup, twist=lambda t: twist * sm(t, 0.15, 1.0), side=lambda t: side * length * t * t,
                  groove=0.22, ruffle=0.006, ruffle_f=1.6, thick=thick, nt=44, nu=9, pleat=0.0)


def loose_petal(name, mat, length=2.4, width=0.42, bow=70.0, cup=0.7, twist=0.3, roll=0.0, seed=1, thick=0.028):
    """A fallen tepal by itself, lying along +X: bowed like a little boat, its tip curled over."""
    rnd = random.Random(seed)

    def alpha(t):
        return 90.0 - bow * 0.5 + bow * t ** 1.3

    def cupf(t):
        return cup * (1.0 - 0.25 * sm(t, 0.0, 0.5)) + roll * sm(t, 0.5, 1.0)
    ph = rnd.uniform(0.0, TAU)
    return ribbon(name, mat, length, tepal_shape(width, claw=0.34), alpha, cupf, twist=lambda t: twist * (t - 0.4), side=lambda t: rnd.choice((1, 1)) * 0.04 * length * t * t,
                  groove=0.16, ruffle=0.02, ruffle_f=2.4, phase=ph, thick=thick, nt=40, nu=13, pleat=0.05)


def bud(name, mats, length=2.2, r=0.3):
    """A bud not yet open: long, three-sided, a furrow where each pair of tepals meets. Its axis is +Z, its base at the origin."""
    seg, rings = 36, 22
    verts, faces, uvs = [], [], []
    for i in range(rings + 1):
        t = i / rings
        rad = r * (0.26 + 0.74 * math.sin(math.pi * min(1.0, t * 1.18) ** 0.8) ** 0.9) * (1.0 - 0.72 * sm(t, 0.62, 1.0))
        for j in range(seg):
            a = TAU * j / seg + 0.5 * t
            lobe = 1.0 - 0.1 * (1.0 - abs(math.sin(1.5 * (a - 0.5 * t)))) ** 3
            verts.append((rad * lobe * math.cos(a), rad * lobe * math.sin(a), t * length))
            uvs.append((j / seg, t))
    for i in range(rings):
        for j in range(seg):
            k = (j + 1) % seg
            faces.append((i * seg + j, i * seg + k, (i + 1) * seg + k, (i + 1) * seg + j))
    faces.append(tuple(range(seg - 1, -1, -1)))
    faces.append(tuple(range(rings * seg, rings * seg + seg)))
    ob = mesh_obj(name, verts, faces, mats["bud"], True, uvs)
    subsurf(ob, 1)
    return [ob]
