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
    "open": dict(seed=7, sink=True, tilt=16.0, heading=-65.0, spin=20.0, stalk=205.0, stalk_len=3.9, opened=1.0, curl=1.0),
    "three-quarter": dict(seed=12, sink=False, tilt=52.0, heading=218.0, spin=75.0, stalk=32.0, stalk_len=2.9, opened=0.97, curl=0.9),
    "side": dict(seed=23, sink=False, tilt=78.0, heading=158.0, spin=10.0, stalk=-16.0, stalk_len=2.8, opened=0.92, curl=0.95),
}


def build(view, colour):
    v = VIEWS[view]
    pkit.begin(colour)
    mats = lilies.kit_of_materials(colour)
    root, objs = lilies.lying_lily("lily", mats, (0.0, 0.0), v["tilt"], v["heading"], v["spin"], v["stalk"], v["stalk_len"], v["seed"], 3.2, v["opened"], v["curl"], face_up=v["sink"])
    floor = pkit.ground(lilies.throat_hole(root, 0.9))
    pkit.rig(OPT)
    return floor, objs


def v_shadow(view):
    # the one lying on its side stands tallest off the page; its shadow is eased so the three sit alike
    return 0.85 if view == "side" else 1.0


def main():
    for colour in OPT["colour"]:
        for view in (OPT["only"] or list(VIEWS)):
            floor, objs = build(view, colour)
            shot = pkit.frame(objs, 1000, opt=OPT)
            pkit.shoot("lily-%s-%s" % (view, colour), OPT["out"], objs, floor, shot, meta={"piece": "lily-" + view, "colourway": colour, "long": 900, "shadow": v_shadow(view)})


main()
