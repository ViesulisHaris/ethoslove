// Phone-sized photo-frame collages in the Pinterest scrapbook style: empty frames to fill with your own
// photos, and the same page filled with the demo photos to show how it looks. Built from the site's own
// photographic cut-outs (public/scraps) and CSS paper, so nothing is lifted from anyone's artwork and no
// brand or character appears.
//
//   node scripts/collage-frames.mjs            → docs/marketing/frames/<n>-<name>.png and -filled.png
//   node scripts/collage-frames.mjs 03         → only the designs whose number or name matches
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";

const W = 1080;
const H = 1920;
const PUBLIC = new URL("../public/", import.meta.url).href;
const OUT = fileURLToPath(new URL("../docs/marketing/frames/", import.meta.url));
const scrap = (id) => `${PUBLIC}scraps/${id}.webp`;
const photo = (id) => `${PUBLIC}demo/photos/${id}.webp`;

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A clip-path for paper torn along the sides you name, the same tear for the same seed. */
function torn(seed, sides = { top: 1, right: 1, bottom: 1, left: 1 }, depth = 2.4, steps = 22) {
  const random = mulberry32(seed);
  const jag = () => (random() * depth).toFixed(2);
  const p = [];
  for (let i = 0; i <= steps; i++) p.push(`${((i / steps) * 100).toFixed(2)}% ${sides.top ? jag() : 0}%`);
  for (let i = 1; i <= steps; i++) p.push(`${sides.right ? (100 - jag()).toFixed(2) : 100}% ${((i / steps) * 100).toFixed(2)}%`);
  for (let i = steps - 1; i >= 0; i--) p.push(`${((i / steps) * 100).toFixed(2)}% ${sides.bottom ? (100 - jag()).toFixed(2) : 100}%`);
  for (let i = steps - 1; i >= 1; i--) p.push(`${sides.left ? jag() : 0}% ${((i / steps) * 100).toFixed(2)}%`);
  return `polygon(${p.join(",")})`;
}

// Encoded whole, with single quotes round it: the texture goes inside style="…" attributes, where a
// bare double quote would end the attribute and spill the rest of the CSS onto the page as text.
const GRAIN = `url('data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260"><filter id="p"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.5 0 0 0 0 0.42 0 0 0 0 0.36 0 0 0 0.2 0"/></filter><rect width="100%" height="100%" filter="url(#p)"/></svg>')}')`;

const gingham = (band, base, size) =>
  `background-color:${base};background-image:linear-gradient(90deg, ${band} 50%, transparent 50%),linear-gradient(${band} 50%, transparent 50%);background-size:${size * 2}px ${size * 2}px;`;

/** Black cut-outs turned the colours of this page. */
const TONE = {
  pinkWings: "invert(1) sepia(1) saturate(2.4) hue-rotate(295deg) brightness(1.02)",
  blushWings: "invert(.95) sepia(.6) saturate(1.6) hue-rotate(300deg) brightness(1.04)",
};

const SHADOW = "drop-shadow(0 10px 12px rgba(80,30,45,.26))";

/** A cut-out placed by its centre. */
const cut = ({ id, x, y, w, r = 0, z = 6, tone = "", flip = false, shadow = true, opacity = 1 }) =>
  `<img src="${scrap(id)}" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;transform:translate(-50%,-50%) rotate(${r}deg)${flip ? " scaleX(-1)" : ""};z-index:${z};filter:${tone} ${shadow ? SHADOW : ""};opacity:${opacity}">`;

/** A piece of torn paper, with the paler fibre a real tear leaves round its edge. */
const paper = ({ x, y, w, h, r = 0, z = 1, seed = 1, sides, fill, rim = "#FFFBF7", depth = 2.4, inner = "" }) =>
  `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;transform:translate(-50%,-50%) rotate(${r}deg);z-index:${z};filter:drop-shadow(0 6px 10px rgba(80,30,45,.16))">
     <div style="position:absolute;inset:0;background:${rim};clip-path:${torn(seed + 17, sides, depth * 0.5)}"></div>
     <div style="position:absolute;inset:0;${fill};clip-path:${torn(seed, sides, depth)}">${inner}</div>
   </div>`;

/** The window a photo goes in: white when empty, the photo when filled. */
const windowFill = (pic, blank = "#FFFFFF") =>
  pic
    ? `<img src="${photo(pic)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`
    : `<div style="position:absolute;inset:0;background:${blank};box-shadow:inset 0 0 0 1px rgba(0,0,0,.04), inset 0 2px 8px rgba(0,0,0,.06)"></div>`;

/**
 * A polaroid-shaped frame. `border` is any CSS background for the paper round the window; `lip` is the
 * deeper margin under it. The window keeps the frame's proportions minus the margins.
 */
const frame = ({ x, y, w, h, r = 0, z = 4, border, pad = 0.07, lip = 0.16, pic, blank, caption = "", captionFont = "'Special Elite', monospace", captionColor = "#4A3A36", stitch = "" }) => {
  const p = Math.round(w * pad);
  const bottom = Math.round(h * lip);
  return `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;transform:translate(-50%,-50%) rotate(${r}deg);z-index:${z};${border};box-shadow:0 18px 34px -6px rgba(80,30,45,.32), 0 2px 4px rgba(80,30,45,.12)">
     ${stitch ? `<div style="position:absolute;inset:${Math.round(p * 0.38)}px;border:3px dashed ${stitch};border-radius:4px;pointer-events:none"></div>` : ""}
     <div style="position:absolute;left:${p}px;right:${p}px;top:${p}px;bottom:${bottom}px;overflow:hidden">${windowFill(pic, blank)}</div>
     ${caption ? `<div style="position:absolute;left:0;right:0;bottom:${Math.round(bottom * 0.3)}px;text-align:center;font-family:${captionFont};font-size:${Math.round(w * 0.075)}px;color:${captionColor}">${caption}</div>` : ""}
   </div>`;
};

/** A photo-booth strip: windows one under another on a paper strip. */
const strip = ({ x, y, w, r = 0, z = 4, border, pics = [], blank, count = 3, gap = 0.06, pad = 0.09, ratio = 1.22, foot = 0.18, label = "", labelFont = "'Special Elite', monospace", labelColor = "#7A4A55" }) => {
  const p = Math.round(w * pad);
  const win = w - p * 2;
  const winH = Math.round(win * ratio);
  const g = Math.round(w * gap);
  const footH = Math.round(w * foot);
  const h = p + count * winH + (count - 1) * g + footH;
  const windows = Array.from({ length: count }, (_, i) => `<div style="position:absolute;left:${p}px;width:${win}px;top:${p + i * (winH + g)}px;height:${winH}px;overflow:hidden">${windowFill(pics[i], blank)}</div>`).join("");
  return `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;transform:translate(-50%,-50%) rotate(${r}deg);z-index:${z};${border};box-shadow:0 18px 34px -6px rgba(80,30,45,.32), 0 2px 4px rgba(80,30,45,.12)">
     ${windows}
     ${label ? `<div style="position:absolute;left:0;right:0;bottom:${Math.round(footH * 0.28)}px;text-align:center;font-family:${labelFont};font-size:${Math.round(w * 0.085)}px;color:${labelColor};letter-spacing:.04em">${label}</div>` : ""}
   </div>`;
};

/** Words on the page. */
const words = ({ x, y, text, font, size, color, r = 0, z = 9, weight = 400, italic = false, spacing = 0, w }) =>
  `<div style="position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-50%) rotate(${r}deg);z-index:${z};font-family:${font};font-size:${size}px;color:${color};font-weight:${weight};${italic ? "font-style:italic;" : ""}letter-spacing:${spacing}em;white-space:nowrap;${w ? `width:${w}px;text-align:center;white-space:normal;` : ""}line-height:1.1">${text}</div>`;

/** A gold four-pointed sparkle. */
const sparkle = ({ x, y, s = 40, z = 9, color = "#D9B46A" }) =>
  `<svg viewBox="0 0 24 24" style="position:absolute;left:${x}px;top:${y}px;width:${s}px;height:${s}px;transform:translate(-50%,-50%);z-index:${z};filter:drop-shadow(0 1px 1px rgba(120,80,20,.25))"><path d="M12 0c.9 6.4 2.5 9.4 12 12-9.5 2.6-11.1 5.6-12 12-.9-6.4-2.5-9.4-12-12C9.5 9.4 11.1 6.4 12 0Z" fill="${color}"/></svg>`;

/** A gold binder clip, the kind that holds a photo to a board. */
const binderClip = ({ x, y, w = 120, r = 0, z = 10 }) =>
  `<svg viewBox="0 0 64 60" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;transform:translate(-50%,-50%) rotate(${r}deg);z-index:${z};filter:drop-shadow(0 5px 5px rgba(60,40,20,.32))">
     <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F4DFA6"/><stop offset=".5" stop-color="#D2AE63"/><stop offset="1" stop-color="#A9843F"/></linearGradient></defs>
     <path d="M20 30 C18 16 16 8 24 4 C30 1 34 1 40 4 C48 8 46 16 44 30" fill="none" stroke="#C9A55C" stroke-width="3.2" stroke-linecap="round"/>
     <path d="M6 30 L58 30 L52 56 L12 56 Z" fill="url(#g)"/>
     <path d="M6 30 L58 30 L56 37 L8 37 Z" fill="#F7E7BC" opacity=".7"/>
   </svg>`;

/** A pearl. */
const pearl = ({ x, y, s = 26, z = 9 }) =>
  `<span style="position:absolute;left:${x}px;top:${y}px;width:${s}px;height:${s}px;transform:translate(-50%,-50%);z-index:${z};border-radius:50%;background:radial-gradient(circle at 34% 30%, #FFFFFF 0 14%, #F4EEEA 40%, #D8CCC6 100%);box-shadow:0 3px 5px rgba(80,40,50,.28)"></span>`;

/** A few lines of old newsprint, for the scraps of newspaper under a collage. */
const NEWS = [
  ["Local couple still holding hands", "Witnesses on the high street confirmed on Sunday that the pair were holding hands again, as they have most days since they met. Asked for a comment, one of them said only: no plans to stop. Neighbours describe the two as annoyingly happy."],
  ["Evening walks continue", "Long walks after dinner remain the favourite activity in the household, a survey of two people found. The route rarely changes. Ice cream is involved more often than not."],
  ["Garden report", "The roses by the gate are thriving this year. So, by every account, is everything else. Gardeners recommend patience, sunlight and someone to sit with on the step while things grow."],
  ["Weather", "Clear skies through the weekend, with a warm spell wherever the two of them happen to be. Light rain on Tuesday, ideal for staying in."],
];
const newsprint = (first = 0, size = 15) =>
  `<div style="position:absolute;inset:6% 7%;font-family:Georgia,'Times New Roman',serif;color:#3B3632;columns:2;column-gap:18px;font-size:${size}px;line-height:1.32;text-align:justify;hyphens:auto">${[0, 1, 2, 3]
    .map((i) => NEWS[(first + i) % NEWS.length])
    .map(([h, b]) => `<b style="display:block;font-size:${Math.round(size * 1.5)}px;line-height:1.1;text-align:left;margin:0 0 4px">${h}</b><p style="margin:0 0 10px">${b}</p>`)
    .join("")}</div>`;

const page = (background, layers) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Homemade+Apple&family=Playfair+Display:ital@1&family=Special+Elite&display=block" rel="stylesheet">
<style>html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden}#c{position:relative;width:${W}px;height:${H}px;overflow:hidden;${background}}#c::after{content:"";position:absolute;inset:0;background-image:${GRAIN};mix-blend-mode:multiply;opacity:.55;z-index:50;pointer-events:none}img{display:block;max-width:none}</style></head>
<body><div id="c">${layers}</div></body></html>`;

// ── the designs ────────────────────────────────────────────────────────────────────────────────────

const PINK_FRAME = `background:#FCE6EC;background-image:${GRAIN}`;

const DESIGNS = [
  {
    name: "01-sakura-letters",
    pics: ["p1", "p2", "p7"],
    render: ([a, b, c]) =>
      page(
        "background:#F7D6DD",
        [
          // the papers underneath
          cut({ id: "paper-script", x: 250, y: 300, w: 760, r: -9, z: 1 }),
          paper({ x: 860, y: 250, w: 560, h: 470, r: 5, z: 1, seed: 3, fill: gingham("rgba(236,128,160,.45)", "#FFF6F8", 26) }),
          paper({ x: 470, y: 160, w: 380, h: 330, r: -5, z: 1, seed: 13, fill: `background:#F0A9BC;background-image:${GRAIN}`, inner: `<img src="${scrap("butterfly-black-wide")}" style="position:absolute;left:12%;top:14%;width:76%;filter:invert(1) sepia(1) saturate(3) hue-rotate(300deg) brightness(.92);mix-blend-mode:multiply;opacity:.55">` }),
          cut({ id: "paper-script", x: 170, y: 1230, w: 560, r: 84, z: 1, opacity: 0.95 }),
          paper({ x: 560, y: 1190, w: 520, h: 230, r: 8, z: 1, seed: 17, fill: `background:#F9E9DC;background-image:${GRAIN}`, inner: `<div style="position:absolute;inset:14% 8%;font-family:'Homemade Apple',cursive;font-size:24px;line-height:1.7;color:rgba(110,70,70,.55)">and every day since, a little more than the day before</div>` }),
          cut({ id: "paper-roses", x: 220, y: 1650, w: 900, r: 14, z: 1 }),
          cut({ id: "paper-blossom", x: 960, y: 1180, w: 760, r: -96, z: 1 }),
          paper({ x: 1010, y: 1560, w: 150, h: 900, r: 0, z: 2, seed: 9, sides: { left: 1 }, fill: `background-color:#FBE7EC;background-image:radial-gradient(circle, #EE9DB4 22%, transparent 24%);background-size:34px 34px` }),
          // the three frames
          frame({ x: 710, y: 560, w: 420, h: 520, r: 3, border: PINK_FRAME, pic: a }),
          frame({ x: 330, y: 960, w: 430, h: 530, r: -4, z: 5, border: PINK_FRAME, pic: b }),
          frame({ x: 640, y: 1450, w: 420, h: 520, r: 2, z: 4, border: PINK_FRAME, pic: c }),
          // flowers, bows and the label
          cut({ id: "sakura", x: 930, y: 1000, w: 270, r: 12, z: 7 }),
          cut({ id: "blossom-pale", x: 870, y: 1160, w: 230, r: -18, z: 7 }),
          cut({ id: "sakura", x: 1010, y: 1180, w: 200, r: 40, z: 6 }),
          cut({ id: "columbine", x: 120, y: 650, w: 240, r: -14, z: 7 }),
          cut({ id: "columbine", x: 1000, y: 330, w: 190, r: 20, z: 7 }),
          cut({ id: "blossom-pale", x: 390, y: 1720, w: 170, r: 24, z: 7 }),
          cut({ id: "bow-satin-pink", x: 520, y: 330, w: 230, r: -14, z: 8 }),
          cut({ id: "bow-satin-mini", x: 830, y: 1210, w: 170, r: 16, z: 8 }),
          cut({ id: "heart-print-pink", x: 900, y: 1720, w: 150, r: 12, z: 7 }),
          cut({ id: "star-glossy-small", x: 150, y: 1260, w: 120, r: -10, z: 7 }),
          paper({ x: 600, y: 1790, w: 400, h: 120, r: -3, z: 8, seed: 21, fill: `background:#EADBC6;background-image:${GRAIN}` }),
          words({ x: 600, y: 1792, text: "happiness", font: "'Playfair Display', serif", italic: true, size: 70, color: "#8C5D48", r: -3 }),
          sparkle({ x: 330, y: 470, s: 46 }),
          sparkle({ x: 370, y: 520, s: 26 }),
          sparkle({ x: 950, y: 820, s: 38 }),
          sparkle({ x: 120, y: 1390, s: 34 }),
          pearl({ x: 900, y: 300, s: 30 }),
          pearl({ x: 935, y: 330, s: 22 }),
          pearl({ x: 330, y: 1560, s: 28 }),
          pearl({ x: 360, y: 1590, s: 20 }),
        ].join(""),
      ),
  },
  {
    name: "02-gingham-picnic",
    pics: ["p2", "p1", "p6"],
    render: ([a, b, c]) => {
      const pinkGingham = gingham("rgba(238,120,155,.42)", "#FFF8FA", 13);
      return page(
        gingham("rgba(126,160,214,.30)", "#F5F8FC", 46),
        [
          paper({ x: 250, y: 260, w: 600, h: 440, r: -7, z: 1, seed: 5, fill: `background:#ECE7DF;background-image:${GRAIN}`, inner: newsprint(0, 15) }),
          paper({ x: 880, y: 1700, w: 560, h: 420, r: 8, z: 1, seed: 11, fill: `background:#ECE7DF;background-image:${GRAIN}`, inner: newsprint(2, 15) }),
          paper({ x: 960, y: 260, w: 460, h: 560, r: 10, z: 1, seed: 7, fill: `background:#F4C3CF;background-image:${GRAIN}, radial-gradient(120% 80% at 20% 10%, rgba(255,255,255,.45), transparent 60%)` }),
          frame({ x: 340, y: 560, w: 420, h: 500, r: -3, border: pinkGingham, pad: 0.08, lip: 0.17, pic: a }),
          frame({ x: 760, y: 980, w: 420, h: 500, r: 4, z: 5, border: pinkGingham, pad: 0.08, lip: 0.17, pic: b }),
          frame({ x: 330, y: 1420, w: 420, h: 500, r: -2, z: 4, border: pinkGingham, pad: 0.08, lip: 0.17, pic: c }),
          cut({ id: "lily-pink", x: 560, y: 1150, w: 400, r: -8, z: 8 }),
          cut({ id: "lily-stargazer", x: 900, y: 470, w: 300, r: 16, z: 7 }),
          cut({ id: "tulips-pink", x: 880, y: 1560, w: 360, r: -10, z: 7 }),
          cut({ id: "bow-gingham", x: 160, y: 330, w: 210, r: -16, z: 8 }),
          cut({ id: "star-glossy", x: 560, y: 760, w: 130, r: -8, z: 8 }),
          cut({ id: "star-glossy-small", x: 640, y: 840, w: 96, r: 14, z: 8 }),
          cut({ id: "heart-gingham", x: 130, y: 1080, w: 160, r: -12, z: 7 }),
          cut({ id: "cassette", x: 880, y: 1290, w: 230, r: 14, z: 6 }),
          cut({ id: "lily-blush", x: 120, y: 1790, w: 230, r: 22, z: 7 }),
          sparkle({ x: 610, y: 300, s: 44 }),
          sparkle({ x: 1010, y: 820, s: 32 }),
          sparkle({ x: 560, y: 1700, s: 40 }),
          pearl({ x: 470, y: 1690, s: 26 }),
          pearl({ x: 500, y: 1720, s: 18 }),
        ].join(""),
      );
    },
  },
  {
    name: "03-photo-booth-roses",
    pics: ["p1", "p2", "p7"],
    render: (pics) => {
      const wallpaper = `background-color:#F8DDE3;background-image:repeating-linear-gradient(90deg, rgba(255,255,255,.55) 0 46px, transparent 46px 92px), radial-gradient(circle, rgba(232,140,165,.5) 3px, transparent 4px);background-size:auto, 46px 46px`;
      return page(
        wallpaper,
        [
          cut({ id: "paper-script", x: 820, y: 1030, w: 640, r: 82, z: 1 }),
          paper({ x: 250, y: 1840, w: 700, h: 300, r: 3, z: 1, seed: 31, fill: `background:#F3C5D0;background-image:${GRAIN}` }),
          strip({ x: 290, y: 940, w: 400, r: -3, z: 5, border: `${gingham("rgba(236,120,155,.42)", "#FFF6F8", 11)}`, pics, label: "us. ♡", labelColor: "#9A4E64" }),
          cut({ id: "bow-satin-pink", x: 790, y: 290, w: 470, r: 6, z: 8 }),
          cut({ id: "roses-kraft", x: 800, y: 760, w: 360, r: 6, z: 6 }),
          cut({ id: "peony-kraft", x: 960, y: 1020, w: 280, r: -12, z: 5 }),
          cut({ id: "teddy", x: 770, y: 1310, w: 330, r: -4, z: 7 }),
          paper({
            x: 760,
            y: 1700,
            w: 470,
            h: 300,
            r: -6,
            z: 8,
            seed: 41,
            sides: {},
            rim: "#FFFFFF",
            fill: `background:#FBF6EE;background-image:${GRAIN}`,
            inner: `<div style="position:absolute;left:8%;top:14%;width:56%;font-family:'Homemade Apple',cursive;font-size:30px;line-height:1.55;color:#5A3A40;transform:rotate(-2deg)">you're my favorite place to be</div>
                    <div style="position:absolute;right:7%;top:12%;width:88px;height:106px;background:#F3B5C4;border:5px dotted #FBF6EE;outline:2px solid rgba(160,90,110,.25)"></div>
                    <div style="position:absolute;left:66%;top:20%;bottom:16%;border-left:2px solid rgba(90,58,64,.25)"></div>`,
          }),
          cut({ id: "kiss-3", x: 900, y: 1790, w: 130, r: -14, z: 9, opacity: 0.9 }),
          cut({ id: "butterfly-black-wide", x: 980, y: 560, w: 170, r: 18, z: 8, tone: TONE.pinkWings }),
          cut({ id: "lily-blush", x: 130, y: 250, w: 230, r: -20, z: 7 }),
          cut({ id: "heart-puffy", x: 560, y: 1460, w: 120, r: 12, z: 7 }),
          cut({ id: "lily-pink", x: 150, y: 1770, w: 300, r: -18, z: 7 }),
          cut({ id: "columbine", x: 420, y: 1800, w: 200, r: 12, z: 6 }),
          cut({ id: "sakura", x: 520, y: 470, w: 160, r: 10, z: 7 }),
          sparkle({ x: 600, y: 160, s: 44 }),
          sparkle({ x: 1000, y: 1460, s: 36 }),
          sparkle({ x: 560, y: 1120, s: 30 }),
          pearl({ x: 600, y: 900, s: 28 }),
          pearl({ x: 620, y: 935, s: 20 }),
        ].join(""),
      );
    },
  },
  {
    name: "04-love-letter",
    pics: ["p2", "p1", "p7", "p6"],
    render: ([big, ...small]) => {
      const crumpled = `<svg width="${W}" height="${H}" style="position:absolute;inset:0;z-index:0"><filter id="crumple" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.0055 0.008" numOctaves="5" seed="7"/><feDiffuseLighting lighting-color="#F8F3EC" surfaceScale="7"><feDistantLight azimuth="225" elevation="62"/></feDiffuseLighting></filter><rect width="100%" height="100%" filter="url(#crumple)"/></svg>`;
      return page(
        "background:#F4EFE8",
        [
          crumpled,
          cut({ id: "envelope-ps", x: 250, y: 280, w: 430, r: -11, z: 3 }),
          frame({ x: 650, y: 760, w: 640, h: 770, r: 3, z: 5, border: `background:#FFFFFF`, pad: 0.06, lip: 0.15, pic: big, blank: "#ECE8E3", caption: "my favorite view.", captionColor: "#3D3532" }),
          binderClip({ x: 655, y: 392, w: 130, r: 3 }),
          strip({ x: 230, y: 1380, w: 330, r: -5, z: 6, border: `background:#FFFFFF`, pics: small, blank: "#ECE8E3", pad: 0.08, foot: 0.12 }),
          cut({ id: "kiss-1", x: 920, y: 330, w: 250, r: 14, z: 6 }),
          cut({ id: "tulips-wrapped", x: 880, y: 1330, w: 360, r: 8, z: 7 }),
          cut({ id: "heart-print-pink", x: 560, y: 1290, w: 140, r: -8, z: 7 }),
          cut({ id: "star-glossy", x: 470, y: 1620, w: 150, r: 10, z: 7 }),
          cut({ id: "tag-tofrom", x: 800, y: 1720, w: 300, r: -8, z: 7 }),
          cut({ id: "plumeria-pink", x: 150, y: 750, w: 190, r: -10, z: 6 }),
          words({ x: 300, y: 560, text: "love letter", font: "'Homemade Apple', cursive", size: 40, color: "#B4566F", r: -8 }),
          sparkle({ x: 1000, y: 820, s: 40 }),
          sparkle({ x: 120, y: 1000, s: 30 }),
          sparkle({ x: 1000, y: 1560, s: 34 }),
          pearl({ x: 620, y: 1500, s: 26 }),
          pearl({ x: 650, y: 1530, s: 18 }),
        ].join(""),
      );
    },
  },
  {
    name: "05-patchwork-bows",
    pics: ["p7", "p4", "p5"],
    render: ([a, b, c]) => {
      const patch = (x, y, w, h, fill, seed, r = 0) => paper({ x, y, w, h, r, z: 1, seed, depth: 1.2, rim: "#FFFFFF", fill: `${fill};box-shadow:inset 0 0 0 9px transparent`, inner: `<div style="position:absolute;inset:16px;border:3px dashed rgba(255,255,255,.75)"></div>` });
      const plaid = `background-color:#8FA7C8;background-image:repeating-linear-gradient(90deg, rgba(255,255,255,.28) 0 6px, transparent 6px 46px, rgba(40,60,100,.18) 46px 58px, transparent 58px 92px), repeating-linear-gradient(0deg, rgba(255,255,255,.28) 0 6px, transparent 6px 46px, rgba(40,60,100,.18) 46px 58px, transparent 58px 92px)`;
      const floral = `background-color:#FFF7F2;background-image:radial-gradient(circle at 30% 30%, #F2A8BC 0 7px, transparent 8px), radial-gradient(circle at 70% 70%, #B9D8B0 0 4px, transparent 5px);background-size:70px 70px`;
      const hearts = `background-color:#F7CDD7;background-image:radial-gradient(circle, rgba(255,255,255,.7) 4px, transparent 5px);background-size:38px 38px`;
      const lace = `background:#F7C3CF;background-image:radial-gradient(circle at 50% 50%, rgba(255,255,255,.95) 0 5px, transparent 6px), ${GRAIN};background-size:26px 26px, auto`;
      return page(
        "background:#EFD9DE",
        [
          patch(270, 300, 620, 660, plaid, 1, -2),
          patch(830, 260, 560, 600, gingham("rgba(236,120,155,.42)", "#FFF6F8", 22), 2, 3),
          patch(230, 980, 540, 620, floral, 3, 2),
          patch(860, 960, 520, 640, hearts, 4, -3),
          patch(260, 1640, 640, 640, gingham("rgba(126,160,214,.34)", "#F7FAFD", 26), 5, 3),
          patch(840, 1660, 560, 620, plaid, 6, -2),
          frame({ x: 540, y: 420, w: 660, h: 480, r: -1, z: 5, border: lace, pad: 0.1, lip: 0.1, pic: a, stitch: "rgba(255,255,255,.95)" }),
          frame({ x: 540, y: 960, w: 660, h: 480, r: 1.5, z: 5, border: lace, pad: 0.1, lip: 0.1, pic: b, stitch: "rgba(255,255,255,.95)" }),
          frame({ x: 540, y: 1500, w: 660, h: 480, r: -1, z: 5, border: lace, pad: 0.1, lip: 0.1, pic: c, stitch: "rgba(255,255,255,.95)" }),
          cut({ id: "bow-satin-mini", x: 240, y: 205, w: 150, r: -16, z: 8 }),
          cut({ id: "bow-satin-mini", x: 840, y: 1735, w: 150, r: 16, z: 8 }),
          cut({ id: "teddy", x: 930, y: 190, w: 250, r: 8, z: 8 }),
          cut({ id: "hibiscus-pink", x: 960, y: 760, w: 250, r: 14, z: 8 }),
          cut({ id: "butterfly-black-wide", x: 990, y: 1080, w: 170, r: -14, z: 8, tone: TONE.pinkWings }),
          cut({ id: "star-glossy", x: 110, y: 650, w: 160, r: -12, z: 8 }),
          cut({ id: "envelopes-pair", x: 120, y: 1090, w: 230, r: -10, z: 8 }),
          cut({ id: "bow-satin-pink", x: 980, y: 1380, w: 250, r: 10, z: 8 }),
          cut({ id: "plumeria-pink", x: 120, y: 1520, w: 210, r: -8, z: 8 }),
          cut({ id: "heart-puffy", x: 120, y: 240, w: 120, r: -10, z: 8 }),
          cut({ id: "lily-blush", x: 960, y: 1810, w: 230, r: 20, z: 8 }),
          sparkle({ x: 120, y: 1780, s: 40 }),
          sparkle({ x: 1000, y: 560, s: 32 }),
          pearl({ x: 100, y: 820, s: 28 }),
          pearl({ x: 125, y: 850, s: 20 }),
        ].join(""),
      );
    },
  },
];

// ── render ─────────────────────────────────────────────────────────────────────────────────────────

const only = process.argv[2];
mkdirSync(OUT, { recursive: true });
const work = join(tmpdir(), "collage-frames");
mkdirSync(work, { recursive: true });
const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
for (const design of DESIGNS) {
  if (only && !design.name.includes(only)) continue;
  for (const [suffix, pics] of [["", []], ["-filled", design.pics]]) {
    const file = join(work, `${design.name}${suffix}.html`);
    writeFileSync(file, design.render(pics));
    await tab.goto(`file://${file}`, { waitUntil: "networkidle" });
    await tab.evaluate(() => document.fonts.ready);
    await tab.screenshot({ path: join(OUT, `${design.name}${suffix}.png`), clip: { x: 0, y: 0, width: W, height: H } });
    console.log("rendered", `${design.name}${suffix}.png`);
  }
}
await browser.close();
