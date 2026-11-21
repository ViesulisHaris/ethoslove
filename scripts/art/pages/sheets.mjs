// Review sheets of the pages' art, made from the packed files and manifest.json exactly as a page
// would use them (a poster is laid into the hero's screen by the manifest's matrix, so a wrong
// number shows as a crooked screen).
//
//   node scripts/art/pages/sheets.mjs <folder to write the sheets into> [sprites,hero,experience,corner,colourways]
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const [outDir, onlyArg] = process.argv.slice(2);
if (!outDir) throw new Error("usage: sheets.mjs <folder> [sprites,hero,...]");
mkdirSync(outDir, { recursive: true });
const want = (name) => !onlyArg || onlyArg.split(",").includes(name);
const DIR = process.env.PAGES_OUT ?? join("public", "art", "pages");
const manifest = JSON.parse(readFileSync(join(DIR, "manifest.json"), "utf8"));
const CREAM = "#f1e3d3", CARD = "#f7ecdf", BAND = "#e8d3bd", FOOTER = "#2d0e18", INK = "#2b1a14", BODY = "#6f5a4c";
const GROUNDS = { ivory: "#f1e3d3", blush: "#f6e3e0", wine: "#f3e2dc", moonlight: "#e6e6ef" };

const entry = (piece, way) => manifest.pieces[piece]?.[way] ?? manifest.pieces[piece]?.plain ?? manifest.pieces[piece]?.ivory;
const label = (text, w, color = BODY, size = 15) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${size + 12}"><text x="${w / 2}" y="${size + 2}" text-anchor="middle" font-family="Consolas, Menlo, monospace" font-size="${size}" fill="${color}">${text}</text></svg>`);
const canvas = (w, h, bg) => sharp({ create: { width: w, height: h, channels: 4, background: bg } });

async function fit(file, maxW, maxH, rotate = 0) {
  let img = sharp(join(DIR, file));
  if (rotate) img = sharp(await img.rotate(rotate, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer());
  return img.resize({ width: maxW, height: maxH, fit: "inside" }).png().toBuffer({ resolveWithObject: true });
}

/** Something flat (a poster, a photo) laid into an empty place of a piece by that place's matrix(), as a page's CSS would. */
async function laidIn(file, area, cornerRadius) {
  const [bw, bh] = area.box;
  const m = area.matrix.match(/-?[\d.]+(?:e-?\d+)?/g).map(Number);
  const [a, b, c, d, e, f] = m;
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${bw}" height="${bh}"><rect width="${bw}" height="${bh}" rx="${cornerRadius}" ry="${cornerRadius}"/></svg>`);
  const box = await sharp(file).resize({ width: bw, height: bh, fit: "cover" }).ensureAlpha().composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  const out = await sharp(box).affine([[a, c], [b, d]], { background: { r: 0, g: 0, b: 0, alpha: 0 }, interpolator: sharp.interpolators.bicubic }).png().toBuffer();
  const xs = [0, a * bw, c * bh, a * bw + c * bh], ys = [0, b * bw, d * bh, b * bw + d * bh];
  return { input: out, left: Math.round(e + Math.min(...xs)), top: Math.round(f + Math.min(...ys)) };
}

async function sprites() {
  const rows = [
    ["lily-open", "lily-three-quarter", "lily-side"],
    ["petal-1", "petal-2", "petal-3", "petal-4", "leaf-1", "leaf-2"],
    ["step-photo", "step-note", "step-send", "lily-stem-tall", "hero-flatlay", "experience-flatlay"],
  ];
  const W = 1800, heights = [520, 300, 560];
  const layers = [];
  let y = 30;
  for (const [ri, row] of rows.entries()) {
    const cw = Math.floor((W - 40) / row.length);
    for (const [i, piece] of row.entries()) {
      const e = entry(piece, "ivory");
      if (!e) continue;
      const img = await fit(e.file, cw - 30, heights[ri] - 70);
      const cx = 20 + i * cw;
      layers.push({ input: img.data, left: cx + Math.round((cw - img.info.width) / 2), top: y + Math.round((heights[ri] - 60 - img.info.height) / 2) });
      layers.push({ input: label(e.file.replace(".webp", ""), cw, INK, 14), left: cx, top: y + heights[ri] - 50 });
      layers.push({ input: label(`${e.w}×${e.h}  ${Math.round(e.bytes / 1000)} kB`, cw, BODY, 12), left: cx, top: y + heights[ri] - 28 });
    }
    y += heights[ri];
  }
  // step-phone: the piece; the piece with a gift's poster laid into its screen by the manifest's matrix and the bezel
  // put back on top (a wrong number would show as a crooked or overflowing screen); the bezel layer alone; and
  // step-send beside them, which it has to match to the pixel
  const sp = manifest.pieces["step-phone"]?.plain;
  if (sp) {
    const rowH = 600, cw = 330;
    const at0 = { left: 0, top: 0 };
    const proof = await canvas(sp.w, sp.h, "#00000000").composite([{ input: join(DIR, sp.file), ...at0 }, await laidIn(poster, sp.screen, sp.screen.radius), { input: join(DIR, sp.bezel.file), ...at0 }]).png().toBuffer();
    const send = entry("step-send", "plain");
    const cells = [
      [join(DIR, sp.file), "step-phone", `${sp.w}×${sp.h}  ${Math.round(sp.bytes / 1000)} kB  screen: flat ${sp.screen.fill}`],
      [proof, "step-phone + poster by matrix + bezel", sp.screen.matrix],
      [join(DIR, sp.bezel.file), "step-phone-bezel", `${sp.bezel.w}×${sp.bezel.h}  ${Math.round(sp.bezel.bytes / 1000)} kB`],
      [join(DIR, send.file), "step-send (unchanged)", `${send.w}×${send.h}`],
      [join(DIR, sp.x1.file), "step-phone-1x", `${sp.x1.w}×${sp.x1.h}  ${Math.round(sp.x1.bytes / 1000)} kB`],
    ];
    for (const [i, [src, name, sub]] of cells.entries()) {
      const img = await sharp(src).resize({ height: rowH - 90, width: cw - 30, fit: "inside", withoutEnlargement: true }).png().toBuffer({ resolveWithObject: true });
      const cx = 20 + i * (cw + 20);
      layers.push({ input: img.data, left: cx + Math.round((cw - img.info.width) / 2), top: y + Math.round((rowH - 70 - img.info.height) / 2) });
      layers.push({ input: label(name, cw, INK, 14), left: cx, top: y + rowH - 56 });
      layers.push({ input: label(sub, cw, BODY, 10), left: cx, top: y + rowH - 32 });
    }
    y += rowH;
  }
  const creamH = y + 10;
  // the same things small on the footer's ground: a box round a sprite, a shadow gone pale, would show here
  const strip = ["lily-open", "lily-three-quarter", "lily-side", "petal-1", "petal-3", "leaf-1", "step-photo", "step-note", "step-send", "step-phone", "lily-stem-tall", "lily-footer"];
  const sh = 300, sw = Math.floor((W - 40) / strip.length);
  for (const [i, piece] of strip.entries()) {
    const e = entry(piece, "ivory");
    if (!e) continue;
    const img = await fit(e.file, sw - 16, sh - 70);
    layers.push({ input: img.data, left: 20 + i * sw + Math.round((sw - img.info.width) / 2), top: creamH + 20 + Math.round((sh - 70 - img.info.height) / 2) });
    layers.push({ input: label(piece, sw, "#cdb7b0", 13), left: 20 + i * sw, top: creamH + sh - 40 });
  }
  layers.unshift({ input: await canvas(W, sh, FOOTER).png().toBuffer(), left: 0, top: creamH });
  await canvas(W, creamH + sh, CREAM).composite(layers).png().toFile(join(outDir, "sheet-sprites.png"));
  console.log("sheet-sprites.png");
}

async function hero(poster) {
  const cols = [];
  for (const way of Object.keys(GROUNDS)) {
    const e = entry("hero-flatlay", way);
    if (!e || !manifest.pieces["hero-flatlay"][way]) continue;
    const layers = [{ input: join(DIR, e.file), left: 0, top: 0 }, await laidIn(poster, e.screen, e.screen.radius), { input: join(DIR, e.bezel.file), left: 0, top: 0 }];
    cols.push({ way, w: e.w, h: e.h, buf: await canvas(e.w, e.h, GROUNDS[way]).composite(layers).png().toBuffer(), e });
  }
  if (!cols.length) return;
  // the ivory one whole, with the bare piece and the bezel layer beside it; under them the other colourways at half size
  const main = cols[0], rest = cols.slice(1);
  const bare = await sharp(join(DIR, main.e.file)).resize({ height: Math.round(main.h / 2) - 30 }).png().toBuffer({ resolveWithObject: true });
  const bez = await sharp(join(DIR, main.e.bezel.file)).resize({ height: Math.round(main.h / 2) - 30 }).png().toBuffer({ resolveWithObject: true });
  const pad = 40;
  const topH = main.h + pad * 2 + 30;
  const half = (c) => Math.round(c.w / 2);
  const rowW = rest.reduce((s, c) => s + half(c) + pad, pad);
  const rowH = rest.length ? Math.round(Math.max(...rest.map((c) => c.h)) / 2) + pad + 40 : 0;
  const W = Math.max(pad + main.w + pad + bare.info.width + pad, rowW), H = topH + rowH;
  const layers = [{ input: main.buf, left: pad, top: pad }, { input: label(`hero-flatlay-${main.way}: the piece, a poster laid in by the matrix, the bezel on top`, main.w), left: pad, top: topH - 34 }];
  const x = pad + main.w + pad;
  layers.push({ input: bare.data, left: x, top: pad }, { input: label("the piece alone (screen: flat black)", bare.info.width, BODY, 13), left: x, top: pad + bare.info.height });
  layers.push({ input: bez.data, left: x, top: pad + bare.info.height + 34 }, { input: label("the bezel layer alone", bez.info.width, BODY, 13), left: x, top: pad + bare.info.height * 2 + 34 });
  let rx = pad;
  for (const c of rest) {
    const small = await sharp(c.buf).resize({ width: half(c) }).png().toBuffer({ resolveWithObject: true });
    layers.push({ input: await canvas(half(c) + pad, rowH, GROUNDS[c.way]).png().toBuffer(), left: rx - pad / 2, top: topH });
    layers.push({ input: small.data, left: rx, top: topH + pad / 2 });
    layers.push({ input: label(`hero-flatlay-${c.way} on ${GROUNDS[c.way]}`, half(c), BODY, 13), left: rx, top: topH + rowH - 30 });
    rx += half(c) + pad;
  }
  await canvas(W, H, CREAM).composite(layers).png().toFile(join(outDir, "sheet-hero.png"));
  console.log("sheet-hero.png");
}

async function experience(photo) {
  const cols = [];
  for (const way of Object.keys(GROUNDS)) {
    const e = manifest.pieces["experience-flatlay"]?.[way];
    if (!e) continue;
    const layers = [{ input: join(DIR, e.file), left: 0, top: 0 }, await laidIn(photo, e.photo, e.photo.radius)];
    cols.push({ way, e, buf: await canvas(e.w, e.h, "#00000000").composite(layers).png().toBuffer() });
  }
  if (!cols.length) return;
  // as the page uses it: on the deeper band, wide, cropped at the left and the bottom
  const pad = 30, bandW = 1440, bandH = 640;
  const H = pad + cols.length * (bandH + pad);
  const layers = [];
  for (const [i, c] of cols.entries()) {
    const y = pad + i * (bandH + pad);
    const shown = await sharp(c.buf).resize({ width: 900 }).png().toBuffer({ resolveWithObject: true });
    const band = await canvas(bandW, bandH, c.way === "ivory" ? BAND : GROUNDS[c.way]).composite([
      { input: await sharp(shown.data).extract({ left: 150, top: 60, width: 750, height: Math.min(bandH, shown.info.height - 60) }).png().toBuffer(), left: 0, top: 0 },
      { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="520" height="200"><text x="0" y="24" font-family="Consolas, monospace" font-size="13" letter-spacing="3" fill="${BODY}">THE EXPERIENCE</text><text x="0" y="84" font-family="Georgia, serif" font-size="46" fill="${INK}">More than a message</text><text x="0" y="130" font-family="Helvetica, Arial, sans-serif" font-size="18" fill="${BODY}">experience-flatlay-${c.way}, a photo laid in by the matrix</text></svg>`), left: 820, top: 200 },
    ]).png().toBuffer();
    layers.push({ input: band, left: pad, top: y });
  }
  await canvas(bandW + pad * 2, H, CREAM).composite(layers).png().toFile(join(outDir, "sheet-experience.png"));
  console.log("sheet-experience.png");
}

async function corner() {
  const W = 1440, H = 900;
  const put = async (piece, width, left, top, rotate = 0, flop = false) => {
    const e = entry(piece, "ivory");
    let img = sharp(join(DIR, e.file));
    if (flop) img = img.flop();
    img = sharp(await img.resize({ width }).png().toBuffer());
    if (rotate) img = sharp(await img.rotate(rotate, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer());
    let buf = await img.png().toBuffer({ resolveWithObject: true });
    // what hangs over the canvas's edge is cut, as a page's overflow would cut it
    const l = Math.max(0, -left), t = Math.max(0, -top);
    const w = Math.min(buf.info.width - l, W - Math.max(0, left)), h = Math.min(buf.info.height - t, H - Math.max(0, top));
    return { input: await sharp(buf.data).extract({ left: l, top: t, width: w, height: h }).png().toBuffer(), left: Math.max(0, left), top: Math.max(0, top) };
  };
  const words = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><text x="92" y="52" font-family="Georgia, serif" font-style="italic" font-size="24" fill="${INK}">Ethos</text>` +
      `<text x="520" y="330" font-family="Georgia, serif" font-size="78" fill="${INK}">The Letter</text><text x="520" y="392" font-family="Georgia, serif" font-style="italic" font-size="28" fill="${BODY}">A personalized envelope, opened by hand.</text>` +
      `<text x="520" y="450" font-family="Helvetica, Arial, sans-serif" font-size="18" fill="${BODY}">Tap to break the seal. The letter slides out and unfolds on a candlelit desk.</text>` +
      `<rect x="520" y="490" width="190" height="52" rx="26" fill="#7b1d3a"/><text x="615" y="523" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="17" fill="#fff">Make this gift →</text></svg>`,
  );
  const layers = [
    // turned a little, never mirrored: every piece is lit from the top left, and a mirrored one would not be
    await put("lily-three-quarter", 440, -90, 40, -14),
    await put("lily-stem-tall", 430, 1085, 110, -9),
    await put("petal-1", 104, 330, 690, 24),
    await put("petal-3", 92, 940, 150, -28),
    { input: words, left: 0, top: 0 },
  ];
  await canvas(W, H, CREAM).composite(layers).png().toFile(join(outDir, "sheet-page-corner.png"));
  console.log("sheet-page-corner.png");
}

async function colourways() {
  const ways = Object.keys(GROUNDS).filter((w) => manifest.pieces["lily-open"]?.[w]);
  const cw = 620, ch = 560, strip = 150;
  const layers = [];
  for (const [i, way] of ways.entries()) {
    layers.push({ input: await canvas(cw, ch, GROUNDS[way]).png().toBuffer(), left: i * cw, top: 0 });
    const lily = await fit(manifest.pieces["lily-open"][way].file, cw - 60, 400);
    layers.push({ input: lily.data, left: i * cw + Math.round((cw - lily.info.width) / 2), top: 20 + Math.round((400 - lily.info.height) / 2) });
    const p = manifest.pieces["petal-1"]?.[way];
    if (p) {
      const petal = await fit(p.file, 170, 110);
      layers.push({ input: petal.data, left: i * cw + cw - 230, top: ch - 150 });
    }
    layers.push({ input: label(`${way}  on ${GROUNDS[way]}`, cw, BODY, 16), left: i * cw, top: ch - 34 });
  }
  const W = Math.max(cw, ways.length * cw);
  layers.push({ input: await canvas(W, strip, FOOTER).png().toBuffer(), left: 0, top: ch });
  const foot = entry("lily-footer", "plain");
  if (foot) {
    const img = await fit(foot.file, 260, strip + 60);
    layers.push({ input: await sharp(img.data).extract({ left: 0, top: 0, width: img.info.width, height: Math.min(img.info.height, strip) }).png().toBuffer(), left: W - 300, top: ch });
    layers.push({ input: label("lily-footer on #2d0e18 (the one dark ground)", 520, "#cdb7b0", 14), left: 30, top: ch + 60 });
  }
  await canvas(W, ch + strip, CREAM).composite(layers).png().toFile(join(outDir, "sheet-colourways.png"));
  console.log("sheet-colourways.png");
}

const poster = join("public", "templates", "the-letter", "poster.jpg");
const photo = join("public", "demo", "photos", "p1.webp");
if (want("sprites")) await sprites();
if (want("hero") && existsSync(poster)) await hero(poster);
if (want("experience") && existsSync(photo)) await experience(photo);
if (want("corner")) await corner();
if (want("colourways")) await colourways();
