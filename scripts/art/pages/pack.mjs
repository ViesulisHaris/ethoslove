// Packs the pages' Blender renders (scripts/art/pages/*.py) for the site: public/art/pages/<id>.webp
// at twice the size it is shown, <id>-1x.webp at half that, and manifest.json saying what there is.
//
//   node scripts/art/pages/pack.mjs <folder of renders> [id,id,...]
//
// A piece arrives as <id>.png (the thing), <id>-shadow.png (only its shadow, as alpha) and <id>.json.
// The shadow is laid under the thing here, in a warm brown that suits the page's cream. As in the
// holiday gifts' pack, the faint breath of shade a shadow catcher leaves over its whole rectangle
// (a box, on a pale page) is taken down to nothing and the shadow fades out towards the frame, so
// one cut short by its frame still ends softly; being apart from the thing, the shadow can be
// treated so without touching the thing's own soft edges.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const [raw, only] = process.argv.slice(2);
if (!raw) throw new Error("usage: pack.mjs <folder of renders> [id,id,...]");
// PAGES_OUT sends a trial pack somewhere else, to be looked at before anything in the site is replaced.
const OUT = process.env.PAGES_OUT ?? join("public", "art", "pages");
mkdirSync(OUT, { recursive: true });
const MANIFEST = join(OUT, "manifest.json");
const LIMIT = 250 * 1024;

// What each colourway's flowers are meant to lie on, and the colour their shadow is there.
export const COLOURWAYS = {
  ivory: { ground: "#f1e3d3", shadow: "#3a2200", strength: 0.58 },
  blush: { ground: "#f6dde3", shadow: "#7a4450", strength: 1.0 },
  wine: { ground: "#2a1016", shadow: "#0a0204", strength: 0.9 },
  moonlight: { ground: "#141a33", shadow: "#04060f", strength: 0.9 },
  plain: { ground: "#f1e3d3", shadow: "#3a2200", strength: 0.58 },
};

const LO = 10; // shadow alpha at or under this is the catcher's breath: gone
const HI = 44; // and from here up it is left as it was
const FEATHER = 22; // a shadow reaching the frame fades out over this many pixels

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const r3 = (n) => Math.round(n * 1000) / 1000;

async function shadowAlpha(file, w, h, strength) {
  const { data } = await sharp(file).ensureAlpha().extractChannel(3).blur(1.1).raw().toBuffer({ resolveWithObject: true });
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let a = data[y * w + x];
      if (a <= LO) continue;
      if (a < HI) a = (a * (a - LO)) / (HI - LO);
      const d = Math.min(x, w - 1 - x, y, h - 1 - y);
      if (d < FEATHER) a *= d / FEATHER;
      out[y * w + x] = Math.min(1, (a / 255) * strength);
    }
  }
  return out;
}

/** The thing over its shadow: straight RGBA. */
function compose(thing, shade, w, h, rgb) {
  const out = Buffer.alloc(w * h * 4);
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    const a = thing[i + 3] / 255;
    const s = shade ? shade[p] * (1 - a) : 0;
    const A = a + s;
    if (A <= 0) continue;
    for (let c = 0; c < 3; c++) out[i + c] = Math.round((thing[i + c] * a + rgb[c] * s) / A);
    out[i + 3] = Math.round(A * 255);
  }
  return out;
}

function bbox(data, w, h, floor = 3) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * 4 + 3] > floor) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return null;
  x0 = Math.max(0, x0 - 2);
  y0 = Math.max(0, y0 - 2);
  x1 = Math.min(w - 1, x1 + 2);
  y1 = Math.min(h - 1, y1 + 2);
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/** Saves as WebP under the limit, giving up quality a step at a time till it fits. */
async function save(img, file) {
  let res;
  for (const quality of [90, 86, 82, 78, 74, 70, 64, 58, 50]) {
    res = await img().webp({ quality, alphaQuality: 90, effort: 6, smartSubsample: true }).toFile(join(OUT, file));
    res.quality = quality;
    if (res.size <= LIMIT) break;
  }
  console.log(`${file}  ${res.width}x${res.height}  ${(res.size / 1024).toFixed(0)} KB  q${res.quality}${res.size > LIMIT ? "  OVER THE LIMIT" : ""}`);
  return { file, w: res.width, h: res.height, bytes: res.size };
}

/** An empty place's corners, cut and scaled as the picture was, and the matrix() that lays its box onto them. */
function place(area, box, k) {
  const corners = area.corners.map(([x, y]) => [r3((x - box.left) * k), r3((y - box.top) * k)]);
  const [tl, tr, , bl] = corners;
  const [bw, bh] = area.box;
  const m = [(tr[0] - tl[0]) / bw, (tr[1] - tl[1]) / bw, (bl[0] - tl[0]) / bh, (bl[1] - tl[1]) / bh, tl[0], tl[1]].map((n) => Math.round(n * 100000) / 100000);
  return { corners, matrix: `matrix(${m.join(", ")})`, m };
}

/** The soft shade just inside a screen's edge, drawn in the picture's own pixels: what makes glass sit below its bezel. */
function innerShade(w, h, area, m) {
  const [bw, bh] = area.box;
  const r = area.radius;
  const rect = `x="0" y="0" width="${bw}" height="${bh}" rx="${r}" ry="${r}"`;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><clipPath id="c"><rect ${rect}/></clipPath><filter id="b" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="3.2"/></filter></defs>` +
      `<g transform="matrix(${m.join(",")})"><g clip-path="url(#c)"><rect ${rect} fill="none" stroke="#000" stroke-opacity="0.5" stroke-width="7" filter="url(#b)"/><rect ${rect} fill="none" stroke="#000" stroke-opacity="0.55" stroke-width="1.6"/></g></g></svg>`,
  );
}

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};
manifest.base = "/art/pages/";
manifest.colourways = Object.fromEntries(Object.entries(COLOURWAYS).map(([k, v]) => [k, { ground: v.ground }]));
manifest.pieces ??= {};

const ids = readdirSync(raw).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).filter((id) => !only || only.split(",").some((o) => id === o || id.startsWith(o)));
for (const id of ids) {
  const info = JSON.parse(readFileSync(join(raw, `${id}.json`), "utf8"));
  if (!info.piece || !existsSync(join(raw, `${id}.png`))) continue;
  const way = info.colourway ?? "plain";
  const look = COLOURWAYS[way];
  const thing = await sharp(join(raw, `${id}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = thing.info;
  const shade = existsSync(join(raw, `${id}-shadow.png`)) ? await shadowAlpha(join(raw, `${id}-shadow.png`), w, h, (info.shadow ?? 1) * look.strength) : null;
  const whole = compose(thing.data, shade, w, h, hex(look.shadow));
  const box = bbox(whole, w, h);
  if (!box) throw new Error(`${id} is empty`);
  const k = Math.min(1, info.long / Math.max(box.width, box.height));
  const W = Math.round(box.width * k), H = Math.round(box.height * k);
  const cut = (buf, scale) => () => sharp(buf, { raw: { width: w, height: h, channels: 4 } }).extract(box).resize({ width: Math.round(W * scale), height: Math.round(H * scale), fit: "fill", kernel: "lanczos3" });
  const entry = { ...(await save(cut(whole, 1), `${id}.webp`)), x1: await save(cut(whole, 0.5), `${id}-1x.webp`) };
  for (const key of ["screen", "photo"]) {
    if (!info[key]) continue;
    const big = place(info[key], box, k), small = place(info[key], box, k * 0.5);
    entry[key] = { box: info[key].box, radius: info[key].radius, fill: info[key].fill, corners: big.corners, matrix: big.matrix, x1: { corners: small.corners, matrix: small.matrix } };
  }
  for (const layer of info.layers ?? []) {
    const top = await sharp(join(raw, `${id}-${layer}.png`)).ensureAlpha().raw().toBuffer();
    let buf = top;
    if (layer === "bezel" && info.screen) {
      // drawn at the render's own size, with the corners as they were rendered
      const full = place(info.screen, { left: 0, top: 0 }, 1);
      const shadeSvg = await sharp(innerShade(w, h, info.screen, full.m)).ensureAlpha().raw().toBuffer();
      buf = await sharp(shadeSvg, { raw: { width: w, height: h, channels: 4 } }).composite([{ input: top, raw: { width: w, height: h, channels: 4 } }]).raw().toBuffer();
    }
    entry[layer] = { ...(await save(cut(buf, 1), `${id}-${layer}.webp`)), x1: await save(cut(buf, 0.5), `${id}-${layer}-1x.webp`) };
  }
  (manifest.pieces[info.piece] ??= {})[way] = entry;
}

// The footer's lily: the open ivory one as a low, dark wine shape for a #2d0e18 ground, its form only just there.
const footerOf = join(raw, "lily-open-ivory.png");
if (existsSync(footerOf) && (!only || only.split(",").some((o) => "lily-footer".startsWith(o) || o === "lily-open-ivory"))) {
  const { data, info } = await sharp(footerOf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const lo = hex("#3a1622"), hi = hex("#6a3445");
  for (let i = 0; i < data.length; i += 4) {
    const l = Math.min(1, Math.max(0, ((0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2]) / 255 - 0.25) / 0.7));
    const f = l * l * (3 - 2 * l);
    for (let c = 0; c < 3; c++) data[i + c] = Math.round(lo[c] + (hi[c] - lo[c]) * f);
    data[i + 3] = Math.round(data[i + 3] * 0.92);
  }
  const box = bbox(data, info.width, info.height);
  const k = Math.min(1, 900 / Math.max(box.width, box.height));
  const W = Math.round(box.width * k), H = Math.round(box.height * k);
  const cut = (scale) => () => sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).extract(box).resize({ width: Math.round(W * scale), height: Math.round(H * scale), fit: "fill" });
  manifest.pieces["lily-footer"] = { plain: { ...(await save(cut(1), "lily-footer.webp")), x1: await save(cut(0.5), "lily-footer-1x.webp"), ground: "#2d0e18" } };
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + "\n");
console.log(`manifest: ${Object.keys(manifest.pieces).length} pieces`);
