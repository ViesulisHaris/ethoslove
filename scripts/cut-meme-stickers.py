"""Cut meme stickers out of sticker sheets as die-cut WebPs: transparent ground, white edge, 2x.

    python3 scripts/cut-meme-stickers.py <folder with the sheets> <out folder> [memes|scraps] [sheet ...]

A sheet is a flat-coloured page of cut-outs (the kind people post on Pinterest). The ground is
flooded in from the borders, what is left is labelled blob by blob, and CATALOGUE below says which
blob of which sheet becomes which sticker: (index, box, close). `box` splits two stickers that
touch; `close` is how wide a leak to seal when white fur let the ground colour in. Run it with a
new sheet and an empty pick list first: it prints every blob's index and box.

Two sets: `memes` (public/memes, the animals, with a white die-cut edge) and `scraps` (public/scraps,
the flowers, kisses, paper and lace the collage templates are made of, mostly without one). A pick
may also carry `edge` (the white edge in source pixels, 0 for none) and `key` (cut by colour instead
of by flood, for lace and doilies whose holes must stay holes), and `holes`: ground trapped inside the
cut-out in patches of at least this many source pixels is cut away too, while smaller specks stay.
That is the eye of a satin bow's loop, where `key` would also punch through every pale highlight.

Needs Pillow only. src/templates/_shared/memes/catalogue.ts and _shared/collage/scraps.ts list the
sizes. Leave out film, game and brand characters: the three meme templates ship these
files to paying customers.

A sheet that is itself a finished collage (every sticker laid over torn paper, no flat ground to
flood) goes in COLLAGE instead: a round thing is cut by its `circle` (centre and radius), anything
else by colour, `keep` naming which pixels belong to it and `seeds` where it is. Sheets missing
from the folder are skipped, so one new sheet can be cut without the rest to hand.

A sticker laid on a busy collage has no flat ground to flood in from, so RINGED cuts it from the
inside instead: a flood from a point in the middle of it that stops at its own white die-cut edge,
then the usual sealing and a fresh white edge. Name sheets after the set to cut only those.
"""
import sys, json, os
from collections import deque
from PIL import Image, ImageFilter, ImageChops, ImageDraw

IMG = sys.argv[1]
OUT = sys.argv[2]
SET = sys.argv[3] if len(sys.argv) > 3 else "memes"
ONLY = set(sys.argv[4:])
os.makedirs(OUT, exist_ok=True)

def segment(path, tol):
    im = Image.open(path).convert("RGB"); W, H = im.size; px = im.load()
    corners = [px[2, 2], px[W - 3, 2], px[2, H - 3], px[W - 3, H - 3]]
    bg = tuple(sorted(c[i] for c in corners)[1] for i in range(3))
    def is_bg(x, y):
        r, g, b = px[x, y]
        return abs(r - bg[0]) <= tol and abs(g - bg[1]) <= tol and abs(b - bg[2]) <= tol
    back = bytearray(W * H); q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if is_bg(x, y) and not back[y * W + x]: back[y * W + x] = 1; q.append((x, y))
    for y in range(H):
        for x in (0, W - 1):
            if is_bg(x, y) and not back[y * W + x]: back[y * W + x] = 1; q.append((x, y))
    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < W and 0 <= ny < H and not back[ny * W + nx] and is_bg(nx, ny):
                back[ny * W + nx] = 1; q.append((nx, ny))
    label = [0] * (W * H); comps = []
    for y0 in range(H):
        for x0 in range(W):
            i = y0 * W + x0
            if back[i] or label[i]: continue
            n = len(comps) + 1; label[i] = n; q.append((x0, y0))
            minx = maxx = x0; miny = maxy = y0; area = 0
            while q:
                x, y = q.popleft(); area += 1
                minx = min(minx, x); maxx = max(maxx, x); miny = min(miny, y); maxy = max(maxy, y)
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1), (x + 1, y + 1), (x - 1, y - 1), (x + 1, y - 1), (x - 1, y + 1)):
                    if 0 <= nx < W and 0 <= ny < H:
                        j = ny * W + nx
                        if not back[j] and not label[j]: label[j] = n; q.append((nx, ny))
            comps.append({"id": n, "box": [minx, miny, maxx + 1, maxy + 1], "area": area})
    big = [c for c in comps if c["area"] > 1500]
    return im, label, big, bg, is_bg

def inside(im, seed, box, pale=222):
    """The region round `seed`, inside `box`, that stops at near-white: a sticker's own white edge."""
    W, H = im.size; px = im.load(); x0, y0, x1, y1 = box
    def white(x, y):
        r, g, b = px[x, y]
        return min(r, g, b) > pale and max(r, g, b) - min(r, g, b) < 26
    label = bytearray(W * H); q = deque([seed]); label[seed[1] * W + seed[0]] = 1
    minx = maxx = seed[0]; miny = maxy = seed[1]; area = 0
    while q:
        x, y = q.popleft(); area += 1
        minx = min(minx, x); maxx = max(maxx, x); miny = min(miny, y); maxy = max(maxy, y)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if x0 <= nx < x1 and y0 <= ny < y1 and not label[ny * W + nx] and not white(nx, ny):
                label[ny * W + nx] = 1; q.append((nx, ny))
    return label, {"id": 1, "box": [minx, miny, maxx + 1, maxy + 1], "area": area}

def largest(mask, w, h):
    """Keep the biggest 8-connected blob of a 0/1 bytearray mask."""
    seen = bytearray(w * h); best = []; q = deque()
    for s in range(w * h):
        if not mask[s] or seen[s]: continue
        seen[s] = 1; q.append(s); blob = []
        while q:
            i = q.popleft(); blob.append(i); x, y = i % w, i // w
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1), (x + 1, y + 1), (x - 1, y - 1), (x + 1, y - 1), (x - 1, y + 1)):
                if 0 <= nx < w and 0 <= ny < h:
                    j = ny * w + nx
                    if mask[j] and not seen[j]: seen[j] = 1; q.append(j)
        if len(blob) > len(best): best = blob
    out = bytearray(w * h)
    for i in best: out[i] = 1
    return out

EDGE = 5   # the white die-cut edge, in source pixels
CLOSE = 5  # how wide a leak the closing seals, in source pixels
SCALE = 2

def cut(im, label, comp, bg, is_bg, name, box=None, close=None, edge=None, key=False, holes=0):
    CLOSE_R = CLOSE if close is None else close
    EDGE_R = EDGE if edge is None else edge
    W, H = im.size
    x0, y0, x1, y1 = box or comp["box"]
    pad = EDGE_R + CLOSE_R + 6
    X0, Y0, X1, Y1 = max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad)
    w, h = X1 - X0, Y1 - Y0
    mask = bytearray(w * h)
    for y in range(max(y0, Y0), min(y1, Y1)):
        row = y * W
        for x in range(max(x0, X0), min(x1, X1)):
            if label[row + x] == comp["id"]: mask[(y - Y0) * w + (x - X0)] = 1
    if box: mask = largest(mask, w, h)
    if key:
        # Lace and doilies: whatever is the ground colour is a hole, enclosed or not.
        for y in range(h):
            for x in range(w):
                if mask[y * w + x] and is_bg(X0 + x, Y0 + y): mask[y * w + x] = 0
    crop = im.crop((X0, Y0, X1, Y1)).convert("RGBA")
    # Ground colour trapped inside the sticker (between an arm and a body) reads as a grey patch; a real
    # die-cut sticker is white there.
    cpx = crop.load()
    if bg != (255, 255, 255):
        # Only flat, sizeable patches of the exact ground colour are trapped ground; light fur that
        # merely passes near that grey is fur, and stays as it was photographed.
        def flat(x, y):
            r, g, b, _ = cpx[x, y]
            return abs(r - bg[0]) <= 5 and abs(g - bg[1]) <= 5 and abs(b - bg[2]) <= 5 and abs(r - g) <= 3 and abs(g - b) <= 3
        seen = bytearray(w * h)
        for s0 in range(w * h):
            if seen[s0] or not mask[s0] or not flat(s0 % w, s0 // w): continue
            seen[s0] = 1; q = deque([s0]); blob = []
            while q:
                i = q.popleft(); blob.append(i); x, y = i % w, i // w
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        j = ny * w + nx
                        if mask[j] and not seen[j] and flat(nx, ny): seen[j] = 1; q.append(j)
            if len(blob) >= 140:
                for i in blob: cpx[i % w, i // w] = (255, 255, 255, 255)
    m = Image.frombytes("L", (w, h), bytes(v * 255 for v in mask))
    # White fur the ground colour leaked into: seal the thin channels (a closing), then fill whatever
    # is no longer reachable from outside.
    if not key:
        if CLOSE_R: m = m.filter(ImageFilter.MaxFilter(CLOSE_R * 2 + 1)).filter(ImageFilter.MinFilter(CLOSE_R * 2 + 1))
        padded = Image.new("L", (w + 2, h + 2), 0); padded.paste(m, (1, 1))
        ImageDraw.floodfill(padded, (0, 0), 128)
        m = padded.crop((1, 1, w + 1, h + 1)).point(lambda v: 0 if v == 128 else 255)
    mpx = m.load()
    if bg != (255, 255, 255):
        for y in range(h):
            for x in range(w):
                if mpx[x, y] and not mask[y * w + x] and is_bg(X0 + x, Y0 + y): cpx[x, y] = (255, 255, 255, 255)
    if holes:
        # The page seen through a loop: a patch of ground this big is a hole, a pale highlight is not.
        seen = bytearray(w * h)
        for s0 in range(w * h):
            x, y = s0 % w, s0 // w
            if seen[s0] or not mpx[x, y] or not is_bg(X0 + x, Y0 + y): continue
            seen[s0] = 1; q = deque([s0]); blob = []
            while q:
                i = q.popleft(); blob.append(i); x, y = i % w, i // w
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        j = ny * w + nx
                        if not seen[j] and mpx[nx, ny] and is_bg(X0 + nx, Y0 + ny): seen[j] = 1; q.append(j)
            if len(blob) >= holes:
                for i in blob: mpx[i % w, i // w] = 0
    inner = m if key else m.filter(ImageFilter.MinFilter(3))         # drop the JPEG fringe
    edge = m.filter(ImageFilter.MaxFilter(EDGE_R * 2 + 1)) if EDGE_R else None   # the white edge
    big = (w * SCALE, h * SCALE)
    crop = crop.resize(big, Image.LANCZOS)
    inner = inner.resize(big, Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.8))
    if edge is not None: edge = edge.resize(big, Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.1))
    crop = crop.filter(ImageFilter.UnsharpMask(radius=1.4, percent=60, threshold=2))
    out = Image.new("RGBA", big, (255, 255, 255, 0))
    if edge is not None:
        white = Image.new("RGBA", big, (255, 255, 255, 255)); white.putalpha(edge)
        out.alpha_composite(white)
    crop.putalpha(inner)
    out.alpha_composite(crop)
    bbox = out.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    out = out.crop(bbox)
    out.save(f"{OUT}/{name}.webp", "WEBP", quality=88, alpha_quality=92, method=6)
    return out.size

MEMES = {
    "2.jpg": (14, {
        "shark-baby": (1, None), "matcha": (4, None), "glasses-tulips": (3, None), "bow-kitten": (6, None),
        "lawyer": (7, None), "whiskers": (8, None, 13), "shades": (10, None, 11), "scream": (12, None),
        "crying-phone": (11, [246, 837, 486, 1003]), "wink": (0, [552, 43, 729, 273]),
    }),
    "5.jpg": (14, {
        "tulips": (2, None), "round": (4, None, 16), "shark": (5, None), "blush": (6, None, 18), "giggle": (7, None, 10),
        "crying-tulips": (3, [205, 287, 368, 597]), "angry": (3, [8, 597, 300, 928]),
    }),
    "3.jpg": (9, {
        "party-kitten": (0, None), "hamster-cake": (1, None), "puppies": (2, None), "sad-hamster": (4, None),
        "party-yell": (5, None), "balloon-cat": (6, None), "rat": (7, None), "puppy": (8, None),
        "hamster-slice": (10, None), "ferrets": (9, [255, 609, 517, 946]), "green-hat-kitten": (9, [538, 609, 664, 946]),
    }),
}

SCRAPS = {
    "26.jpg": (12, {
        "lily-pink": (2, None, None, 2), "hibiscus-pink": (1, None, None, 2), "lily-stargazer": (3, None, None, 2), "blossom-pale": (4, None, 8, 2),
        "blossom-gold": (5, None, None, 2), "hibiscus-coral": (6, None, None, 2), "sakura": (7, None, 8, 2), "lily-blush": (8, None, None, 2),
        "hibiscus-ruffle": (9, None, None, 2), "plumeria-pink": (12, [250, 1018, 497, 1292], None, 2), "plumeria-rose": (12, [483, 1018, 730, 1292], None, 2),
    }),
    "24.jpg": (10, {
        "blue-spray": (0, [6, 8, 236, 450], 8, 0), "blue-velvet": (0, [230, 8, 458, 224], None, 0), "blue-rose": (1, None, None, 0), "blue-clematis": (2, None, None, 0),
        "blue-lily": (4, None, None, 0), "blue-pansy": (5, None, None, 0), "blue-hibiscus": (6, None, None, 0), "blue-gerbera": (8, None, None, 0),
        "blue-cluster": (9, None, 6, 0), "blue-poppy": (10, None, 8, 0),
    }),
    "27.jpg": (10, {
        "kiss-red": (10, None, None, 0), "cats-cuddle": (11, None, 8, 3), "cats-nose": (9, None, 6, 3),
        "paper-couple": (5, None, None, 0), "heart-print": (13, None, None, 0), "heart-print-pink": (16, None, None, 0), "star-felt": (23, None, None, 0),
        "teddy": (6, None, 6, 3), "heart-anatomical": (17, None, None, 0),
    }),
    "28.jpg": (10, {
        "kiss-1": (0, None, None, 0), "kiss-2": (6, None, None, 0), "kiss-3": (12, None, None, 0), "kiss-dark": (13, None, None, 0),
        "plaster-heart": (2, None, None, 0), "cats-kiss": (14, [493, 520, 668, 814], 8, 3),
    }),
    "29.jpg": (10, {
        "dried-flowers": (0, None, None, 0), "peony-kraft": (6, None, None, 0), "columbine": (7, None, None, 0), "bow-red": (9, None, None, 0),
        "leaf-skeleton": (10, None, None, 0), "locket": (12, None, 6, 0), "wax-seal": (14, None, None, 0), "roses-kraft": (15, None, None, 0),
        "envelope-ps": (17, None, None, 0), "plaid-heart": (5, None, None, 0), "kiss-4": (3, None, None, 0),
    }),
    "30.jpg": (10, {
        "doily-red": (1, None, 0, 0, True), "bow-gingham": (0, None, None, 0), "tag-tofrom": (2, None, None, 0), "label-ornate": (3, None, None, 0),
        "heart-damask": (8, None, 0, 0, True), "doily-pink": (9, None, 0, 0, True), "lace-red": (7, None, 0, 0, True),
    }),
    # The owner's "love stickers" sheet: only the plain objects on it (a satin bow, two felt stars).
    "59.jpg": (12, {
        "bow-satin-blush": (1, None, 1, 2), "star-felt-plump": (24, None, 1, 0), "star-felt-tilted": (30, None, 1, 0),
    }),
    # Red-and-cream love stickers (Photo Booth). Only the photographed objects: the lettering, the
    # character and brand pieces, the drawings and the animals on this sheet stay on it.
    "56.jpg": (10, {
        "teddy-hug": (23, None, 6, 3), "penguins-plush": (8, [495, 117, 632, 250], 6, 3), "wax-seal-heart": (26, None, None, 0),
        "envelopes-pair": (53, None, None, 0), "heart-puffy": (4, None, None, 0), "heart-gingham": (30, None, None, 0),
        "tulips-wrapped": (60, None, 6, 0), "sunflowers-kraft": (12, None, None, 0),
    }),
    # The Music Box vanity: only the photographed things on these two sheets. Their painted swans,
    # doves, ballerinas and bottles, the branded bottles and the printed slogans stay where they are.
    "61.jpg": (10, {
        "wax-seal-hibiscus": (15, None, None, 0), "bow-satin-pink": (17, None, None, 0, False, 50), "bow-satin-mini": (21, None, None, 0, False, 20),
        "paper-script": (3, None, None, 0), "paper-roses": (4, None, None, 0), "paper-blossom": (12, None, None, 0),
    }),
    "62.jpg": (10, {
        "wax-seal-swans": (4, None, None, 0), "fan-lace": (15, None, None, 0),
    }),
    # The owner's Halloween collage (Spooky Season): the photographed things only. Its skeleton
    # lovers, skull and sunglassed ghosts are drawings and stay on it; the two maple leaves touch,
    # so they are cut by colour in COLLAGE.
    "halloween-collage.webp": (10, {
        "moon": (2, None, None, 0), "cat-walk": (4, None, None, 0), "candle-amber": (5, None, None, 0), "cat-pumpkin": (6, None, None, 0),
        "book-coffee": (8, None, None, 0), "cookie-cat": (12, None, None, 0), "coffee-cup": (13, None, None, 0), "sign-pumpkins": (14, None, None, 0),
        "pumpkins-round": (15, None, None, 0), "star-charm": (0, None, None, 0),
    }),
    # Dark Romance: the photographed things. The painted rose and dove, the embroidered heart and the
    # small painted heart under the dagger stay on the sheet.
    "dark-romance.jpg": (11, {
        "heart-sculpture": (0, None, None, 0), "butterfly-wine": (2, None, None, 0), "letters-quill": (5, None, None, 0), "brooch-heart": (7, None, None, 0),
        "cards-spades": (8, None, None, 0), "crow-feathers": (9, None, None, 0), "brooch-heart-silver": (10, None, None, 0), "orchid-wine": (11, [8, 822, 206, 1142], None, 0),
        "amaryllis": (11, [204, 818, 456, 990], None, 0), "die": (12, None, None, 0), "wax-seal-flower": (13, None, None, 0), "candles-melted": (14, None, None, 0),
    }),
    "red-flowers.jpg": (10, {
        "orchid-spray-wine": (0, None, None, 0), "hibiscus-wine": (1, None, None, 0), "magnolia-wine": (2, None, None, 0), "hibiscus-velvet": (3, None, None, 0),
        "rose-oxblood": (4, None, None, 0), "ranunculus-plum": (5, [4, 488, 238, 708], None, 0), "hibiscus-ruffle-wine": (5, [236, 490, 490, 710], None, 0),
        "sunflower-wine": (5, [486, 476, 676, 668], None, 0), "poppy-wine": (7, None, None, 0), "dahlia-wine": (6, [224, 716, 440, 932], None, 0),
        "tulip-parrot-wine": (6, [433, 686, 676, 936], None, 0), "cosmos-chocolate": (8, None, None, 0), "carnation-picotee": (9, None, None, 0), "lily-wine": (10, None, None, 0),
    }),
    # The black things: not the branded polish, coffin box, shoes or the titled spell book, not the
    # white teacup or the open book, whose white the ground would eat, and not the spider, which sits
    # on a patch of white web.
    "goth-black.jpg": (10, {
        "web": (0, None, None, 0), "rose-ember": (2, None, None, 0), "heart-pillow-black": (3, None, None, 0), "vial-blood": (4, None, None, 0),
        "rose-black": (5, None, None, 0), "coffin": (6, None, None, 0), "heart-batwing": (9, None, None, 0), "butterfly-black": (10, None, None, 0),
        "key-skeleton": (11, None, None, 0), "key-ornate": (12, None, None, 0), "cassette": (14, None, None, 0), "rose-black-small": (15, None, None, 0),
        "moth": (18, None, None, 0), "bat-plush": (17, None, None, 0), "skull": (19, None, None, 0), "cat-black": (20, None, None, 0),
        "mask-lace": (22, None, None, 0, False, 12), "bow-lace-black": (25, None, None, 0), "lantern": (26, None, None, 0),
        "apple-black": (28, None, None, 0), "crow": (29, None, None, 0), "butterfly-black-wide": (30, None, None, 0), "button-black": (33, None, None, 0),
        "lollipop-heart": (37, None, None, 0), "rose-black-large": (38, None, None, 0), "candle-bow": (39, None, None, 0), "bow-black-small": (40, None, None, 0),
        "key-black": (42, None, None, 0, False, 30), "chess-king": (34, None, None, 0),
    }),
    # The cosy autumn sheet is nearly all paintings (and a beagle, a camera brand, a campground's
    # badge): only its real maple leaf and the engraved charm are cut.
    "autumn-cozy.jpg": (10, {
        "leaf-maple-gold": (1, None, None, 0), "charm-with-love": (14, None, None, 0),
    }),
}

def pinks_and_greens(r, g, b):
    """Pink petals and green leaves, and not the pale pink paper they are stuck on."""
    hi, lo = max(r, g, b), min(r, g, b)
    sat = (hi - lo) / hi if hi else 0
    return (g > r + 6 and g > b + 4 and sat > 0.12) or (r - g > 45 and sat > 0.2)

def _hsv(r, g, b):
    import colorsys
    return colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)

def crimsons(r, g, b):
    """A red maple leaf, and not the orange one it overlaps."""
    h, s, v = _hsv(r, g, b)
    return s > 0.35 and v > 0.22 and (h < 0.03 or h > 0.93)

def ambers(r, g, b):
    """An orange maple leaf, its brown spots and gold veins, and not the red one on top of it."""
    h, s, v = _hsv(r, g, b)
    return s > 0.3 and v > 0.18 and 0.035 <= h <= 0.17

KEEP = {"pinks-and-greens": pinks_and_greens, "crimsons": crimsons, "ambers": ambers}

# The owner's "happy birthday" collage (Digicam): the disco ball and the tulips. Its camera is a
# branded one and its lily is a painting, so neither is cut; the envelope runs off the page.
# `avoid`: corners of the box where the pink paper is as pink as a petal.
COLLAGE = {
    "58.jpg": {
        "disco-ball-silver": {"circle": (511.8, 235.3, 51.8), "edge": 2},
        "tulips-pink": {"box": (175, 1000, 420, 1300), "seeds": [(300, 1150), (395, 1067)], "keep": "pinks-and-greens", "avoid": [(352, 1218, 420, 1300), (352, 1000, 420, 1013)], "close": 4, "edge": 2},
    },
    # The two maple leaves on the Halloween collage overlap, so each is cut by its own colour.
    "halloween-collage.webp": {
        "leaf-maple-orange": {"box": (198, 488, 566, 808), "seeds": [(380, 660), (300, 600), (470, 700)], "keep": "ambers", "close": 4, "edge": 0},
        "leaf-maple-red": {"box": (452, 426, 670, 606), "seeds": [(560, 500), (600, 470)], "keep": "crimsons", "close": 4, "edge": 0},
    },
}

# Stickers on a busy collage, cut from the inside: (a point inside it, a box round it, the white edge).
RINGED = {
    # 54.webp: the two glossy resin stars on the blue gingham, for Picnic.
    "54.webp": {"star-glossy": ((335, 760), (230, 660, 440, 850), 5), "star-glossy-small": ((462, 845), (385, 760, 540, 920), 5)},
}

def collage_segment(path, pick):
    """The one sticker `pick` names, as a labelled mask `cut` can take: blob 1, on no ground."""
    im = Image.open(path).convert("RGB"); W, H = im.size; px = im.load()
    label = [0] * (W * H)
    if "circle" in pick:
        cx, cy, r = pick["circle"]
        box = [int(cx - r) - 1, int(cy - r) - 1, int(cx + r) + 2, int(cy + r) + 2]
        for y in range(box[1], box[3]):
            for x in range(box[0], box[2]):
                if (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r: label[y * W + x] = 1
    else:
        box = list(pick["box"]); keep = KEEP[pick["keep"]]; avoid = pick.get("avoid", [])
        x0, y0, x1, y1 = box; w = x1 - x0; h = y1 - y0
        m = Image.new("L", (w, h), 0); mp = m.load()
        for y in range(h):
            for x in range(w):
                X, Y = x0 + x, y0 + y
                if keep(*px[X, Y]) and not any(a <= X < c and b <= Y < d for a, b, c, d in avoid): mp[x, y] = 255
        # Seal the petal edges a highlight broke before choosing what is joined to the seeds.
        c = pick.get("close", 3)
        m = m.filter(ImageFilter.MaxFilter(c * 2 + 1)).filter(ImageFilter.MinFilter(c * 2 + 1)); mp = m.load()
        seen = bytearray(w * h); q = deque()
        for sx, sy in pick["seeds"]:
            i = (sy - y0) * w + (sx - x0); seen[i] = 1; q.append((sx - x0, sy - y0))
        while q:
            x, y = q.popleft(); label[(y + y0) * W + x + x0] = 1
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and mp[nx, ny] > 127:
                    seen[ny * w + nx] = 1; q.append((nx, ny))
    return im, label, {"id": 1, "box": box}, (255, 255, 255), lambda x, y: False

CATALOGUE = SCRAPS if SET == "scraps" else MEMES
sizes = {}
for sheet, (tol, picks) in CATALOGUE.items():
    if ONLY and sheet not in ONLY: continue
    if not os.path.exists(f"{IMG}/{sheet}"): print("no sheet", sheet); continue
    im, label, comps, bg, is_bg = segment(f"{IMG}/{sheet}", tol)
    for name, pick in picks.items():
        k, box = pick[0], pick[1]
        sizes[name] = cut(im, label, comps[k], bg, is_bg, name, box, pick[2] if len(pick) > 2 else None, pick[3] if len(pick) > 3 else None, bool(pick[4]) if len(pick) > 4 else False, pick[5] if len(pick) > 5 else 0)
        print(name, sizes[name])
for sheet, picks in (COLLAGE if SET == "scraps" else {}).items():
    if ONLY and sheet not in ONLY: continue
    if not os.path.exists(f"{IMG}/{sheet}"): print("no sheet", sheet); continue
    for name, pick in picks.items():
        im, label, comp, bg, is_bg = collage_segment(f"{IMG}/{sheet}", pick)
        sizes[name] = cut(im, label, comp, bg, is_bg, name, None, 0 if "circle" in pick else 2, pick.get("edge"))
        print(name, sizes[name])
json.dump(sizes, open(f"{OUT}/sizes.json", "w"), indent=1)
for sheet, picks in (RINGED if SET == "scraps" else {}).items():
    if ONLY and sheet not in ONLY: continue
    if not os.path.exists(f"{IMG}/{sheet}"): print("no sheet", sheet); continue
    im = Image.open(f"{IMG}/{sheet}").convert("RGB")
    for name, (seed, box, edge) in picks.items():
        label, comp = inside(im, seed, box)
        sizes[name] = cut(im, label, comp, (255, 255, 255), lambda x, y: False, name, None, 2, edge)
        print(name, sizes[name])
json.dump(sizes, open(f"{OUT}/sizes.json", "w"), indent=1)

# A contact sheet on two grounds, to judge the cut-outs.
names = sorted(sizes)
cell = 300; cols = 6; rows = (len(names) + cols - 1) // cols
sheet = Image.new("RGB", (cols * cell, rows * cell), (0, 0, 0))
for i, n in enumerate(names):
    tile = Image.new("RGB", (cell, cell), (246, 160, 190) if (i + i // cols) % 2 == 0 else (38, 40, 60))
    s = Image.open(f"{OUT}/{n}.webp"); s.thumbnail((cell - 30, cell - 30), Image.LANCZOS)
    tile.paste(s, ((cell - s.width) // 2, (cell - s.height) // 2), s)
    sheet.paste(tile, ((i % cols) * cell, (i // cols) * cell))
sheet.save(f"{OUT}/contact.png")
print("contact", sheet.size)
