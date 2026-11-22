// Packs the occasion icons (occasion_icons.py) into public/art/occasions/<occasion>.webp.
//
//   node scripts/art/holiday/pack-icons.mjs <rawDir>
//
// Each render is a thing on nothing with its shadow in the alpha. The shadow catcher leaves the
// faintest veil over the whole rectangle, which shows as a box on a pale tile, so the alpha's toe
// is cut off; then the picture is trimmed to what is left and fitted into 144 by 144, three times
// the 48px it is drawn at.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const raw = process.argv[2];
if (!raw) throw new Error("usage: node pack-icons.mjs <rawDir>");
const out = path.join(process.cwd(), "public", "art", "occasions");
fs.mkdirSync(out, { recursive: true });

const TOE = 14; // of 255: under this is the veil, not the shadow
const SIZE = 144;

for (const file of fs.readdirSync(raw).filter((f) => f.endsWith(".png")).sort()) {
  const { data, info } = await sharp(path.join(raw, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    data[i] = a <= TOE ? 0 : Math.round(((a - TOE) * 255) / (255 - TOE));
  }
  const cleaned = await sharp(data, { raw: info }).png().toBuffer();
  const trimmed = await sharp(cleaned).trim({ threshold: 1 }).toBuffer();
  const name = file.replace(/\.png$/, ".webp");
  const done = await sharp(trimmed).resize({ width: SIZE, height: SIZE, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(path.join(out, name));
  console.log(name, done.size, "bytes");
}
