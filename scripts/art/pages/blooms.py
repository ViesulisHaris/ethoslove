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
    pkit.begin()
    mats = lilies.kit_of_materials(colour)
    parts = lilies.bloom("lily", mats, 3.2, v["seed"], v["opened"], v["curl"])
    # it rests on its tepals: seen from above, the throat of a flower that faces up dips below the page
    root = lilies.pose("lily_root", parts, v["tilt"], v["heading"], v["spin"], rest=parts[:6])
    if v["sink"]:
        lilies.rest_on_blades(root, parts[:6])
    floor = pkit.ground(lilies.throat_hole(root, 0.9))
    stem = lilies.stalk("lily_stalk", root, mats["stem"], v["stalk"], v["stalk_len"])
    pkit.rig(OPT)
    return floor, parts + [stem]


def main():
    for colour in OPT["colour"]:
        for view in (OPT["only"] or list(VIEWS)):
            floor, objs = build(view, colour)
            shot = pkit.frame(objs, 1000, opt=OPT)
            pkit.shoot("lily-%s-%s" % (view, colour), OPT["out"], objs, floor, shot, meta={"piece": "lily-" + view, "colourway": colour, "long": 900})


main()
