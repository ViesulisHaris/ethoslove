"""
What falls from a lily: four loose petals, each curled and lying its own way, and two blade leaves.

    blender --background --factory-startup --python petals.py -- --out <dir> [--preview] [--only petal-1,leaf-2] [--colour ivory,blush]

Makes petal-1..4-<colour> and leaf-1, leaf-2 (leaves are the same green whatever the flower's colour,
so they are made once, with the first colourway asked for).
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import pkit  # noqa: E402
import lilies  # noqa: E402

OPT = pkit.cli()

# bow: how far it bends along its length (positive: a boat, its ends up; negative: a bridge, its ends down).
# roll: turned about its own length (so it lies on an edge); yaw: which way it points on the page.
PETALS = {
    "petal-1": dict(length=2.5, width=0.52, bow=78.0, cup=1.25, twist=0.35, tip=0.7, roll=14.0, yaw=28.0, seed=3),
    "petal-2": dict(length=2.2, width=0.46, bow=-56.0, cup=-1.0, twist=-0.5, tip=-0.3, roll=-16.0, yaw=142.0, seed=5),
    "petal-3": dict(length=2.4, width=0.48, bow=105.0, cup=1.3, twist=0.25, tip=0.9, roll=66.0, yaw=-38.0, seed=8),
    "petal-4": dict(length=1.9, width=0.42, bow=44.0, cup=1.0, twist=1.0, tip=0.5, roll=-34.0, yaw=205.0, seed=11),
}
LEAVES = {
    "leaf-1": dict(length=4.6, width=0.34, arch=17.0, lift=5.0, twist=0.7, side=0.1, fold=0.85, curl=12.0, yaw=24.0, roll=10.0),
    "leaf-2": dict(length=3.7, width=0.3, arch=24.0, lift=8.0, twist=-1.7, side=-0.22, fold=0.95, curl=26.0, yaw=205.0, roll=-14.0),
}


def petal(pid, colour):
    p = PETALS[pid]
    pkit.begin(colour)
    floor = pkit.ground()
    # a fallen petal shows less of the throat's colour than one in the flower: only its narrow foot
    mat = lilies.petal_material("loose_" + colour, dict(lilies.PALETTES[colour], throat_mix=0.5, deep_mix=0.35, streak_mix=0.4))
    bow = p["bow"]

    def alpha(t):
        return 90.0 + bow * 0.5 - bow * t ** 1.2 - 40.0 * p["tip"] * lilies.sm(t, 0.72, 1.0)

    def cup(t):
        return p["cup"] * (1.0 - 0.3 * lilies.sm(t, 0.5, 1.0))
    ob = lilies.ribbon(pid, mat, p["length"], lilies.tepal_shape(p["width"], claw=0.1), alpha, cup,
                       twist=lambda t: p["twist"] * (t - 0.35), side=lambda t: 0.05 * p["length"] * t * t,
                       groove=0.17, ruffle=0.022, ruffle_f=2.4, phase=p["seed"] * 1.3, thick=0.021, nt=44, nu=21, pleat=0.07)
    lilies.laid(pid + "_root", ob, (0.0, 0.0), p["yaw"], p["roll"])
    pkit.rig(OPT)
    return floor, [ob]


def leaf(pid):
    p = LEAVES[pid]
    pkit.begin()
    floor = pkit.ground()
    mat = lilies.leaf_material("leaf")
    ob = lilies.leaf(pid, mat, p["length"], p["width"], p["arch"], p["lift"], p["twist"], p["side"], p["fold"], curl=p["curl"])
    lilies.laid(pid + "_root", ob, (0.0, 0.0), p["yaw"], p["roll"])
    pkit.rig(OPT)
    return floor, [ob]


def main():
    only = OPT["only"] or (list(PETALS) + list(LEAVES))
    for i, colour in enumerate(OPT["colour"]):
        for pid in only:
            if pid in PETALS:
                floor, objs = petal(pid, colour)
                shot = pkit.frame(objs, 420, pad=(0.4, 0.4, 0.9, 0.9), opt=OPT)
                pkit.shoot("%s-%s" % (pid, colour), OPT["out"], objs, floor, shot, meta={"piece": pid, "colourway": colour, "long": 360})
            elif pid in LEAVES and i == 0:
                floor, objs = leaf(pid)
                shot = pkit.frame(objs, 800, pad=(0.4, 0.4, 0.9, 0.9), opt=OPT)
                pkit.shoot(pid, OPT["out"], objs, floor, shot, meta={"piece": pid, "long": 700})


main()
