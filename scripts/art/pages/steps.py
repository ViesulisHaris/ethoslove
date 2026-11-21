"""
The three small pictures of "how to send a gift": bold, simple shapes that still read at 140 px.

    blender --background --factory-startup --python steps.py -- --out <dir> [--preview] [--only photo,note,send,phone]

step-photo   a polaroid lying slightly turned on another, its photo's place empty (a page lays a photo into it)
step-note    a sheet of cream letter paper with a fold line and a lifted corner, blank (a page writes on it), a fountain pen beside it
step-send    a small phone, a sealed cream envelope with a wine wax seal on its screen
step-phone   the same phone from the same camera with nothing on its screen (a flat dark fill), for a page to lay
             any gift's cover into; with it step-phone-bezel, the phone alone with its screen cut out, to go back on top
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import pkit  # noqa: E402
import things  # noqa: E402
from kit import Mat  # noqa: E402

OPT = pkit.cli()
PAD = (0.3, 0.3, 0.7, 0.7)


def photo():
    pkit.begin()
    floor = pkit.ground()
    under, _ = things.polaroid("under", 3.0, photo="#57463d")
    things.place("under_root", under, (0.22, -0.2, 0.0), yaw=7.0)
    top, info = things.polaroid("polaroid", 3.0)
    root = things.place("polaroid_root", top, (0.0, 0.0, 0.03), yaw=-7.0, pitch=0.5)
    objs = under + top
    pkit.rig(OPT)
    shot = pkit.frame(objs, 540, pad=PAD, opt=OPT, piece="step-photo")
    meta = {"piece": "step-photo", "long": 480, "photo": dict(pkit.area(shot, things.world_corners(root, info), (400, 400), info["radius"], info["width"]), fill="#3d2f29")}
    pkit.shoot("step-photo", OPT["out"], objs, floor, shot, meta=meta)


def note():
    pkit.begin()
    floor = pkit.ground()
    card, info = things.letter_sheet("card", 3.7, 2.55)
    root = things.place("card_root", card, (0.0, 0.0, 0.0), yaw=-7.0)
    pen = things.fountain_pen("pen", 3.3)
    things.place("pen_root", pen, (1.5, -1.25, 0.0), yaw=38.0)
    objs = card + pen
    pkit.rig(OPT)
    shot = pkit.frame(objs, 540, pad=PAD, opt=OPT, piece="step-note")
    box = (300, round(300 / info["aspect"]))
    meta = {"piece": "step-note", "long": 480, "card": dict(pkit.area(shot, things.world_corners(root, info), box, 0.0, info["width"]), fill="#fce2c4"), "shadow": 1.35}
    pkit.shoot("step-note", OPT["out"], objs, floor, shot, meta=meta)


def send():
    pkit.begin()
    floor = pkit.ground()
    glow = Mat("screen_blush")
    glow.set(base="#e9b0aa", rough=0.5, emit="#e9aca6", emit_strength=0.45, spec=0.2)
    phone, info = things.phone("phone", 2.7, screen_mat=glow.mat)
    things.place("phone_root", phone, (0.0, 0.0, 0.0), yaw=-5.0)
    env = things.envelope("envelope", 2.1, 1.46)
    things.place("envelope_root", env, (0.0, 0.25, info["size"][2] + 0.012), yaw=4.0)
    objs = phone + env
    pkit.rig(OPT)
    shot = pkit.frame(objs, 540, pad=PAD, opt=OPT, piece="step-send")
    pkit.shoot("step-send", OPT["out"], objs, floor, shot, meta={"piece": "step-send", "long": 480})


def phone():
    """step-send's phone, just as it lies there, with an empty screen. It is held (frames.json) to step-send's frame and rectangle."""
    pkit.begin()
    floor = pkit.ground()
    parts, info = things.phone("phone", 2.7)
    root = things.place("phone_root", parts, (0.0, 0.0, 0.0), yaw=-5.0)
    pkit.rig(OPT)
    shot = pkit.frame(parts, 540, pad=PAD, opt=OPT, piece="step-phone")
    meta = {"piece": "step-phone", "long": 480,
            "screen": dict(pkit.area(shot, things.world_corners(root, info), things.SCREEN_BOX, info["radius"], info["width"]), fill="#0b0908")}
    scr = info["screen"]
    black, hole = scr.data.materials[0], things.holdout()

    def cut():
        scr.data.materials[0] = hole

    def uncut():
        scr.data.materials[0] = black
    pkit.shoot("step-phone", OPT["out"], parts, floor, shot, meta=meta, extra=[("bezel", parts, cut, uncut)])


def main():
    for which in (OPT["only"] or ["photo", "note", "send", "phone"]):
        {"photo": photo, "note": note, "send": send, "phone": phone}[which]()


main()
