"""
A clapboard cottage in the snow, for the scenes that have a house in them. Lengths are in metres.
"""

import math

from mathutils import Vector

import kit
from kit import TAU, box, emissive, lathe, parent, plain, sphere
import props
from winter import kit_darken, snow_material


def siding(name, color, board=0.17):
    """Painted clapboard: boards running along the wall, each casting a line of shadow on the one below, the paint a little uneven."""
    m = kit.Mat(name)
    x, y, z = m.sep(m.coords("Object"))
    t = m.math("FRACT", m.math("DIVIDE", z, board))
    idx = m.math("FLOOR", m.math("DIVIDE", z, board))
    wn = m.node("ShaderNodeTexWhiteNoise")
    wn.noise_dimensions = "1D"
    m._in(wn.inputs["W"], idx)
    n, _ = m.noise(m.comb(m.math("MULTIPLY", x, 0.6), m.math("MULTIPLY", z, 6.0), 0.0), 3.0, 4.0, 0.6)
    tone = m.math("ADD", m.math("MULTIPLY", wn.outputs["Value"], 0.5), m.math("MULTIPLY", n, 0.5))
    col = m.mix(m.math("MULTIPLY", tone, 0.35), color, kit_darken(color, 0.72))
    lap = m.math("LESS_THAN", t, 0.1)
    col = m.mix(m.math("MULTIPLY", lap, 0.55), col, kit_darken(color, 0.35))
    m.set(base=col, rough=0.62, normal=m.bump(m.math("SUBTRACT", t, lap), 0.5, 0.02))
    return m.mat


def _at(ob, loc):
    ob.location = Vector(loc)
    return ob


def window(name, cx, cz, w, h, y, trim, dim, lit_mat=None, shutters=None, snow=None):
    """
    A sash window on a wall facing -Y at depth `y`: trim, a pane that barely glows, glazing bars, a sill with snow on it.
    Returns (parts, lit) where `lit` is the same pane lit from inside, for the layer that is the lights being on.
    """
    parts = []
    parts.append(_at(box(name + "_trim", (w + 0.22, 0.08, h + 0.22), trim, cz - h / 2 - 0.11, 0.01, 1), (cx, y - 0.02, 0)))
    parts.append(_at(box(name + "_pane", (w, 0.04, h), dim, cz - h / 2), (cx, y - 0.05, 0)))
    parts.append(_at(box(name + "_bar_v", (0.04, 0.05, h), trim, cz - h / 2), (cx, y - 0.075, 0)))
    parts.append(_at(box(name + "_bar_h", (w, 0.05, 0.04), trim, cz - 0.02), (cx, y - 0.075, 0)))
    parts.append(_at(box(name + "_sill", (w + 0.36, 0.2, 0.07), trim, cz - h / 2 - 0.18, 0.01, 1), (cx, y - 0.1, 0)))
    if snow is not None:
        lump = lathe(name + "_sillsnow", [(0.0, 0.0), (0.5, 0.0), (0.48, 0.05), (0.3, 0.09), (0.0, 0.1)], 16, snow)
        lump.scale = ((w + 0.3), 0.22, 1.0)
        parts.append(_at(lump, (cx, y - 0.1, cz - h / 2 - 0.11)))
    if shutters is not None:
        for side in (-1, 1):
            parts.append(_at(box(name + "_shutter%d" % side, (w * 0.42, 0.05, h + 0.1), shutters, cz - h / 2 - 0.05, 0.01, 1), (cx + side * (w / 2 + 0.11 + w * 0.21), y - 0.03, 0)))
    lit = None
    if lit_mat is not None:
        lit = _at(box(name + "_lit", (w, 0.02, h), lit_mat, cz - h / 2), (cx, y - 0.062, 0))
    return parts, lit


def cottage(name, origin, colors, w=5.2, wall_h=5.4, rise=2.6, depth=6.0, porch=True):
    """
    A tall clapboard cottage, its gable to the road (-Y): siding, white trim, a deep roof under snow, sash windows,
    a porch with its own little gable, a wreath on the door, a chimney. Built round the middle of its front wall's foot.
    `colors` is (walls, trim, door, shutters). Returns (parts, lit_parts, info): `lit_parts` are the windows lit from
    inside, and `info` has the roof's and the porch's edges (for a string of lights) and where the windows are.
    """
    walls, trim_c, door_c, shut_c = colors
    hw = w / 2
    snow = snow_material(name + "_snow")
    side = siding(name + "_siding", walls)
    trim = plain(name + "_trim", trim_c, 0.5)
    parts, lit = [], []
    # the gable wall, the side walls, the stone it stands on
    parts.append(kit.mesh_obj(name + "_front", [(-hw, 0, 0), (hw, 0, 0), (hw, 0, wall_h), (0, 0, wall_h + rise), (-hw, 0, wall_h)], [(0, 1, 2, 3, 4)], side, smooth=False))
    for s in (-1, 1):
        parts.append(kit.mesh_obj(name + "_side%d" % s, [(s * hw, 0, 0), (s * hw, depth, 0), (s * hw, depth, wall_h), (s * hw, 0, wall_h)], [(0, 1, 2, 3)], side, smooth=False))
        parts.append(_at(box(name + "_corner%d" % s, (0.16, 0.16, wall_h), trim, 0.0), (s * hw, -0.02, 0)))
    stone = kit.Mat(name + "_stone")
    sn, _ = stone.noise(stone.coords("Object"), 5.0, 4.0, 0.6)
    stone.set(base=stone.ramp(sn, [(0.3, "#4a4a4e"), (0.7, "#8a8880")]), rough=0.9, normal=stone.bump(sn, 0.5, 0.03))
    parts.append(_at(box(name + "_footing", (w + 0.12, 0.2, 0.45), stone.mat, 0.0), (0, -0.04, 0)))
    # the roof: two slabs meeting at the ridge, deep in snow, with white boards along the gable
    over, front = 0.4, 0.55
    slope = rise / hw
    e_z = wall_h - over * slope
    ridge = wall_h + rise
    roof_mat = plain(name + "_shingle", "#2a2a30", 0.8)
    for s in (-1, 1):
        ex = s * (hw + over)
        a, b = Vector((ex, -front, e_z)), Vector((0, -front, ridge))
        c, d = Vector((0, depth + 0.3, ridge)), Vector((ex, depth + 0.3, e_z))
        up = Vector((s * slope, 0, 1)).normalized()
        slab = kit.mesh_obj(name + "_roof%d" % s, [a, b, c, d, a + up * 0.14, b + up * 0.14, c + up * 0.14, d + up * 0.14], [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], roof_mat, smooth=False)
        parts.append(slab)
        # the snow lying on it, thicker towards the eave where it has slid, soft at its edges
        n = 14
        sv, sf = [], []
        for j in range(n + 1):
            for i in range(n + 1):
                u, v = i / n, j / n
                p = a.lerp(b, u).lerp(d.lerp(c, u), v) + up * 0.14
                thick = 0.26 + 0.12 * (1 - u) + 0.05 * math.sin(v * 9.0 + u * 4.0)
                sv.append(p + up * thick + Vector((s * 0.1 * (1 - u), -0.08 * (1 - v), 0)))
        for j in range(n):
            for i in range(n):
                q = j * (n + 1) + i
                sf.append((q, q + 1, q + n + 2, q + n + 1))
        blanket = kit.mesh_obj(name + "_roofsnow%d" % s, sv, sf, snow, True)
        kit.solidify(blanket, 0.3, 0.0)
        kit.subsurf(blanket, 1)
        parts.append(blanket)
        # the board along the gable's edge
        length = (b - a).length
        board = box(name + "_barge%d" % s, (length, 0.06, 0.2), trim, -0.2)
        board.location = (a + b) / 2 + Vector((0, -0.02, 0.1))
        board.rotation_euler = (0, -math.atan2(b.z - a.z, b.x - a.x), 0)
        parts.append(board)
    # a chimney
    brick = kit.Mat(name + "_brick")
    bx, by, bz = brick.sep(brick.coords("Object"))
    course = brick.math("LESS_THAN", brick.math("FRACT", brick.math("DIVIDE", bz, 0.09)), 0.14)
    bn, _ = brick.noise(brick.coords("Object"), 14.0, 2.0, 0.5)
    brick.set(base=brick.mix(course, brick.ramp(bn, [(0.3, "#6a2e22"), (0.7, "#8a4030")]), "#b8b0a4"), rough=0.85)
    parts.append(_at(box(name + "_chimney", (0.75, 0.75, ridge + 0.9 - wall_h), brick.mat, wall_h), (hw * 0.5, depth * 0.55, 0)))
    parts.append(_at(box(name + "_chimneysnow", (0.9, 0.9, 0.16), snow, ridge + 0.9, 0.07, 3), (hw * 0.5, depth * 0.55, 0)))
    # the windows: two down, two up, a round one under the peak
    dim = emissive(name + "_dim", "#3a4460", 0.25)
    warm = emissive(name + "_warm", "#ffb65c", 2.6)
    shut = plain(name + "_shutter", shut_c, 0.6)
    spots = [(-hw * 0.64, 1.75, 0.95, 1.4, True), (hw * 0.64, 1.75, 0.95, 1.4, True), (-hw * 0.5, 4.25, 0.9, 1.3, False), (hw * 0.5, 4.25, 0.9, 1.3, False)]
    for k, (cx, cz, ww, hh, sh) in enumerate(spots):
        p, l = window("%s_win%d" % (name, k), cx, cz, ww, hh, 0.0, trim, dim, warm, shut if sh else None, snow)
        parts += p
        lit.append(l)
    attic = lathe(name + "_attic", [(0.0, 0.0), (0.34, 0.0), (0.34, 0.05), (0.42, 0.05), (0.42, 0.1), (0.0, 0.1)], 28, trim)
    attic.rotation_euler = (math.radians(90), 0, 0)
    attic.location = (0, 0.02, wall_h + rise * 0.42)
    parts.append(attic)
    for (mat, target, yy) in ((dim, parts, -0.07), (warm, lit, -0.085)):
        pane = lathe(name + "_atticpane%d" % len(target), [(0.0, 0.0), (0.33, 0.0)], 28, mat)
        pane.rotation_euler = (math.radians(90), 0, 0)
        pane.location = (0, yy, wall_h + rise * 0.42)
        target.append(pane)
    # the door, its steps, a wreath
    door = plain(name + "_door", door_c, 0.42, coat=0.3)
    parts.append(_at(box(name + "_doortrim", (1.24, 0.08, 2.32), trim, 0.38, 0.01, 1), (0, -0.02, 0)))
    parts.append(_at(box(name + "_doorleaf", (1.0, 0.07, 2.1), door, 0.42, 0.01, 1), (0, -0.05, 0)))
    for (px, pz, pw, ph) in ((-0.24, 1.75, 0.34, 0.6), (0.24, 1.75, 0.34, 0.6), (-0.24, 0.95, 0.34, 0.8), (0.24, 0.95, 0.34, 0.8)):
        parts.append(_at(box(name + "_panel%d" % len(parts), (pw, 0.03, ph), door, pz - ph / 2, 0.02, 2), (px, -0.085, 0.42)))
    parts.append(_at(sphere(name + "_knob", 0.045, kit.gold(name + "_brass", "#e0b860", 0.25), 12, 8), (0.38, -0.12, 1.45)))
    for k, (sw, sz) in enumerate(((1.9, 0.0), (1.6, 0.2))):
        parts.append(_at(box(name + "_step%d" % k, (sw, 0.9 - 0.3 * k, 0.21), stone.mat, sz, 0.02, 1), (0, -0.5 + 0.15 * k, 0)))
    needles = props.needle_material(name + "_wreath_needles", "#143a20", "#2f6b3a")
    ring_v, ring_f = [], []
    seg, tube_seg, R, r0 = 36, 10, 0.27, 0.085
    for i in range(seg):
        a = TAU * i / seg
        for j in range(tube_seg):
            b = TAU * j / tube_seg
            rr = R + r0 * math.cos(b) * (1 + 0.25 * math.sin(i * 7.0 + j))
            ring_v.append((rr * math.cos(a), -r0 * math.sin(b), rr * math.sin(a)))
    for i in range(seg):
        for j in range(tube_seg):
            ring_f.append((i * tube_seg + j, ((i + 1) % seg) * tube_seg + j, ((i + 1) % seg) * tube_seg + (j + 1) % tube_seg, i * tube_seg + (j + 1) % tube_seg))
    wreath = kit.mesh_obj(name + "_wreath", ring_v, ring_f, needles, True)
    kit.displace(wreath, 0.05, 0.1)
    wreath.location = (0, -0.13, 1.95)
    parts.append(wreath)
    ribbon = kit.satin(name + "_bow", "#c21e1e")
    for s in (-1, 1):
        loop = sphere(name + "_bowloop%d" % s, 0.085, ribbon, 12, 8, 0.6)
        loop.location = (s * 0.08, -0.2, 1.7)
        parts.append(loop)
    info = {"windows": [(cx, cz) for (cx, cz, _, _, _) in spots], "porch": []}
    # where a string of lights would hang: just under the gable's boards, from eave to ridge to eave
    info["gable"] = [Vector((-(hw + over), -front - 0.06, e_z - 0.16)), Vector((0, -front - 0.06, ridge - 0.2)), Vector((hw + over, -front - 0.06, e_z - 0.16))]
    if porch:
        pw, py, pz, pr = 1.25, 1.25, 2.72, 0.62
        for s in (-1, 1):
            parts.append(_at(box(name + "_post%d" % s, (0.13, 0.13, pz - 0.42), trim, 0.42), (s * (pw - 0.12), -py + 0.1, 0)))
            a, b = Vector((s * (pw + 0.18), -py - 0.12, pz - 0.1)), Vector((0, -py - 0.12, pz + pr))
            c, d = Vector((0, 0, pz + pr)), Vector((s * (pw + 0.18), 0, pz - 0.1))
            parts.append(kit.mesh_obj(name + "_porchroof%d" % s, [a, b, c, d], [(0, 1, 2, 3)], roof_mat, smooth=False))
            up = Vector((s * pr / pw, 0, 1)).normalized()
            pv = [a + up * 0.1, b + up * 0.1, c + up * 0.1, d + up * 0.1]
            ps = kit.mesh_obj(name + "_porchsnow%d" % s, pv, [(0, 1, 2, 3)], snow, True)
            kit.solidify(ps, 0.18, 0.0)
            parts.append(ps)
            length = (b - a).length
            board = box(name + "_porchbarge%d" % s, (length, 0.05, 0.14), trim, -0.14)
            board.location = (a + b) / 2 + Vector((0, -0.02, 0.05))
            board.rotation_euler = (0, -math.atan2(b.z - a.z, b.x - a.x), 0)
            parts.append(board)
        parts.append(kit.mesh_obj(name + "_pediment", [(-pw, -py, pz - 0.1), (pw, -py, pz - 0.1), (0, -py, pz + pr - 0.08)], [(0, 1, 2)], side, smooth=False))
        info["porch"] = [Vector((-(pw + 0.18), -py - 0.18, pz - 0.24)), Vector((0, -py - 0.18, pz + pr - 0.16)), Vector((pw + 0.18, -py - 0.18, pz - 0.24))]
    parent(parts + lit, name + "_pivot", origin)
    info["gable"] = [Vector(origin) + p for p in info["gable"]]
    info["porch"] = [Vector(origin) + p for p in info["porch"]]
    info["windows"] = [(origin[0] + cx, origin[1], origin[2] + cz) for (cx, cz) in info["windows"]]
    return parts, lit, info
