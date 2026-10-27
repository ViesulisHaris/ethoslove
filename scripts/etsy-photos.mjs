// Etsy listing photos, 2000x2000: a hero, two pairs of moments, a single moment and "how it works",
// from the demo frames etsy-shots.mjs captured. Plus a 15 s MP4 for each listing.
//   node scripts/etsy-photos.mjs <repo> <shots> docs/marketing/etsy/photos [slugs…]   (videos land beside the photos; Etsy has them, the repo keeps only the photos)
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const [WT, SHOTS, OUT, ...only] = process.argv.slice(2);
const req = createRequire(join(WT, "package.json"));
const { chromium } = req("@playwright/test");
const sharp = req("sharp");

const GIFTS = {
  "popup-card": { bg: "#efe4d6", ink: "#3b2a22", title: "Pop-up Birthday Card", line: "They light the candles and blow them out", hero: 7, a: [1, 4, "It arrives as a card", "and opens into a cake"], b: [10, 14, "They blow, it bursts", "and your letter is there"], single: [5, "Their name and age on the topper"] },
  bouquet: { bg: "#f2e9df", ink: "#3b2a22", title: "Virtual Bouquet", line: "Flowers that come together stem by stem", hero: 8, a: [4, 7, "You pick every flower", "wrapped and tied for them"], b: [11, 16, "A card tucked inside", "with your words"], single: [9, "It never wilts"] },
  xoxo: { bg: "#f6e6e2", ink: "#4a1d22", title: "XOXO Love Letter", line: "Sealed with a kiss, full of your photos", hero: 3, a: [1, 7, "It arrives sealed", "and opens into your photos"], b: [9, 12, "Polaroids, kisses, hearts", "your letter at the end"], single: [5, "Every tap leaves a kiss"] },
  coquette: { bg: "#fbe4ea", ink: "#4a1d2e", title: "Coquette Love Letter", line: "Untie the bow: lilies, polaroids, your song", hero: 3, a: [2, 6, "A polaroid of the two of you", "and your song plays"], b: [9, 13, "Polaroids and lilies", "your letter at the end"], single: [5, "A little player that really pauses"] },
  "birthday-cinema": { bg: "#2b1012", ink: "#fbeee6", title: "Birthday Cinema", line: "Curtains, candles, confetti. Blow to make a wish.", hero: 7, a: [1, 3, "The curtains open", "a cake with real candles"], b: [5, 11, "They blow the candles out", "your photos roll, your letter waits"], single: [8, "Their name in lights"] },
  digicam: { bg: "#f9dbe6", ink: "#47202f", title: "Digicam Photo Gift", line: "Your photos on a little 2006 camera", hero: 7, a: [1, 4, "They press power", "and it says hello"], b: [13, 17, "Every shutter press, a photo", "then it prints the roll"], single: [10, "The orange date in the corner"] },
  scrapbook: { bg: "#f3ebe1", ink: "#3b2a22", title: "Digital Scrapbook", line: "Polaroids, washi tape and a note from you", hero: 5, a: [1, 7, "They open the book", "and your photos develop"], b: [10, 14, "A typed letter from you", "and their song playing"], single: [8, "Photo strips, film and washi tape"] },
  museum: { bg: "#ebe5dc", ink: "#2b2622", title: "Museum Gallery Gift", line: "A quiet gallery of the two of you", hero: 3, a: [2, 6, "They walk in", "and swipe from room to room"], b: null, single: [3, "Each photo framed, with a title, a year, a line"] },
  "jar-of-reasons": { bg: "#fbe4ea", ink: "#4a1d2e", title: "Reasons I Love You Jar", line: "A jar of your reasons. They shake one out.", hero: 2, a: [2, 4, "They tap the jar", "and a reason falls out"], b: [6, 14, "Some notes carry a photo", "one reason at a time"], single: [11, "Every note in your words"] },
  halfway: { bg: "#fbe4ea", ink: "#4a1d2e", title: "Long Distance Love Map", line: "Blow a paper plane from your door to theirs", hero: 3, a: [1, 5, "The real distance between you", "they blow, the plane flies"], b: [7, 10, "Until it's zero", "and your letter is there"], single: [4, "The halfway point, in your words"] },
  passport: { bg: "#e3ecf6", ink: "#1d2a44", title: "Digital Passport", line: "From your city to theirs, in one flight", hero: 2, a: [2, 6, "Their name on the cover", "the route draws itself"], b: [10, 12, "They land in your city", "every photo is a stamp"], single: [14, "Every stamp a place you've been"] },
  "on-repeat": { bg: "#fbe0ea", ink: "#4a1d2e", title: "Album Cover Love Letter", line: "Your photo as the album cover, their name as the artist", hero: 1, a: [1, 5, "Your photo as the album cover", "and your song plays"], b: [9, 12, "A playlist of your photos", "and your letter at the end"], single: [3, "Stickers, a bow and your song"] },
  "pack-your-bags": { bg: "#1b2440", ink: "#f4ecdf", title: "Surprise Trip Reveal", line: "They pack the bag. The board says where.", hero: 14, a: [3, 8, "They pack your clues", "the date swings from the handle"], b: [12, 15, "A departures board spells it out", "a boarding pass with both your names"], single: [20, "Your letter under the stub"] },
  "scratch-card": { bg: "#f3e2cc", ink: "#3d2a14", title: "Scratch Off Cards", line: "Five cards. The last one is the big one.", hero: 2, a: [2, 7, "A stack of cards for them", "they scratch the foil away"], b: [29, 57, "Each one hides a photo", "and the last one asks"], single: [10, "A photo and a line on every card"] },
  "snow-globe": { bg: "#2b1d16", ink: "#f6eadb", title: "Snow Globe", line: "Shake it. Each time it settles, a photo or a line.", hero: 6, a: [1, 8, "A globe on their shelf", "they shake it and it snows"], b: [10, 13, "It settles on one of your lines", "or one of your photos"], single: [23, "Then your letter opens"] },
  fireside: { bg: "#2a1a14", ink: "#f6e7d6", title: "Fireside Letter", line: "A candle, a blanket and a letter by the window", hero: 6, a: [1, 6, "It arrives as a letter", "they light the candle"], b: [12, 17, "Your letter unfolds", "your photos on a string"], single: [7, "The room turns gold"] },
  arcade: { bg: "#ece4f8", ink: "#3a2a55", title: "Arcade Love Game", line: "Catch the hearts. Unlock the photos.", hero: 14, a: [1, 9, "Press start", "catch the falling hearts"], b: [25, 45, "Each level clears a photo", "then they win"], single: [51, "And your message"] },
};

const FONTS = '<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Schibsted+Grotesk:wght@400;500;600&display=swap" rel="stylesheet">';
const base = (g) => `
  * { box-sizing: border-box; margin: 0 }
  body { width: 1000px; height: 1000px; background: ${g.bg}; color: ${g.ink}; font-family: "Schibsted Grotesk", system-ui, sans-serif; overflow: hidden; position: relative }
  .phone { position: absolute; background: #1b1215; border-radius: 46px; padding: 11px; box-shadow: 0 28px 60px rgba(30,10,15,.28), 0 6px 14px rgba(30,10,15,.18) }
  .phone img { display: block; width: 100%; height: 100%; object-fit: cover; border-radius: 36px }
  .serif { font-family: "Newsreader", Georgia, serif }
`;
const phone = (src, { left, top, w }) => `<div class="phone" style="left:${left}px;top:${top}px;width:${w}px;height:${Math.round(w * 16 / 9)}px"><img src="${src}"></div>`;

const hero = (g, img) => `<style>${base(g)}
  .text { position: absolute; left: 70px; top: 120px; width: 420px }
  .kicker { font-size: 22px; font-weight: 600; letter-spacing: .02em; opacity: .75 }
  h1 { font: 500 72px/1.02 "Newsreader", Georgia, serif; margin-top: 18px }
  p { font-size: 27px; line-height: 1.35; margin-top: 22px; opacity: .85 }
  ul { list-style: none; padding: 0; margin-top: 44px; display: grid; gap: 14px; font-size: 24px; font-weight: 500 }
  li::before { content: "✓"; margin-right: 12px; color: #d6336c; font-weight: 700 }
</style>
<div class="text"><div class="kicker">Interactive digital gift</div><h1>${g.title}</h1><p>${g.line}</p>
<ul><li>No Canva, no app</li><li>Made on your phone in minutes</li><li>Sent as a link they open</li></ul></div>
${phone(img, { left: 540, top: 70, w: 420 })}`;

const pair = (g, a, b, capA, capB) => `<style>${base(g)}
  .cap { position: absolute; width: 400px; text-align: center; font: 500 34px/1.15 "Newsreader", Georgia, serif }
</style>
${phone(a, { left: 70, top: 160, w: 400 })}${phone(b, { left: 530, top: 160, w: 400 })}
<div class="cap" style="left:70px;top:58px">${capA}</div><div class="cap" style="left:530px;top:58px">${capB}</div>`;

const single = (g, img, cap) => `<style>${base(g)}
  .cap { position: absolute; left: 70px; top: 400px; width: 380px; font: 500 52px/1.08 "Newsreader", Georgia, serif }
</style>
<div class="cap">${cap}</div>${phone(img, { left: 520, top: 70, w: 420 })}`;

const how = (g) => `<style>${base(g)}
  .wrap { position: absolute; left: 90px; top: 110px; width: 820px }
  h2 { font: 500 64px/1.05 "Newsreader", Georgia, serif }
  ol { list-style: none; padding: 0; margin-top: 60px; display: grid; gap: 44px }
  li { display: flex; gap: 28px; align-items: flex-start }
  b { flex: none; width: 64px; height: 64px; border-radius: 50%; background: ${g.ink}; color: ${g.bg}; display: grid; place-items: center; font-size: 30px }
  li span { font-size: 31px; line-height: 1.3 } li strong { display: block; font-size: 36px; margin-bottom: 4px }
  .note { margin-top: 64px; font-size: 26px; padding: 22px 28px; border-radius: 18px; background: color-mix(in srgb, ${g.ink} 12%, transparent) }
</style>
<div class="wrap"><h2>How it works</h2><ol>
<li><b>1</b><span><strong>Buy and download</strong>A one-page PDF with your link.</span></li>
<li><b>2</b><span><strong>Make it on your phone</strong>Names, photos, your words. A few minutes, no Canva.</span></li>
<li><b>3</b><span><strong>Send them the link</strong>They open it on any phone, wherever they are.</span></li>
</ol><div class="note">If it doesn't open on their phone, message us and we'll refund you.</div></div>`;

const frame = (slug, i) => {
  const files = readdirSync(join(SHOTS, slug, "frames")).sort();
  const f = files[Math.min(i, files.length - 1)];
  return `data:image/png;base64,${readFileSync(join(SHOTS, slug, "frames", f)).toString("base64")}`;
};

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1000 }, deviceScaleFactor: 2 });
for (const [slug, g] of Object.entries(GIFTS)) {
  if (only.length && !only.includes(slug)) continue;
  const dir = join(OUT, slug);
  mkdirSync(dir, { recursive: true });
  const shots = [
    ["1-hero", hero(g, frame(slug, g.hero))],
    ["2-moments", pair(g, frame(slug, g.a[0]), frame(slug, g.a[1]), g.a[2], g.a[3])],
    ...(g.b ? [["3-moments", pair(g, frame(slug, g.b[0]), frame(slug, g.b[1]), g.b[2], g.b[3])]] : []),
    ["4-detail", single(g, frame(slug, g.single[0]), g.single[1])],
    ["5-how-it-works", how(g)],
  ];
  for (const [name, html] of shots) {
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8">${FONTS}</head><body>${html}</body></html>`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const png = await page.screenshot();
    await sharp(png).jpeg({ quality: 88, mozjpeg: true }).toFile(join(dir, `${name}.jpg`));
  }
  // The video: the demo from its first screen, 15 s, silent, as Etsy takes it (MP4, under 100 MB).
  const webm = join(SHOTS, slug, "demo.webm");
  const duration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", webm]).toString());
  const frames = readdirSync(join(SHOTS, slug, "frames")).length;
  const start = Math.max(0, duration - frames * 1.2 - 1.5);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", start.toFixed(2), "-i", webm, "-t", "15", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "slow", "-movflags", "+faststart", join(dir, "video.mp4")]);
  console.log(slug, "ok");
}
await browser.close();
