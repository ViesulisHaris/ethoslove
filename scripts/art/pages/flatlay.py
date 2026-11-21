"""
The two flat-lays: a phone lying among lilies, seen from above.

    blender --background --factory-startup --python flatlay.py -- --out <dir> [--preview] [--only hero,experience] [--colour ivory,blush]

hero-flatlay-<colour>: the phone at a slight angle on lilies and leaves that spill out from under
it, its screen an empty flat black for a page to lay a live gift over. With it comes
hero-flatlay-<colour>-bezel, the phone alone with its screen cut out, to go back on top of that gift.

experience-flatlay-<colour>: a larger arrangement for a wide band, a polaroid resting on the phone
(its photo's place empty), loose petals about. A page may crop it at the left and the bottom.

The phone and the layout are the same in every colourway; only the flowers change.
"""

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402

import pkit  # noqa: E402
import lilies  # noqa: E402
import things  # noqa: E402

OPT = pkit.cli()
PHONE_Z = 0.22
HIGH = 7.0


def phone_over(w, yaw, screen="#0b0908", screen_mat=None):
    """
    The phone as the camera sees it, and the phone as the light does. A phone pressed down on real
    flowers would have petals standing up through it; so the one that is seen is held well above
    everything (the camera has no perspective: moved back as it is moved up, it is the same picture)
    and throws no shadow, and an unseen copy lying where it seems to lie throws its shadow for it.
    Returns (seen parts, info, root).
    """
    lift = HIGH - PHONE_Z
    back = -lift * pkit.SIN_T / pkit.COS_T
    parts, info = things.phone("phone", w, screen=screen, screen_mat=screen_mat)
    root = things.place("phone_root", parts, (0.0, back, HIGH), yaw=yaw, pitch=0.6, roll=-1.2)
    for ob in parts:
        ob.visible_shadow = False
    ghost, _ = things.phone("phone_ghost", w)
    things.place("phone_ghost_root", ghost[:1], (0.0, 0.0, PHONE_Z), yaw=yaw, pitch=0.6, roll=-1.2)
    for ob in ghost[1:]:
        bpy.data.objects.remove(ob, do_unlink=True)
    ghost[0].visible_camera = False
    ghost[0]["unseen"] = True
    return parts, info, root


def leaves(mats, spec, tag="leaf"):
    out = []
    for i, (x, y, yaw, length, width, twist, side, roll) in enumerate(spec):
        ob = lilies.leaf("%s%d" % (tag, i), mats["leaf"], length, width, arch=11.0, lift=3.0, twist=twist, side=side, fold=0.8, curl=9.0)
        lilies.laid("%s_root%d" % (tag, i), ob, (x, y), yaw, roll)
        out.append(ob)
    return out


def loose(mats, colour, spec):
    out = []
    mat = lilies.petal_material("loose_" + colour, dict(lilies.PALETTES[colour], throat_mix=0.5, deep_mix=0.35, streak_mix=0.4))
    for i, (x, y, yaw, roll, length, bow, cup) in enumerate(spec):
        def alpha(t, bow=bow):
            return 90.0 + bow * 0.5 - bow * t ** 1.2 - 25.0 * lilies.sm(t, 0.72, 1.0)
        ob = lilies.ribbon("loose%d" % i, mat, length, lilies.tepal_shape(length * 0.2, claw=0.1), alpha, lambda t, cup=cup: cup * (1.0 - 0.3 * lilies.sm(t, 0.5, 1.0)),
                           twist=lambda t: 0.4 * (t - 0.35), groove=0.17, ruffle=0.022, ruffle_f=2.4, phase=i * 1.9, thick=0.021, nt=44, nu=21, pleat=0.07)
        lilies.laid("loose_root%d" % i, ob, (x, y), yaw, roll)
        out.append(ob)
    return out


def hero(colour):
    pkit.begin(colour)
    floor = pkit.ground()
    mats = lilies.kit_of_materials(colour)
    objs = []
    # the flowers first, each lying on its side, its stalk running in under where the phone lies
    for (name, loc, tilt, heading, spin, stalk_to, stalk_len, seed, length, opened) in (
            ("lily_a", (-2.5, 1.2), 50.0, 164.0, 30.0, -30.0, 3.0, 12, 5.2, 1.0),
            ("lily_b", (2.0, 3.2), 55.0, 38.0, 80.0, 226.0, 3.2, 7, 4.5, 0.98),
            ("lily_c", (2.6, -2.9), 64.0, -34.0, 15.0, 150.0, 3.0, 23, 3.9, 0.94)):
        _, parts = lilies.lying_lily(name, mats, loc, tilt, heading, spin, stalk_to, stalk_len, seed, length, opened)
        objs += parts
    objs += leaves(mats, (
        (0.6, 3.5, 152.0, 6.4, 0.5, 0.5, -0.3, 8.0),
        (-1.6, -0.9, 206.0, 4.6, 0.42, 0.7, 0.2, 10.0),
        (-1.1, -2.2, 232.0, 5.4, 0.46, -0.5, -0.26, -8.0),
        (1.6, -0.2, -16.0, 5.3, 0.44, -0.7, -0.3, -10.0),
        (0.8, -3.6, -64.0, 5.6, 0.48, 0.6, 0.26, 8.0)))
    bud = lilies.bud("bud", mats, 2.3, 0.3)
    root = lilies.pose("bud_root", bud, 80.0, 252.0, 0.0, (-0.9, -5.0))
    objs += bud + [lilies.stalk("bud_stalk", root, mats["stem"], 70.0, 2.8, 2.4, r=0.055, start=0.06)]
    parts, info, proot = phone_over(4.3, 14.0)
    objs += parts
    pkit.rig(OPT)
    shot = pkit.frame(objs, 1560, pad=(0.5, 0.5, 1.3, 1.3), opt=OPT, piece="hero-flatlay")
    corners = things.world_corners(proot, info)
    meta = {"piece": "hero-flatlay", "colourway": colour, "long": 1400,
            "screen": dict(pkit.area(shot, corners, things.SCREEN_BOX, info["radius"], info["width"]), fill="#0b0908")}
    scr = info["screen"]
    black, hole = scr.data.materials[0], things.holdout()

    def cut():
        scr.data.materials[0] = hole

    def uncut():
        scr.data.materials[0] = black
    pkit.shoot("hero-flatlay-" + colour, OPT["out"], objs, floor, shot, meta=meta, extra=[("bezel", parts, cut, uncut)])


def experience(colour):
    pkit.begin(colour)
    mats = lilies.kit_of_materials(colour)
    objs = []
    # the big flower at the bottom left looks straight up at the viewer; the others lie on their sides
    front, parts = lilies.lying_lily("lily_a", mats, (-4.3, -2.3), 20.0, -110.0, 50.0, 12.0, 3.6, 7, 5.4, 1.0, 1.0, face_up=True)
    objs += parts
    floor = pkit.ground(lilies.throat_hole(front, 1.5))
    for (name, loc, tilt, heading, spin, stalk_to, stalk_len, seed, length, opened) in (
            ("lily_b", (2.6, 4.2), 58.0, 50.0, 20.0, 232.0, 3.6, 12, 4.5, 0.97),
            ("lily_c", (-2.7, 3.4), 64.0, 140.0, 70.0, -40.0, 3.0, 23, 4.0, 0.92)):
        _, parts = lilies.lying_lily(name, mats, loc, tilt, heading, spin, stalk_to, stalk_len, seed, length, opened)
        objs += parts
    objs += leaves(mats, (
        (1.6, -3.6, -50.0, 5.2, 0.36, 0.6, 0.2, 8.0),
        (1.9, -1.0, -14.0, 4.2, 0.32, -0.7, -0.2, -10.0),
        (-1.8, -4.2, 232.0, 4.4, 0.34, 0.6, 0.16, 8.0),
        (-0.8, 4.2, 104.0, 3.8, 0.3, -0.5, 0.14, -6.0),
        (-2.0, 0.9, 172.0, 3.6, 0.3, 0.6, -0.16, 10.0)))
    objs += loose(mats, colour, ((5.3, 0.9, 32.0, 20.0, 1.9, 70.0, 1.2), (4.7, -3.2, 150.0, -30.0, 1.6, 50.0, 1.0), (-6.2, 1.5, 200.0, 60.0, 1.7, 95.0, 1.25)))
    parts, info, proot = phone_over(4.9, 16.0, screen_mat=things.glow_screen("screen_glow"))
    objs += parts
    # the polaroid lies on the phone's glass (and so is held up with it); its shadow falls on the glass
    lift = HIGH - PHONE_Z
    back = -lift * pkit.SIN_T / pkit.COS_T
    top = HIGH + info["size"][2]
    pparts, pinfo = things.polaroid("polaroid", 4.2)
    pol = things.place("polaroid_root", pparts, (0.05, 0.5 + back, top + 0.03), yaw=8.0, pitch=0.6, roll=-1.2)
    w_, h_, _ = pinfo["size"]
    shade = things.soft_shadow("polaroid_shade", w_ * 1.12, h_ * 1.1, 0.16, 0.62)
    things.place("polaroid_shade_root", [shade], (0.05 + 0.13, 0.5 + back - 0.16, top + 0.015), yaw=8.0, pitch=0.6, roll=-1.2)
    for ob in pparts:
        ob.visible_shadow = False
    objs += pparts + [shade]
    pkit.rig(OPT)
    shot = pkit.frame(objs, 1980, pad=(0.5, 0.5, 1.3, 1.3), opt=OPT, piece="experience-flatlay")
    meta = {"piece": "experience-flatlay", "colourway": colour, "long": 1800,
            "photo": dict(pkit.area(shot, things.world_corners(pol, pinfo), (400, 400), pinfo["radius"], pinfo["width"]), fill="#3d2f29"),
            "screen": dict(pkit.area(shot, things.world_corners(proot, info), things.SCREEN_BOX, info["radius"], info["width"]), fill="#3e2318")}
    pkit.shoot("experience-flatlay-" + colour, OPT["out"], objs, floor, shot, meta=meta)


def main():
    random.seed(4)
    for colour in OPT["colour"]:
        for which in (OPT["only"] or ["hero", "experience"]):
            (hero if which == "hero" else experience)(colour)


main()
