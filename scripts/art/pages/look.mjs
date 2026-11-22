// Lays packed pieces on the grounds they are meant for, side by side, to be looked at: a faint box,
// a cut shadow, a grey petal show here and nowhere else.
//
//   node scripts/art/pages/look.mjs <out.png> <id> [id ...] [--on #f1e3d3,#2d0e18] [--h 520]
import { join } from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const out = args.shift();
let grounds = ["#f1e3d3", "#2d0e18"];
let H = 520;
const ids = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--on") grounds = args[++i].split(",");
  else if (args[i] === "--h") H = Number(args[++i]);
  else ids.push(args[i]);
}
const DIR = process.env.PAGES_OUT ?? join("public", "art", "pages");
const cells = [];
for (const id of ids) {
  const file = id.endsWith(".png") || id.endsWith(".webp") ? id : join(DIR, `${id}.webp`);
  const img = await sharp(file).resize({ height: H - 40, width: 900, fit: "inside" }).png().toBuffer({ resolveWithObject: true });
  cells.push(img);
}
const pad = 20;
const rowW = cells.reduce((s, c) => s + c.info.width + pad, pad);
const layers = [];
grounds.forEach((g, gi) => {
  layers.push({ input: { create: { width: rowW, height: H, channels: 4, background: g } }, left: 0, top: gi * H });
  let x = pad;
  for (const c of cells) {
    layers.push({ input: c.data, left: x, top: gi * H + Math.round((H - c.info.height) / 2) });
    x += c.info.width + pad;
  }
});
await sharp({ create: { width: rowW, height: H * grounds.length, channels: 4, background: "#ffffff" } }).composite(layers).png().toFile(out);
console.log(out, rowW, H * grounds.length);
