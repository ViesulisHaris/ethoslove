"""Cut meme stickers out of sticker sheets as die-cut WebPs: transparent ground, white edge, 2x.

    python3 scripts/cut-meme-stickers.py <folder with the sheets> <out folder>

A sheet is a flat-coloured page of cut-outs (the kind people post on Pinterest). The ground is
flooded in from the borders, what is left is labelled blob by blob, and CATALOGUE below says which
blob of which sheet becomes which sticker: (index, box, close). `box` splits two stickers that
touch; `close` is how wide a leak to seal when white fur let the ground colour in. Run it with a
new sheet and an empty pick list first: it prints every blob's index and box.

Needs Pillow only. The results go in public/memes, and src/templates/_shared/memes/catalogue.ts
lists their sizes. Leave out film, game and brand characters: the three meme templates ship these
files to paying customers.
"""
import sys, json, os
from collections import deque
from PIL import Image, ImageFilter, ImageChops, ImageDraw

IMG = sys.argv[1]
OUT = sys.argv[2]
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

def cut(im, label, comp, bg, is_bg, name, box=None, close=None):
    CLOSE_R = close or CLOSE
    W, H = im.size
    x0, y0, x1, y1 = box or comp["box"]
    pad = EDGE + 4 + (close or 0)
    X0, Y0, X1, Y1 = max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad)
    w, h = X1 - X0, Y1 - Y0
    mask = bytearray(w * h)
    for y in range(max(y0, Y0), min(y1, Y1)):
        row = y * W
        for x in range(max(x0, X0), min(x1, X1)):
            if label[row + x] == comp["id"]: mask[(y - Y0) * w + (x - X0)] = 1
    if box: mask = largest(mask, w, h)
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
    m = m.filter(ImageFilter.MaxFilter(CLOSE_R * 2 + 1)).filter(ImageFilter.MinFilter(CLOSE_R * 2 + 1))
    padded = Image.new("L", (w + 2, h + 2), 0); padded.paste(m, (1, 1))
    ImageDraw.floodfill(padded, (0, 0), 128)
    m = padded.crop((1, 1, w + 1, h + 1)).point(lambda v: 0 if v == 128 else 255)
    mpx = m.load()
    if bg != (255, 255, 255):
        for y in range(h):
            for x in range(w):
                if mpx[x, y] and not mask[y * w + x] and is_bg(X0 + x, Y0 + y): cpx[x, y] = (255, 255, 255, 255)
    inner = m.filter(ImageFilter.MinFilter(3))                       # drop the JPEG fringe
    edge = m.filter(ImageFilter.MaxFilter(EDGE * 2 + 1))              # the white edge
    big = (w * SCALE, h * SCALE)
    crop = crop.resize(big, Image.LANCZOS)
    inner = inner.resize(big, Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.8))
    edge = edge.resize(big, Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.1))
    crop = crop.filter(ImageFilter.UnsharpMask(radius=1.4, percent=60, threshold=2))
    out = Image.new("RGBA", big, (255, 255, 255, 0))
    white = Image.new("RGBA", big, (255, 255, 255, 255)); white.putalpha(edge)
    out.alpha_composite(white)
    crop.putalpha(inner)
    out.alpha_composite(crop)
    bbox = out.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    out = out.crop(bbox)
    out.save(f"{OUT}/{name}.webp", "WEBP", quality=88, alpha_quality=92, method=6)
    return out.size

CATALOGUE = {
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
sizes = {}
for sheet, (tol, picks) in CATALOGUE.items():
    im, label, comps, bg, is_bg = segment(f"{IMG}/{sheet}", tol)
    for name, pick in picks.items():
        k, box = pick[0], pick[1]
        sizes[name] = cut(im, label, comps[k], bg, is_bg, name, box, pick[2] if len(pick) > 2 else None)
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
