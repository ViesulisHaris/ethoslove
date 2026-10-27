// The Etsy shop's icon (1000x1000) and banner (3360x840), from the app icon and the gift frames.
//   node scripts/etsy-brand.mjs . <shots> docs/marketing/etsy/photos
import { createRequire } from "node:module";
import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const [WT, SHOTS, OUT] = process.argv.slice(2);
const req = createRequire(join(WT, "package.json"));
const { chromium } = req("@playwright/test");
const sharp = req("sharp");
mkdirSync(OUT, { recursive: true });

const data = (p) => `data:image/png;base64,${readFileSync(p).toString("base64")}`;
const frame = (slug, i) => data(join(SHOTS, slug, "frames", readdirSync(join(SHOTS, slug, "frames")).sort()[i]));
const FONTS = '<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Schibsted+Grotesk:wght@400;500&display=swap" rel="stylesheet">';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 500, height: 500 }, deviceScaleFactor: 2 });

// Icon: the seal and heart on paper, drawn large from the app icon's own shapes.
await page.setContent(`<!doctype html><html><body style="margin:0;width:500px;height:500px;background:#fdf7f3;display:grid;place-items:center">
<img src="${data(join(WT, "public/icons/maskable-512.png"))}" style="width:500px;height:500px;image-rendering:auto"></body></html>`);
await sharp(await page.screenshot()).png().toFile(join(OUT, "shop-icon.png"));

// Banner: the line on the left, five gifts on phones to the right.
await page.setViewportSize({ width: 1680, height: 420 });
const phones = [["popup-card", 7], ["bouquet", 8], ["xoxo", 3], ["birthday-cinema", 7], ["digicam", 7]];
await page.setContent(`<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>
  * { box-sizing: border-box; margin: 0 }
  body { width: 1680px; height: 420px; background: #fdf7f3; color: #24121b; font-family: "Schibsted Grotesk", sans-serif; position: relative; overflow: hidden }
  .text { position: absolute; left: 80px; top: 92px; width: 560px }
  h1 { font: 500 54px/1.06 "Newsreader", Georgia, serif }
  p { margin-top: 18px; font-size: 22px; color: #5d4652 }
  .row { position: absolute; left: 700px; top: 34px; display: flex; gap: 26px }
  .phone { width: 170px; height: 302px; background: #1b1215; border-radius: 22px; padding: 6px; box-shadow: 0 14px 30px rgba(30,10,15,.22) }
  .phone img { width: 100%; height: 100%; object-fit: cover; border-radius: 17px; display: block }
</style></head><body>
<div class="text"><h1>Interactive gifts they open on their phone</h1><p>Made on your phone in minutes. No Canva, no app.</p></div>
<div class="row">${phones.map(([s, i]) => `<div class="phone"><img src="${frame(s, i)}"></div>`).join("")}</div>
</body></html>`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await sharp(await page.screenshot()).resize(3360, 840).jpeg({ quality: 88, mozjpeg: true }).toFile(join(OUT, "shop-banner.jpg"));
await browser.close();
console.log("ok");
