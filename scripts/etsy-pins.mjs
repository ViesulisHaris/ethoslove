// Pinterest pins for the Etsy listings, 1000x1500: the pin title over the listing's first photo,
// in that photo's own background colour. Titles come from docs/marketing/etsy/replies-and-pins.md.
//   node scripts/etsy-pins.mjs <repo> [slugs…]
// ETSY_PIN=b makes the second pins instead: photo 2 (before and after), the "Second pins" table's
// titles, saved as <slug>-b.jpg.
import { createRequire } from "node:module";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const [WT, ...only] = process.argv.slice(2);
const req = createRequire(join(WT, "package.json"));
const { chromium } = req("@playwright/test");
const sharp = req("sharp");

const PHOTOS = join(WT, "docs/marketing/etsy/photos");
const OUT = join(WT, "docs/marketing/etsy/pins");
const B = process.env.ETSY_PIN === "b";
const FULL = readFileSync(join(WT, "docs/marketing/etsy/replies-and-pins.md"), "utf8").replace(/\r/g, "");
const SECOND = FULL.indexOf("### Second pins");
const DOC = B ? FULL.slice(SECOND) : SECOND < 0 ? FULL : FULL.slice(0, SECOND);

// Listing name in the pin table → template slug.
const SLUGS = {
  "Pop-up Card": "popup-card", "Birthday Cinema": "birthday-cinema", Digicam: "digicam", Arcade: "arcade",
  XOXO: "xoxo", Coquette: "coquette", Bouquet: "bouquet", "Jar of Reasons": "jar-of-reasons", "On Repeat": "on-repeat",
  Halfway: "halfway", Passport: "passport", Fireside: "fireside", Scrapbook: "scrapbook", Museum: "museum",
  "Pack Your Bags": "pack-your-bags", "Scratch Card": "scratch-card", "Snow Globe": "snow-globe",
  // Wave 3 (no Halloween ones until September).
  Constellations: "constellations", "The Letter": "the-letter", "Autumn Reel": "autumn-reel", Balloons: "balloons",
  Bloom: "bloom", "Cap Toss": "cap-toss", "Dark Romance": "dark-romance", Evergreen: "evergreen",
  "Fall for You": "fall-for-you", "Favorite Person": "favorite-person", "Fortune Cookie": "fortune-cookie",
  "Front Page": "front-page", "The Garden": "garden", Kawaii: "kawaii", Keepsake: "keepsake",
  "Midnight Countdown": "midnight-countdown", "Music Box": "music-box", "Our Timeline": "our-timeline",
  "Paper Crane": "paper-crane", "Party Animals": "party-animals", "Photo Booth": "photo-booth", Picnic: "picnic",
  "Recipe Box": "recipe-box", Sketchbook: "sketchbook", "Sticker Bomb": "sticker-bomb", "Text Thread": "text-thread",
  "The Council": "the-council", "The Toast": "the-toast", Vinyl: "vinyl",
};
const rows = DOC.split("\n")
  .map((l) => l.split("|").map((c) => c.trim()))
  .filter((c) => c.length > 5 && SLUGS[c[1]])
  .map((c) => ({ slug: SLUGS[c[1]], title: c[3] }));

const FONTS = '<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Schibsted+Grotesk:wght@400;500;600&display=swap" rel="stylesheet">';

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1500 } });
for (const { slug, title } of rows) {
  if (only.length && !only.includes(slug)) continue;
  // The Garden's photo 2 is still mostly blank paper (the garden is being drawn): its photo 3 instead.
  const hero = join(PHOTOS, slug, !B ? "1-hero.jpg" : slug === "garden" ? "3-moments.jpg" : "2-moments.jpg");
  // The photo's own background (its top-left corner), and ink that reads on it.
  const { data } = await sharp(hero).extract({ left: 4, top: 4, width: 8, height: 8 }).raw().toBuffer({ resolveWithObject: true });
  const [r, g, b] = [data[0], data[1], data[2]];
  const bg = `rgb(${r},${g},${b})`;
  const ink = 0.299 * r + 0.587 * g + 0.114 * b > 140 ? "#2b1a1e" : "#fbf3ec";
  const img = `data:image/jpeg;base64,${(await sharp(hero).resize(1000, 1000).jpeg({ quality: 90 }).toBuffer()).toString("base64")}`;
  const html = `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>
    * { box-sizing: border-box; margin: 0 }
    body { width: 1000px; height: 1500px; background: ${bg}; color: ${ink}; font-family: "Schibsted Grotesk", system-ui, sans-serif; overflow: hidden }
    h1 { font: 500 76px/1.04 "Newsreader", Georgia, serif; padding: 90px 80px 0; text-wrap: balance; height: 330px }
    img { display: block; width: 1000px; height: 1000px }
    p { text-align: center; font-size: 30px; font-weight: 500; padding-top: 52px; letter-spacing: .01em }
  </style></head><body><h1>${title}</h1><img src="${img}"><p>On Etsy · opens on any phone</p></body></html>`;
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await sharp(await page.screenshot()).jpeg({ quality: 86, mozjpeg: true }).toFile(join(OUT, `${slug}${B ? "-b" : ""}.jpg`));
  console.log(slug, "ok");
}
await browser.close();
