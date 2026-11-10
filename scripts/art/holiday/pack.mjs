// Packs a gift's Blender renders for the site: every sprite cut down to what is in it and saved as
// WebP, the plates as WebP, the out-of-focus plates the letter is read over, the paper the letter is
// written on (cut into a top, a middle that repeats and a bottom, so it can be any length), and a
// map of where each sprite sits on the stage (src/templates/<slug>/art-map.ts).
//
//   node scripts/art/holiday/pack.mjs <slug> <folder of renders>
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const [slug, raw] = process.argv.slice(2);
if (!slug || !raw) throw new Error("usage: pack.mjs <slug> <folder of renders>");
const out = join("public", "art", slug);
mkdirSync(out, { recursive: true });
const manifest = JSON.parse(readFileSync(join(raw, "manifest.json"), "utf8"));
const round = (n) => Math.round(n * 1000) / 1000;
const WEBP = { quality: 86, alphaQuality: 92, effort: 6 };

// A shadow catcher leaves a breath of shade over a sprite's whole rectangle, which shows as a box
// on anything pale. The faintest alpha is taken down to nothing, and what is soft (shadow, not the
// thing itself) is faded out towards the rectangle's edges, so a shadow cut short by its frame
// ends softly too.
const LO = 12;
const HI = 46;
const FEATHER = 18;

function clean(data, w, h) {
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    if (a && a < HI) data[i] = a <= LO ? 0 : Math.round((a * (a - LO)) / (HI - LO));
  }
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 3) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * w + x) * 4 + 3;
      const a = data[i];
      if (!a || a >= 170) continue;
      const d = Math.min(x - x0, x1 - x, y - y0, y1 - y);
      if (d >= FEATHER) continue;
      const solid = Math.min(1, Math.max(0, (a - 110) / 60));
      const f = d / FEATHER;
      data[i] = Math.round(a * (f + (1 - f) * solid));
    }
  }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

const sprites = {};
const cut = {};
let bytes = 0;
for (const [name, s] of Object.entries(manifest.sprites)) {
  if (!existsSync(join(raw, s.file))) continue;
  const { data, info } = await sharp(join(raw, s.file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const box = clean(data, info.width, info.height);
  if (!box) throw new Error(`${name} is empty`);
  const img = () => sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).extract(box);
  const res = await img().webp(WEBP).toFile(join(out, `${name}.webp`));
  bytes += res.size;
  sprites[name] = { x: round(s.x + box.left / s.pxPerK), y: round(s.y + box.top / s.pxPerK), w: round(box.width / s.pxPerK), h: round(box.height / s.pxPerK) };
  cut[name] = { img, ...box };
  console.log(`${name}.webp  ${box.width}x${box.height}  ${(res.size / 1024).toFixed(0)} KB`);
}

// The note's papers (the letter's, a receipt's), each cut from one sprite so it can be any length.
// A top is the sprite's top and the middle starts on the very next row, so those two join without
// a seam; the middle is followed by its own reflection, so it repeats without one; the bottom
// fades in over whatever part of the middle it happens to land on. The shadow rendered round the
// paper is the tight one of a sheet lying on a table: over a table that is out of focus it reads
// as an inked line, so it is thinned here and the page adds a softer one.
const specs = manifest.sheets ?? (manifest.sheet ? { letter: { ...manifest.sheet, mid: [manifest.sheet.mid].flat().pop() } } : {});
const sheets = {};
for (const [name, spec] of Object.entries(specs)) {
  if (!cut[spec.sprite]) continue;
  const { img, width: w, height: h } = cut[spec.sprite];
  const rows = (f) => Math.round(f * h);
  const fade = rows(0.05);
  const all = await img().raw().toBuffer();
  for (let i = 3; i < all.length; i += 4) if (all[i] < 200) all[i] = Math.round(all[i] * 0.5);
  // Even light down its length. A long sheet is brighter at the end nearer the lamp, and a short
  // paper is made of just its top and its bottom, where that would show as a step. `gain` then
  // makes a paper whiter than the table's light left it.
  const mean = new Float64Array(h);
  for (let y = 0; y < h; y++) {
    let sum = 0;
    let n = 0;
    for (let x = 0; x < w; x += 2) {
      const i = (y * w + x) * 4;
      if (all[i + 3] > 235) {
        sum += all[i] + all[i + 1] + all[i + 2];
        n++;
      }
    }
    mean[y] = n ? sum / n : 0;
  }
  const reach = 60;
  const level = Float64Array.from({ length: h }, (_, y) => {
    let sum = 0;
    let n = 0;
    for (let k = Math.max(0, y - reach); k <= Math.min(h - 1, y + reach); k++) {
      if (mean[k]) {
        sum += mean[k];
        n++;
      }
    }
    return n ? sum / n : 0;
  });
  const sorted = [...level].filter(Boolean).sort((a, b) => a - b);
  const target = (sorted[Math.floor(sorted.length / 2)] ?? 0) * (spec.gain ?? 1);
  for (let y = 0; y < h; y++) {
    const g = level[y] ? Math.min(1.3, Math.max(0.8, target / level[y])) : (spec.gain ?? 1);
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      all[i] = Math.min(255, Math.round(all[i] * g));
      all[i + 1] = Math.min(255, Math.round(all[i + 1] * g));
      all[i + 2] = Math.min(255, Math.round(all[i + 2] * g));
    }
  }
  const part = (from, to) => Buffer.from(all.subarray(from * w * 4, to * w * 4));
  const save = async (buf, height, file) => {
    const res = await sharp(buf, { raw: { width: w, height, channels: 4 } }).webp(WEBP).toFile(join(out, `${file}.webp`));
    bytes += res.size;
    console.log(`${file}.webp  ${w}x${height}  ${(res.size / 1024).toFixed(0)} KB`);
  };
  const topH = rows(spec.top);
  await save(part(0, topH), topH, `sheet-${name}-top`);
  const m1 = Math.max(topH + 8, rows(spec.mid));
  const seg = part(topH, m1);
  const segH = m1 - topH;
  const tile = Buffer.alloc(seg.length * 2);
  seg.copy(tile, 0);
  for (let y = 0; y < segH; y++) seg.copy(tile, (segH + y) * w * 4, (segH - 1 - y) * w * 4, (segH - y) * w * 4);
  await save(tile, segH * 2, `sheet-${name}-mid`);
  const b0 = h - rows(spec.bottom) - fade;
  const foot = part(b0, h);
  for (let y = 0; y < fade; y++) {
    const f = y / fade;
    for (let x = 0; x < w; x++) foot[(y * w + x) * 4 + 3] = Math.round(foot[(y * w + x) * 4 + 3] * f * f * (3 - 2 * f));
  }
  await save(foot, h - b0, `sheet-${name}-bottom`);
  // Where the paper itself begins inside its picture (the rest is its shadow), as shares of the width.
  const solidCol = (x) => {
    let n = 0;
    for (let y = 0; y < h; y += 4) if (all[(y * w + x) * 4 + 3] > 235) n++;
    return n > h / 4 / 3;
  };
  const solidRow = (y) => {
    let n = 0;
    for (let x = 0; x < w; x += 4) if (all[(y * w + x) * 4 + 3] > 235) n++;
    return n > w / 4 / 3;
  };
  let l = 0, r = w - 1, t = 0, b = h - 1;
  while (l < w && !solidCol(l)) l++;
  while (r > 0 && !solidCol(r)) r--;
  while (t < h && !solidRow(t)) t++;
  while (b > 0 && !solidRow(b)) b--;
  sheets[name] = { name, top: round(topH / w), mid: round((segH * 2) / w), bottom: round((h - b0) / w), fade: round(fade / w), inset: { left: round(l / w), right: round((w - 1 - r) / w), top: round(t / w), bottom: round((h - 1 - b) / w) } };
}

for (const f of readdirSync(raw).filter((n) => /^plate-.*\.png$/.test(n))) {
  const name = f.replace(/\.png$/, "");
  const res = await sharp(join(raw, f)).webp({ quality: 80, effort: 6, smartSubsample: true }).toFile(join(out, `${name}.webp`));
  bytes += res.size;
  console.log(`${name}.webp  ${res.width}x${res.height}  ${(res.size / 1024).toFixed(0)} KB`);
  // The letter is read over the same table out of focus: rendered that way where the scene has
  // done so, and otherwise this plate, blurred.
  const softName = name.replace(/^plate-/, "soft-");
  const rendered = join(raw, `${softName}.png`);
  const soft = existsSync(rendered)
    ? await sharp(rendered).webp({ quality: 82, effort: 6, smartSubsample: true }).toFile(join(out, `${softName}.webp`))
    : await sharp(join(raw, f)).resize({ width: 400 }).blur(7).webp({ quality: 74, effort: 6 }).toFile(join(out, `${softName}.webp`));
  bytes += soft.size;
  console.log(`${softName}.webp  ${soft.width}x${soft.height}  ${(soft.size / 1024).toFixed(0)} KB${existsSync(rendered) ? "" : "  (blurred, not rendered)"}`);
}

const lines = [
  `/* Made by scripts/art/holiday/pack.mjs from the Blender scene scripts/art/holiday/${slug.replace(/-/g, "_")}.py. Not edited by hand. */`,
  "",
  "/** Where the pictures are served from. */",
  `export const ART_BASE = "/art/${slug}/";`,
  "",
  "/** Each sprite's place on the stage: its top left corner and its size, in stage units (100 across, 170 down). */",
  `export const SPRITES = ${JSON.stringify(sprites, null, 2)} as const;`,
  "",
  "/** Points the gift needs to know, in the same units. */",
  `export const ANCHORS = ${JSON.stringify(manifest.anchors, null, 2)} as const;`,
  "",
  "/** Where each fairy light sits, for the twinkle. */",
  `export const BULBS: readonly (readonly [number, number])[] = ${JSON.stringify(manifest.bulbs ?? [])};`,
  "",
];
if (Object.keys(sheets).length) {
  lines.push(
    "/** The note's papers: for each, how tall its top, its repeating middle and its bottom are for their width, how much of the bottom fades in, and where the paper begins inside the picture (shares of the width). */",
    `export const SHEETS = ${JSON.stringify(sheets, null, 2)} as const;`,
    "",
  );
}
writeFileSync(join("src", "templates", slug, "art-map.ts"), lines.join("\n"));
console.log(`\n${Object.keys(sprites).length} sprites, ${(bytes / 1024 / 1024).toFixed(2)} MB in ${out}`);
