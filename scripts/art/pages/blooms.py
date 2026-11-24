"""
The single lilies: one bloom seen from three sides, each with a short piece of its stalk.

    blender --background --factory-startup --python blooms.py -- --out <dir> [--preview] [--only open,side] [--colour ivory,blush]

Makes lily-open-<colour>, lily-three-quarter-<colour> and lily-side-<colour> (the picture, its
shadow and a .json each); pack.mjs then makes the files a page uses.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import pkit  # noqa: E402
import lilies  # noqa: E402

OPT = pkit.cli()

# How each is leant: the axis `tilt` degrees from straight up, towards `heading`; where its stalk runs off to.
VIEWS = {
    # the open one is seen flat on, where a tepal shows all its face: broader, finer at the edge, more relief in it
    "open": dict(seed=7, sink=True, tilt=16.0, heading=-65.0, spin=20.0, stalk=205.0, stalk_len=3.9, opened=1.0, curl=1.0,
                 shape=dict(broad=1.09, edge=0.72, relief=1.12), look=dict(relief=0.5, vein_gain=1.15)),
    "three-quarter": dict(seed=12, sink=False, tilt=52.0, heading=218.0, spin=75.0, stalk=32.0, stalk_len=2.9, opened=0.97, curl=0.9),
    "side": dict(seed=23, sink=False, tilt=78.0, heading=158.0, spin=10.0, stalk=-16.0, stalk_len=2.8, opened=0.92, curl=0.95),
}


def build(view, colour):
    v = VIEWS[view]
    pkit.begin(colour)
    mats = lilies.kit_of_materials(colour, **v.get("look", {}))
    root, objs = lilies.lying_lily("lily", mats, (0.0, 0.0), v["tilt"], v["heading"], v["spin"], v["stalk"], v["stalk_len"], v["seed"], 3.2, v["opened"], v["curl"], face_up=v["sink"], **v.get("shape", {}))
    if "shape" in v:
        # reshaped since it was first framed: brought back inside the frame the page already knows
        tepals = objs[:6]
        pkit.fit("lily-" + view, root, objs, rest=(lambda r: lilies.rest_on_blades(r, tepals)) if v["sink"] else None, grow=False)
    floor = pkit.ground(lilies.throat_hole(root, 0.9))
    pkit.rig(OPT)
    return floor, objs


def v_shadow(view):
    # A single flower's shadow sits it on the page and no more: a third lighter than a flat-lay's (and
    # thrown from higher, see the shoot). The one lying on its side stands tallest off the page, so
    # its shadow is eased further for the three to sit alike.
    return 0.5 if view == "side" else 0.66


def main():
    for colour in OPT["colour"]:
        for view in (OPT["only"] or list(VIEWS)):
            floor, objs = build(view, colour)
            shot = pkit.frame(objs, 1000, opt=OPT, piece="lily-" + view)
            pkit.shoot("lily-%s-%s" % (view, colour), OPT["out"], objs, floor, shot, meta={"piece": "lily-" + view, "colourway": colour, "long": 900, "shadow": v_shadow(view)}, shadow_at=pkit.SHORT_SHADOW)


main()
