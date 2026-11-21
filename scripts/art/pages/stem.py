"""
The tall lily: one long stem lying on the page, two open blooms and a bud at its head, long leaves
down its length. It is made to lean in from the right edge of a page: its foot is at the bottom
right, its head up and to the left.

    blender --background --factory-startup --python stem.py -- --out <dir> [--preview] [--colour ivory,blush]
"""

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mathutils import Vector  # noqa: E402

import pkit  # noqa: E402
import kit  # noqa: E402
import lilies  # noqa: E402

OPT = pkit.cli()
HEAD = Vector((-0.3, 3.6, 0.0))


def build(colour):
    pkit.begin(colour)
    floor = pkit.ground()
    mats = lilies.kit_of_materials(colour)
    objs = []
    r0, r1 = 0.15, 0.085
    path = lilies.bezier(Vector((3.3, -9.6, r0)), Vector((3.7, -4.2, r0)), Vector((0.3, -1.2, r1)), Vector((HEAD.x, HEAD.y, r1)), 64)
    n = len(path) - 1
    objs.append(kit.tube("stem", path, [r0 + (r1 - r0) * i / n for i in range(n + 1)], 16, mats["stem"]))
    for (name, loc, tilt, heading, spin, seed, length, opened) in (
            ("lily_a", (-2.5, 5.5), 56.0, 142.0, 30.0, 12, 4.7, 1.0),
            ("lily_b", (1.7, 6.0), 58.0, 52.0, 80.0, 7, 4.3, 0.97)):
        root, parts = lilies.lying_lily(name, mats, loc, tilt, heading, spin, None, 0.0, seed, length, opened)
        objs += parts + [lilies.stalk(name + "_stalk", root, mats["stem"], 0.0, 0.0, length, to=HEAD)]
    bud = lilies.bud("bud", mats, 2.5, 0.32)
    loc = (-0.9, 7.0)
    root = lilies.pose("bud_root", bud, 80.0, 104.0, 0.0, loc)
    objs += bud + [lilies.stalk("bud_stalk", root, mats["stem"], 0.0, 0.0, 2.4, r=0.055, start=0.06, to=HEAD)]
    # where the three stalks leave the stem: a small swelling that takes their ends in
    node = kit.sphere("node", 0.17, mats["stem"], 20, 10, 0.8)
    node.location = Vector((HEAD.x, HEAD.y, 0.12))
    objs.append(node)
    # the leaves, alternately left and right, shorter towards the head
    rnd = random.Random(5)
    for i, f in enumerate((0.13, 0.25, 0.36, 0.47, 0.57, 0.67, 0.76, 0.85, 0.93)):
        side = 1 if i % 2 == 0 else -1
        k = int(f * n)
        p, t = path[k], (path[k + 1] - path[k - 1])
        yaw = math.degrees(math.atan2(t.y, t.x)) + side * rnd.uniform(30.0, 58.0)
        length = (5.6 - 2.6 * f) * rnd.uniform(0.88, 1.1)
        ob = lilies.leaf("leaf%d" % i, mats["leaf"], length, rnd.uniform(0.36, 0.44), arch=rnd.uniform(9.0, 16.0), lift=3.0, twist=side * rnd.uniform(0.2, 1.0),
                         side=side * rnd.uniform(0.08, 0.3), fold=rnd.uniform(0.7, 0.95), curl=rnd.uniform(6.0, 14.0))
        lilies.laid("leaf_root%d" % i, ob, (p.x, p.y), yaw, side * rnd.uniform(3.0, 14.0))
        objs.append(ob)
    pkit.rig(OPT)
    return floor, objs


def main():
    for colour in OPT["colour"]:
        floor, objs = build(colour)
        shot = pkit.frame(objs, 1760, pad=(0.5, 0.5, 1.2, 1.0), opt=OPT, piece="lily-stem-tall")
        pkit.shoot("lily-stem-tall-" + colour, OPT["out"], objs, floor, shot, meta={"piece": "lily-stem-tall", "colourway": colour, "long": 1600})


main()
