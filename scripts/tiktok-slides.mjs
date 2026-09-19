/**
 * Renders iMessage chat slides (1080×1920, dark mode) for TikTok photo carousels from a script
 * JSON, drawn to iOS 18 Messages at @3x: 17pt text, 18pt corners, colour Tapbacks and rich link
 * previews. Uses the Mac's system font through Chromium, so the type is the real thing.
 *   node scripts/tiktok-slides.mjs docs/marketing/tiktok-01/script.json docs/marketing/tiktok-01
 * Add --sheet for sheet.png: the whole post at a quarter size, hand-made slides as labelled gaps.
 *
 * Message shapes: { from: "me"|"them", text } · { image: true } · { typing: true } · { ts } ·
 * { system } (a grey note such as "You unsent a message.") ·
 * { link: { title, domain, image?: "og", name?, lang? } } · plus optional { status } and { tapback }.
 * A "|" in a timestamp marks where its semibold part ends: "Mon 15 Sept 2025|at 23:48".
 *
 * `"hook": "..."` on a slide draws the line of text a creator types over the image, in TikTok's own
 * style, near the top. Use it on slide 1: it is the only thing legible at thumbnail size, and a
 * carousel whose first slide says nothing dies in the test pool. "\n" breaks the line.
 *
 * `"theme": "light"` draws the same iMessage in light mode — white page, grey bubbles — which is what
 * the storytime accounts that do millions actually post.
 *
 * `"style": "messenger"` draws a light-mode DM thread — white page, grey and blue pills, and a
 * round profile picture beside every message on both sides. `"avatars": { "me": "him.jpg",
 * "them": "her.jpg" }` in the script (paths relative to the script) puts real faces in the
 * circles; a missing file falls back to a drawn one, so a script renders before the photos exist.
 *
 * A slide can also be `{ "type": "photo", "src": "cover.jpg", "caption": "POV: ..." }` — the
 * picture that opens a story, full bleed, with the line over it. "\n" breaks the line. Without a
 * caption the picture is left as it is, which is how a gift frame goes in: `{ "type": "photo",
 * "src": "gift-1.png" }`, a 1080×1920 capture of the gift from scripts/tiktok-demo-frames.mjs.
 *
 * `"style": "instagram"` draws Instagram DMs instead, dark mode, with `"contact": { name, sub, avatar }`
 * in the header. Messages there take { reaction: "❤️" } and { status: "Seen" }.
 *
 * A group chat: `{ from: "them", name: "Priya", text }` sets the small grey sender name iOS shows
 * over a grey bubble when a thread has more than two people. It is drawn when the name changes
 * from the message above, exactly as Messages does, so a run from one person carries it once.
 *
 * `{ "type": "note", "title": "for everyone asking", "date": "19 September 2026 at 00:14",
 * "lines": ["tryethos, the balloons one", ...] }` draws an Apple Notes screenshot, light mode: the
 * slide people save. A line that starts with "- " is a bulleted list item, "[] " a checklist box,
 * "[x] " a ticked one, "# " a heading, and "" a blank line.
 */
import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";

// The link card is drawn with the same serif the product embeds in its real og:image.
const face = (file) => readFileSync(join(import.meta.dirname, "../src/fonts", file)).toString("base64");
const SERIF = face("newsreader-regular.ttf");
const SERIF_ITALIC = face("newsreader-italic.ttf");

// The type is SF Pro, which a Mac has as its system font, so there these are the real thing. Anywhere
// else Chromium used to fall through the stack to Arial — wider, rounder, and the half-second tell.
// Inter (OFL, scripts/fonts) is embedded as a stand-in only a non-Mac ever reaches: at 97% it sets
// every bubble of carousel 91 within 2px of the Mac's widths, line breaks included, because at these
// sizes it picks its Display cut just as SF does. Final posts are still best rendered on the Mac.
const STAND_IN = readFileSync(join(import.meta.dirname, "fonts/Inter-Variable.ttf")).toString("base64");
const STAND_IN_FACE = `@font-face{font-family:"iMessage Stand-in";src:url(data:font/ttf;base64,${STAND_IN}) format("truetype");font-weight:100 900;size-adjust:97%}`;
const SYSTEM = `-apple-system,BlinkMacSystemFont,"SF Pro Text","iMessage Stand-in","Helvetica Neue",Helvetica,Arial,sans-serif`;

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const SHEET = process.argv.includes("--sheet");
const [scriptPath, outDir] = [args[0], args[1] ?? "."];
const script = JSON.parse(readFileSync(scriptPath, "utf8"));
mkdirSync(outDir, { recursive: true });

// iOS 18 draws Tapbacks in colour whichever side sent them; the heart is red.
const ICONS = {
  heart: `<svg viewBox="0 0 24 24" width="46" height="46"><path d="M12 21.3s-7.9-4.8-10.1-9.6C.4 8.3 2.3 4.2 6.3 4.2c2.1 0 3.7 1.2 5.7 3.4 2-2.2 3.6-3.4 5.7-3.4 4 0 5.9 4.1 4.4 7.5C19.9 16.5 12 21.3 12 21.3Z" fill="#FF3B55"/></svg>`,
  haha: `<span class="haha">HA<br>HA</span>`,
  excl: `<span class="excl">!!</span>`,
  like: `<span class="emoji">👍</span>`,
};
// Tapbacks sit on the top corner that faces the middle of the screen, with a thought-bubble tail.
const tapback = (m) => {
  const mine = m.from !== "me"; // I react to their message, they react to mine
  const side = m.from === "me" ? "left" : "right";
  return `<div class="tap ${mine ? "mine" : "theirs"} ${side}"><i></i>${ICONS[m.tapback] ?? ICONS.excl}</div>`;
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
// "Today 19:42" → the day in semibold, the time in regular, as iOS sets it.
const stamp = (s) => {
  const text = String(s);
  const [head, ...rest] = text.includes("|") ? text.split("|") : text.split(" ");
  return rest.length ? `<b>${esc(head)}</b> ${esc(rest.join(" "))}` : `<b>${esc(head)}</b>`;
};

const OG_CSS = `
    .og{position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(70% 90% at 16% 6%,#F6DAD3 0%,rgba(246,218,211,0) 62%),radial-gradient(62% 85% at 88% 94%,#DDE7D9 0%,rgba(221,231,217,0) 60%),#F7F1E7;color:#17130F;text-align:center;padding:0 24px 30px;box-sizing:border-box}
    .og-frame{position:absolute;inset:14px;border:1px solid rgba(23,19,15,.14);border-radius:10px}
    .og-seal{width:49px;height:49px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 36% 30%,#F4C7C3,#E8604C 48%,#B23A2E 100%);box-shadow:0 10px 24px rgba(232,96,76,.32)}
    .og-seal svg{width:22px;height:22px}
    .og-eyebrow{margin-top:18px;font-family:Newsreader,Georgia,serif;font-size:17px;letter-spacing:5.9px;color:rgba(23,19,15,.5)}
    .og-name{margin-top:6px;font-family:Newsreader,Georgia,serif;font-size:82px;line-height:1;letter-spacing:-2px;white-space:nowrap}
    .og-line{margin-top:8px;font-family:Newsreader,Georgia,serif;font-style:italic;font-size:31px;color:rgba(23,19,15,.62);white-space:nowrap}
    .og-domain{position:absolute;bottom:30px;font-family:Newsreader,Georgia,serif;font-size:15px;letter-spacing:4px;color:rgba(23,19,15,.4)}
`;

/** The preview image iMessage pulls from a gift link: tryethos.io's og:image, drawn to match. */
const ogImage = (name, lang) => {
  const es = lang === "es";
  return `
  <div class="og">
    <div class="og-frame"></div>
    <div class="og-seal"><svg viewBox="0 0 24 24"><path d="M12 20.8s-7.2-4.4-9.2-8.8C1.4 8.6 3.1 4.8 6.8 4.8c2 0 3.5 1.1 5.2 3.2 1.7-2.1 3.2-3.2 5.2-3.2 3.7 0 5.4 3.8 4 7.2-2 4.4-9.2 8.8-9.2 8.8Z" fill="#FFF8F4"/></svg></div>
    <div class="og-eyebrow">${es ? "UN REGALO PARA" : "A GIFT FOR"}</div>
    <div class="og-name">${esc(name ?? "Hey")}</div>
    <div class="og-line">${es ? "alguien te ha hecho algo" : "someone made you something"}</div>
    <div class="og-domain">TRYETHOS.IO</div>
  </div>`;
};

/**
 * The hook a creator types over the first slide. Kept inside TikTok's safe area — clear of the
 * search bar at the top and the caption and buttons at the bottom — and heavy enough to read when
 * the post is a thumbnail in a feed.
 */
const HOOK_CSS = `
    .hook{position:absolute;top:232px;left:70px;right:70px;text-align:center;font-size:54px;line-height:1.16;font-weight:700;letter-spacing:-.6px;color:#fff;text-shadow:0 3px 20px rgba(0,0,0,.9),0 1px 3px rgba(0,0,0,.95);z-index:5}
    .stage.has-hook{justify-content:flex-start;padding-top:440px}
`;
const hookHtml = (slide) => (slide.hook ? `<div class="hook">${esc(slide.hook).replace(/\n/g, "<br>")}</div>` : "");


/** iMessage in light mode: every colour the dark drawing hard-codes, turned the other way. */
const LIGHT_CSS = `
    html,body{background:#fff}
    .in{background:#E9E9EB;color:#000}
    .in.last::after,.out.last::after,.link.last::after{background:#fff}
    .in.last::before{background:#E9E9EB}
    .link{background:#E9E9EB}
    .link.tail-l::before,.link.tail-r::before{background:#E9E9EB}
    .lk-title{color:#000}
    .typing .t1,.typing .t2{background:#E9E9EB}
    .tap{box-shadow:0 0 0 6px #fff}
    .tap i{box-shadow:0 0 0 4px #fff}
    .tap.theirs{background:#E9E9EB}
`;

function html(slide) {
  const rows = slide.messages
    .map((m, i, all) => {
      if (m.ts) return `<div class="ts mid">${stamp(m.ts)}</div>`;
      if (m.system) return `<div class="sys">${esc(m.system)}</div>`;
      const next = all[i + 1];
      const last = !next || next.from !== m.from || Boolean(next.ts) || Boolean(next.typing);
      const cls = `${m.from === "me" ? "out" : "in"}${last ? " last" : ""}`;
      const row = m.from === "me" ? "r" : "l";
      const status = m.status ? `<div class="status">${stamp(m.status)}</div>` : "";
      if (m.typing) {
        return `<div class="row l"><div class="bubble in typing"><span></span><span></span><span></span><i class="t1"></i><i class="t2"></i></div></div>`;
      }
      if (m.image) {
        return `<div class="row ${row}"><div class="media">${m.tapback ? tapback(m) : ""}<div class="ph"><i class="a"></i><i class="b"></i><i class="c"></i><i class="d"></i></div></div></div>`;
      }
      if (m.link) {
        // A rich link is a grey card on either side; only its alignment and tail change.
        const tail = last ? ` last ${m.from === "me" ? "tail-r" : "tail-l"}` : "";
        const img = m.link.image === "og" ? `<div class="lk-img">${ogImage(m.link.name, m.link.lang)}</div>` : "";
        return `<div class="row ${row} ${status ? "has-status" : ""}"><div class="bubble link${tail}${img ? " big" : ""}">${img}<div class="lk-foot"><div class="lk-text"><div class="lk-title">${esc(m.link.title)}</div><div class="lk-domain">${esc(m.link.domain)}</div></div>${img ? "" : `<div class="lk-thumb">${ogImage(m.link.name, m.link.lang)}</div>`}</div>${m.tapback ? tapback(m) : ""}</div>${status}</div>`;
      }
      // In a group, the name over the first bubble of a run from someone new, as Messages sets it.
      const prev = all[i - 1];
      const named = m.from !== "me" && m.name && (!prev || prev.from === "me" || prev.name !== m.name || Boolean(prev.ts));
      const name = named ? `<div class="who">${esc(m.name)}</div>` : "";
      return `<div class="row ${row} ${status ? "has-status" : ""}${m.tapback ? " has-tap" : ""}${name ? " named" : ""}">${name}<div class="bubble ${cls}">${esc(m.text)}${m.tapback ? tapback(m) : ""}</div>${status}</div>`;
    })
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><style>${STAND_IN_FACE}
    @font-face{font-family:Newsreader;src:url(data:font/ttf;base64,${SERIF}) format("truetype");font-style:normal}
    @font-face{font-family:Newsreader;src:url(data:font/ttf;base64,${SERIF_ITALIC}) format("truetype");font-style:italic}
    html,body{margin:0;background:#000;width:1080px;height:1920px;overflow:hidden}
    body{font-family:${SYSTEM};color:#fff;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
    .stage{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 48px 0 42px}
    .who{flex-basis:100%;color:#8e8e93;font-size:33px;line-height:40px;letter-spacing:-.2px;padding-left:38px;margin-bottom:6px}
    .row.named{margin-top:22px}
    .ts{text-align:center;color:#8e8e93;font-size:35px;margin:0 0 30px;letter-spacing:-.2px}
    .ts b{font-weight:600}
    .ts.mid{margin:36px 0 26px}
    .row{display:flex;width:100%;flex-wrap:wrap}
    .row.r{justify-content:flex-end}
    .row + .row{margin-top:6px}
    .row.l + .row.r, .row.r + .row.l{margin-top:28px}
    /* iOS opens up space above a message that carries a Tapback, so the reaction never sits on the bubble above,
       including when the message above came from the other side. */
    .row:has(.tap), .row.l + .row.r:has(.tap), .row.r + .row.l:has(.tap){margin-top:72px}
    .status{flex-basis:100%;text-align:right;color:#8e8e93;font-size:33px;margin-top:8px;padding-right:12px;letter-spacing:-.1px}
    .status b{font-weight:600}
    .sys{text-align:center;color:#8e8e93;font-size:35px;line-height:44px;margin:34px 70px;letter-spacing:-.2px}

    .bubble{position:relative;max-width:73%;padding:20px 38px 21px;border-radius:54px;font-size:51px;line-height:66px;letter-spacing:-.9px;word-wrap:break-word;box-sizing:border-box}
    .in{background:#262629}
    .out{background:#0B84FF}
    /* The tail: a curved spur on the last bubble of a run, cut out of the black behind it. */
    .in.last::before,.out.last::before,.link.last::before{content:"";position:absolute;bottom:0;width:48px;height:46px}
    .in.last::after,.out.last::after,.link.last::after{content:"";position:absolute;bottom:0;width:26px;height:46px;background:#000}
    .in.last::before{left:-17px;background:#262629;border-bottom-right-radius:38px 32px}
    .in.last::after{left:-26px;border-bottom-right-radius:24px}
    .out.last::before{right:-17px;background:#0B84FF;border-bottom-left-radius:38px 32px}
    .out.last::after{right:-26px;border-bottom-left-radius:24px}
    .link.tail-l::before{left:-17px;background:#262629;border-bottom-right-radius:38px 32px}
    .link.tail-l::after{left:-26px;border-bottom-right-radius:24px}
    .link.tail-r::before{right:-17px;background:#262629;border-bottom-left-radius:38px 32px}
    .link.tail-r::after{right:-26px;border-bottom-left-radius:24px}

    .typing{display:flex;gap:11px;align-items:center;padding:34px 36px;border-radius:54px;overflow:visible}
    .typing span{width:19px;height:19px;border-radius:50%;background:#8e8e93;display:block}
    .typing span:nth-child(2){opacity:.7}.typing span:nth-child(3){opacity:.45}
    .typing .t1,.typing .t2{position:absolute;border-radius:50%;background:#262629}
    .typing .t1{width:26px;height:26px;left:-6px;bottom:-4px}
    .typing .t2{width:12px;height:12px;left:-20px;bottom:-16px}

    .tap{position:absolute;top:-74px;width:84px;height:84px;border-radius:50%;display:grid;place-items:center;box-shadow:0 0 0 6px #000;z-index:2}
    .tap.mine{background:#0B84FF}
    .tap.theirs{background:#3A3A3C}
    .tap.right{right:-46px}
    .tap.left{left:-46px}
    .tap i{position:absolute;width:16px;height:16px;border-radius:50%;background:inherit;box-shadow:0 0 0 4px #000;bottom:-6px}
    .tap.right i{left:3px}
    .tap.left i{right:3px}
    .haha{font-size:26px;font-weight:800;line-height:24px;text-align:center;color:#fff;letter-spacing:-.5px}
    .excl{font-size:46px;font-weight:800;color:#FF3B55;letter-spacing:-3px}
    .emoji{font-size:44px}

    .media{position:relative}
    .ph{width:560px;height:720px;border-radius:54px;overflow:hidden;position:relative;background:#3a3233}
    .ph i{position:absolute;border-radius:50%;filter:blur(40px);opacity:.9}
    .ph .a{width:380px;height:440px;left:40px;top:90px;background:#c9a58c}
    .ph .b{width:320px;height:400px;left:270px;top:160px;background:#8b6f63}
    .ph .c{width:560px;height:280px;left:0;top:500px;background:#2a2224}
    .ph .d{width:240px;height:220px;left:160px;top:-40px;background:#6b7a8f}

    .link{background:#262629;padding:0;overflow:visible;width:auto;max-width:78%}
    .link.big{width:788px}
    .lk-img{height:412px;border-radius:54px 54px 0 0;overflow:hidden}
    .lk-foot{display:flex;align-items:center;gap:26px;padding:26px 36px 28px}
    .link:not(.big) .lk-foot{padding:26px 26px 26px 38px}
    .lk-text{min-width:0;flex:1}
    .lk-title{font-weight:600;font-size:44px;line-height:54px;letter-spacing:-.6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .lk-domain{color:#8e8e93;font-size:37px;margin-top:4px;letter-spacing:-.3px}
    .lk-thumb{flex:none;width:136px;height:136px;border-radius:24px;overflow:hidden}
    .lk-thumb .og-eyebrow,.lk-thumb .og-name,.lk-thumb .og-line,.lk-thumb .og-domain,.lk-thumb .og-frame{display:none}
    .lk-thumb .og-seal{width:64px;height:64px;margin:0}
    .lk-thumb .og-seal svg{width:28px;height:28px}

    ${OG_CSS}
    ${HOOK_CSS}
    ${script.theme === "light" ? LIGHT_CSS : ""}
  </style></head><body>${hookHtml(slide)}<div class="stage${slide.hook ? " has-hook" : ""}">${slide.timestamp ? `<div class="ts">${stamp(slide.timestamp)}</div>` : ""}${rows}</div></body></html>`;
}

/* Instagram DMs, dark mode, at the same @3x scale. */
// The sent gradient is pinned to the screen as in the app, so higher bubbles are more purple.
const IG_GRADIENT = "linear-gradient(180deg,#B432F5 0%,#8B3BF4 36%,#6B47F5 68%,#4F57F6 100%)";
const IG_ICONS = {
  back: `<svg viewBox="0 0 24 24"><path d="M15.5 4 7.5 12l8 8" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  call: `<svg viewBox="0 0 24 24"><path d="M6.7 3.6h2.5l1.5 4-2 1.5a11.3 11.3 0 0 0 6.2 6.2l1.5-2 4 1.5v2.5a2.1 2.1 0 0 1-2.3 2.1A17.3 17.3 0 0 1 4.6 5.9a2.1 2.1 0 0 1 2.1-2.3Z" fill="none" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
  video: `<svg viewBox="0 0 24 24"><rect x="2.4" y="6" width="13.2" height="12" rx="3" fill="none" stroke="#fff" stroke-width="1.7"/><path d="m15.6 10.3 5.4-3.1v9.6l-5.4-3.1Z" fill="none" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
  camera: `<svg viewBox="0 0 24 24"><path d="M8.6 5.2 9.9 3.6h4.2l1.3 1.6H19a2.2 2.2 0 0 1 2.2 2.2v10.4a2.2 2.2 0 0 1-2.2 2.2H5a2.2 2.2 0 0 1-2.2-2.2V7.4A2.2 2.2 0 0 1 5 5.2Z" fill="#fff"/><circle cx="12" cy="12.4" r="3.7" fill="#7443F5"/></svg>`,
  mic: `<svg viewBox="0 0 24 24"><rect x="9" y="2.8" width="6" height="11.4" rx="3" fill="none" stroke="#fff" stroke-width="1.7"/><path d="M5.6 11a6.4 6.4 0 0 0 12.8 0M12 17.4v3.8" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  photo: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4.5" fill="none" stroke="#fff" stroke-width="1.7"/><circle cx="8.8" cy="8.8" r="1.7" fill="#fff"/><path d="m3.6 16.8 4.8-4.8 3.9 3.9 2.8-2.8 5.3 5.3" fill="none" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
  sticker: `<svg viewBox="0 0 24 24"><path d="M13.6 21H7.5A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3h9A4.5 4.5 0 0 1 21 7.5v6.1Z" fill="none" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/><path d="M13.6 21v-3a4.4 4.4 0 0 1 4.4-4.4h3" fill="none" stroke="#fff" stroke-width="1.7"/><circle cx="9" cy="9.8" r="1.1" fill="#fff"/><circle cx="15" cy="9.8" r="1.1" fill="#fff"/></svg>`,
};
// A sunset at thumbnail size: the kind of photo people use instead of their face.
const AVATAR_SKIES = [
  ["#1c2340", "#b0605a", "#f5c48f"],
  ["#14303c", "#4f89a2", "#f0dab6"],
  ["#2a1c2f", "#93597f", "#f3c7d0"],
];
let avatarCount = 0;
const avatar = (sky = 0) => {
  const id = `av${avatarCount++}`;
  const [deep, mid, glow] = AVATAR_SKIES[sky % AVATAR_SKIES.length];
  return `<svg viewBox="0 0 100 100"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${deep}"/><stop offset=".55" stop-color="${mid}"/><stop offset=".8" stop-color="${glow}"/></linearGradient><filter id="${id}f" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.6"/></filter></defs><rect width="100" height="100" fill="url(#${id})"/><g filter="url(#${id}f)"><circle cx="62" cy="71" r="11" fill="#fff1d6" opacity=".9"/><circle cx="22" cy="26" r="3" fill="#fff" opacity=".45"/><circle cx="80" cy="18" r="2.4" fill="#fff" opacity=".4"/></g><path d="M0 78c14-6 26-5 38-1s26 5 38 0 18-4 24-2V100H0Z" fill="${deep}" opacity=".92"/><path d="M0 88c20-4 40-2 60 1s30 2 40 0V100H0Z" fill="#0b0d16" opacity=".85"/></svg>`;
};


// Pictures live next to the script, so a carousel folder holds its own faces and cover.
const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };
function localImage(src) {
  if (!src) return null;
  const file = isAbsolute(src) ? src : join(dirname(scriptPath), src);
  if (!existsSync(file)) return null;
  const ext = file.toLowerCase().split(".").pop();
  return `data:${MIME[ext] ?? "image/jpeg"};base64,${readFileSync(file).toString("base64")}`;
}

function igHtml(slide) {
  const contact = script.contact ?? {};
  const sky = contact.avatar ?? 0;
  const items = slide.timestamp ? [{ ts: slide.timestamp }, ...slide.messages] : slide.messages;
  const same = (a, b) => Boolean(a && b && !a.ts && !a.system && !b.ts && !b.system && a.from === b.from);
  const rows = items
    .map((m, i) => {
      if (m.ts || m.system) return `<div class="ig-ts">${esc(m.ts ?? m.system)}</div>`;
      const first = !same(items[i - 1], m);
      const last = !same(m, items[i + 1]);
      const side = m.from === "me" ? "out" : "in";
      const pos = first && last ? "solo" : first ? "first" : last ? "last" : "mid";
      const react = m.reaction ? `<span class="ig-react">${esc(m.reaction)}</span>` : "";
      const body = m.link
        ? `<div class="ig-link">${react}<div class="ig-link-img"><div class="ig-og">${ogImage(m.link.name, m.link.lang)}</div></div><div class="ig-link-foot"><div class="ig-link-title">${esc(m.link.title)}</div><div class="ig-link-domain">${esc(m.link.domain)}</div></div></div>`
        : `<div class="ig-bubble ${side} ${pos}">${esc(m.text)}${react}</div>`;
      // Instagram shows their picture once, beside the last message of each run.
      const face = side === "in" ? `<div class="ig-face">${last ? avatar(sky) : ""}</div>` : "";
      const seen = m.status ? `<div class="ig-seen">${esc(m.status)}</div>` : "";
      return `<div class="ig-row ${side}${first ? " starts" : ""}${m.reaction ? " reacted" : ""}">${face}${body}</div>${seen}`;
    })
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><style>${STAND_IN_FACE}
    @font-face{font-family:Newsreader;src:url(data:font/ttf;base64,${SERIF}) format("truetype");font-style:normal}
    @font-face{font-family:Newsreader;src:url(data:font/ttf;base64,${SERIF_ITALIC}) format("truetype");font-style:italic}
    html,body{margin:0;background:#000;width:1080px;height:1920px;overflow:hidden}
    body{font-family:${SYSTEM};color:#fff;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
    .ig-head{position:absolute;left:0;right:0;top:0;height:300px;padding:150px 60px 0 30px;box-sizing:border-box;display:flex;align-items:center;background:#000;z-index:3}
    .ig-head>svg{width:78px;height:78px;flex:none}
    .ig-avatar{width:112px;height:112px;border-radius:50%;overflow:hidden;flex:none;margin-left:12px}
    .ig-avatar svg,.ig-face svg{display:block;width:100%;height:100%}
    .ig-who{margin-left:30px;flex:1;min-width:0}
    .ig-name{font-size:50px;line-height:60px;font-weight:600;letter-spacing:-.5px}
    .ig-sub{font-size:38px;line-height:48px;color:#a8a8a8;letter-spacing:-.2px}
    .ig-icons{display:flex;gap:64px;align-items:center}
    .ig-icons svg{width:80px;height:80px}
    .ig-thread.has-hook{padding-top:440px}
    .ig-thread{position:absolute;left:0;right:0;top:300px;bottom:330px;padding:0 40px 0 36px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:flex-end}
    .ig-ts{text-align:center;color:#a8a8a8;font-size:37px;font-weight:500;margin:40px 60px 34px;letter-spacing:-.2px}
    .ig-row{display:flex;align-items:flex-end;margin-top:6px;position:relative}
    .ig-row.out{justify-content:flex-end}
    .ig-row.starts{margin-top:34px}
    .ig-ts+.ig-row{margin-top:0}
    .ig-row.reacted{margin-bottom:46px}
    .ig-face{width:86px;height:86px;border-radius:50%;overflow:hidden;flex:none;margin-right:22px}
    .ig-bubble{position:relative;max-width:780px;padding:26px 44px 28px;border-radius:64px;font-size:51px;line-height:63px;letter-spacing:-.6px;box-sizing:border-box;overflow-wrap:break-word}
    .ig-bubble.in{background:#262626}
    .ig-bubble.out{background-image:${IG_GRADIENT};background-attachment:fixed;background-size:1080px 1920px}
    .ig-bubble.in.first{border-bottom-left-radius:16px}
    .ig-bubble.in.mid{border-top-left-radius:16px;border-bottom-left-radius:16px}
    .ig-bubble.in.last{border-top-left-radius:16px}
    .ig-bubble.out.first{border-bottom-right-radius:16px}
    .ig-bubble.out.mid{border-top-right-radius:16px;border-bottom-right-radius:16px}
    .ig-bubble.out.last{border-top-right-radius:16px}
    .ig-react{position:absolute;bottom:-52px;font-size:40px;line-height:48px;padding:6px 14px;border-radius:40px;background:#262626;border:6px solid #000;z-index:2}
    .in .ig-react{left:26px}
    .out .ig-react{right:26px}
    .ig-seen{align-self:flex-end;color:#a8a8a8;font-size:36px;margin:12px 12px 0 0}
    .ig-link{position:relative;width:690px;border-radius:46px;background:#262626}
    .ig-link-img{height:361px;border-radius:46px 46px 0 0;overflow:hidden}
    .ig-og{width:788px;height:412px;transform:scale(.8756);transform-origin:0 0}
    .ig-link-foot{padding:26px 38px 32px}
    .ig-link-title{font-size:45px;line-height:56px;font-weight:600;letter-spacing:-.5px}
    .ig-link-domain{font-size:37px;line-height:46px;color:#a8a8a8;margin-top:2px}
    .ig-compose{position:absolute;left:36px;right:36px;bottom:170px;height:140px;border-radius:70px;background:#262626;display:flex;align-items:center;padding:0 44px 0 16px;box-sizing:border-box}
    .ig-cam{width:108px;height:108px;border-radius:50%;background:linear-gradient(135deg,#9C3AF5,#5A52F6);display:grid;place-items:center;flex:none}
    .ig-cam svg{width:60px;height:60px}
    .ig-placeholder{flex:1;margin-left:30px;font-size:49px;color:#a8a8a8;letter-spacing:-.3px}
    .ig-tools{display:flex;gap:50px;align-items:center}
    .ig-tools svg{width:72px;height:72px}
    ${OG_CSS}
    ${HOOK_CSS}
  </style></head><body>
    ${hookHtml(slide)}
    <div class="ig-thread${slide.hook ? " has-hook" : ""}">${rows}</div>
    <div class="ig-head">${IG_ICONS.back}<div class="ig-avatar">${avatar(sky)}</div><div class="ig-who"><div class="ig-name">${esc(contact.name ?? "")}</div>${contact.sub ? `<div class="ig-sub">${esc(contact.sub)}</div>` : ""}</div><div class="ig-icons">${IG_ICONS.call}${IG_ICONS.video}</div></div>
    <div class="ig-compose"><div class="ig-cam">${IG_ICONS.camera}</div><div class="ig-placeholder">Message...</div><div class="ig-tools">${IG_ICONS.mic}${IG_ICONS.photo}${IG_ICONS.sticker}</div></div>
  </body></html>`;
}


/** A face in a circle: their photo if the script points at one, otherwise the drawn sunset. */
function faceFor(from) {
  const src = localImage(script.avatars?.[from]);
  return src ? `<img src="${src}" alt="">` : avatar(from === "me" ? 1 : 0);
}

/**
 * The light-mode DM thread the storytime accounts use: white page, grey pills one side, blue the
 * other, and a round profile picture beside every single message on both sides. Type is large
 * because these are read at arm's length on a feed, and there is no header or message bar — the
 * slides are crops of a conversation, not screenshots of an app.
 */
function msgHtml(slide) {
  const items = slide.timestamp ? [{ ts: slide.timestamp }, ...slide.messages] : slide.messages;
  const rows = items
    .map((m) => {
      if (m.ts || m.system) return `<div class="ms-ts">${esc(m.ts ?? m.system)}</div>`;
      const side = m.from === "me" ? "out" : "in";
      const face = `<div class="ms-face">${faceFor(m.from)}</div>`;
      if (m.typing) return `<div class="ms-row ${side}">${side === "in" ? face : ""}<div class="ms-bubble ${side} typing"><span></span><span></span><span></span></div>${side === "out" ? face : ""}</div>`;
      const body = m.link
        ? `<div class="ms-link"><div class="ms-link-img">${ogImage(m.link.name, m.link.lang)}</div><div class="ms-link-foot"><div class="ms-link-title">${esc(m.link.title)}</div><div class="ms-link-domain">${esc(m.link.domain)}</div></div></div>`
        : `<div class="ms-bubble ${side}">${esc(m.text)}</div>`;
      return `<div class="ms-row ${side}">${side === "in" ? face : ""}${body}${side === "out" ? face : ""}</div>`;
    })
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><style>${STAND_IN_FACE}
    @font-face{font-family:Newsreader;src:url(data:font/ttf;base64,${SERIF}) format("truetype");font-style:normal}
    @font-face{font-family:Newsreader;src:url(data:font/ttf;base64,${SERIF_ITALIC}) format("truetype");font-style:italic}
    html,body{margin:0;background:#fff;width:1080px;height:1920px;overflow:hidden}
    body{font-family:${SYSTEM};color:#000;-webkit-font-smoothing:antialiased}
    .ms-thread{position:absolute;inset:0;padding:180px 34px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;gap:34px}
    .ms-ts{text-align:center;color:#8e8e93;font-size:36px;font-weight:500;margin:6px 0}
    .ms-row{display:flex;align-items:flex-end;gap:22px}
    .ms-row.out{justify-content:flex-end}
    .ms-face{width:94px;height:94px;border-radius:50%;overflow:hidden;flex:none;background:#e9e9eb}
    .ms-face img,.ms-face svg{display:block;width:100%;height:100%;object-fit:cover}
    .ms-bubble{max-width:740px;padding:30px 46px 34px;border-radius:70px;font-size:54px;line-height:66px;letter-spacing:-.8px;box-sizing:border-box;overflow-wrap:break-word}
    .ms-bubble.in{background:#eceded;color:#000}
    .ms-bubble.out{background:#0a84ff;color:#fff}
    .ms-bubble.typing{display:flex;gap:16px;align-items:center;padding:44px 46px}
    .ms-bubble.typing span{width:20px;height:20px;border-radius:50%;background:#8e8e93;display:block}
    .ms-bubble.out.typing span{background:rgba(255,255,255,.85)}
    .ms-link{width:700px;border-radius:44px;overflow:hidden;background:#eceded}
    .ms-link-img{height:366px;overflow:hidden;position:relative}
    .ms-link-img .og{position:absolute;inset:0}
    .ms-link-foot{padding:26px 40px 34px}
    .ms-link-title{font-size:46px;line-height:56px;font-weight:600;letter-spacing:-.6px}
    .ms-link-domain{font-size:38px;line-height:48px;color:#8e8e93;margin-top:4px}
    ${OG_CSS}
    ${HOOK_CSS}
  </style></head><body>${hookHtml(slide)}<div class="ms-thread">${rows}</div></body></html>`;
}

/** The picture a story opens on: full bleed, darkened a little, one line over it. */
function photoHtml(slide) {
  const src = localImage(slide.src);
  const bg = src
    ? `background-image:url(${src});background-size:cover;background-position:center`
    : "background:radial-gradient(120% 90% at 50% 20%,#2b3a55,#141a26 60%,#080b12)";
  return `<!doctype html><html><head><meta charset="utf-8"><style>${STAND_IN_FACE}
    html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#000}
    body{font-family:${SYSTEM}}
    .ph{position:absolute;inset:0;${bg}}
    ${slide.caption ? `.ph:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.28),rgba(0,0,0,.12) 40%,rgba(0,0,0,.45))}` : ""}
    .cap{position:absolute;left:80px;right:80px;top:50%;transform:translateY(-50%);text-align:center;color:#fff;font-size:58px;line-height:1.22;font-weight:600;letter-spacing:-.6px;text-shadow:0 4px 26px rgba(0,0,0,.75);z-index:2}
    .miss{position:absolute;left:0;right:0;bottom:120px;text-align:center;color:rgba(255,255,255,.5);font-size:30px;z-index:2}
  </style></head><body><div class="ph"></div>${slide.caption ? `<div class="cap">${esc(slide.caption).replace(/\n/g, "<br>")}</div>` : ""}${src ? "" : `<div class="miss">drop ${esc(slide.src ?? "cover.jpg")} in this folder and run it again</div>`}</body></html>`;
}

/**
 * An Apple Notes screenshot, light mode, drawn at @3x like the rest: the "for everyone asking" slide
 * that closes a carousel. It is what gets saved, and a save is the signal the photo algorithm
 * weighs heaviest after the swipe-through, so the one slide that names the product is also the one
 * that earns the post its reach. Written like a person's own note, never a brand's.
 */
function noteHtml(slide) {
  const lines = (slide.lines ?? [])
    .map((raw) => {
      const line = String(raw);
      if (line === "") return `<div class="gap"></div>`;
      if (line.startsWith("# ")) return `<div class="h">${esc(line.slice(2))}</div>`;
      if (line.startsWith("[x] ")) return `<div class="ck done"><i></i><span>${esc(line.slice(4))}</span></div>`;
      if (line.startsWith("[] ")) return `<div class="ck"><i></i><span>${esc(line.slice(3))}</span></div>`;
      if (line.startsWith("- ")) return `<div class="li"><b>•</b><span>${esc(line.slice(2))}</span></div>`;
      return `<div class="p">${esc(line)}</div>`;
    })
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>${STAND_IN_FACE}
    html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#fff}
    body{font-family:${SYSTEM};color:#000;-webkit-font-smoothing:antialiased}
    .bar{position:absolute;top:0;left:0;right:0;height:210px;display:flex;align-items:flex-end;justify-content:space-between;padding:0 48px 22px;box-sizing:border-box;color:#E5A800;font-size:51px;letter-spacing:-.6px}
    .bar .back{display:flex;align-items:center;gap:14px}
    .bar .back svg{width:34px;height:52px}
    .bar .icons{display:flex;gap:64px}
    .bar .icons svg{width:52px;height:52px}
    .bar .done{font-weight:600}
    .sheet{position:absolute;top:240px;left:60px;right:60px}
    .date{text-align:center;color:#8e8e93;font-size:33px;letter-spacing:-.2px;margin-bottom:34px}
    .title{font-size:66px;line-height:78px;font-weight:700;letter-spacing:-1.2px;margin-bottom:36px}
    .p,.li,.ck,.h{font-size:51px;line-height:70px;letter-spacing:-.8px}
    .h{font-weight:700;font-size:56px;margin:28px 0 8px}
    .p{margin:0}
    .li{display:flex;gap:26px;padding-left:12px}
    .li b{font-weight:400}
    .ck{display:flex;gap:28px;align-items:flex-start}
    .ck i{flex:none;width:56px;height:56px;margin-top:8px;border-radius:50%;border:3px solid #C7C7CC;box-sizing:border-box}
    .ck.done i{border-color:#E5A800;background:#E5A800;position:relative}
    .ck.done i::after{content:"";position:absolute;left:18px;top:8px;width:12px;height:26px;border:solid #fff;border-width:0 5px 5px 0;transform:rotate(45deg)}
    .ck.done span{color:#8e8e93}
    .gap{height:44px}
    .tools{position:absolute;left:0;right:0;bottom:0;height:190px;border-top:1px solid #E5E5EA;display:flex;align-items:flex-start;justify-content:space-around;padding:36px 60px 0;box-sizing:border-box}
    .tools svg{width:54px;height:54px}
  </style></head><body>
    <div class="bar">
      <div class="back"><svg viewBox="0 0 34 52"><path d="M28 4 8 26l20 22" fill="none" stroke="#E5A800" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Notes</span></div>
      <div class="icons"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="20" fill="none" stroke="#E5A800" stroke-width="4"/><path d="M26 16v20M16 26h20" stroke="#E5A800" stroke-width="4" stroke-linecap="round"/></svg><svg viewBox="0 0 52 52"><path d="M26 6v30M14 18l12-12 12 12M10 30v14h32V30" fill="none" stroke="#E5A800" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="done">Done</span></div>
    </div>
    <div class="sheet">${slide.date ? `<div class="date">${esc(slide.date)}</div>` : ""}${slide.title ? `<div class="title">${esc(slide.title)}</div>` : ""}${lines}</div>
    <div class="tools">
      <svg viewBox="0 0 54 54"><path d="M10 40l4-12 20-20 8 8-20 20z" fill="none" stroke="#E5A800" stroke-width="3.5" stroke-linejoin="round"/></svg>
      <svg viewBox="0 0 54 54"><rect x="8" y="10" width="38" height="34" rx="6" fill="none" stroke="#E5A800" stroke-width="3.5"/><path d="M14 24h26M14 32h18" stroke="#E5A800" stroke-width="3.5" stroke-linecap="round"/></svg>
      <svg viewBox="0 0 54 54"><rect x="9" y="9" width="36" height="36" rx="6" fill="none" stroke="#E5A800" stroke-width="3.5"/><path d="M18 30l8-8 8 8" fill="none" stroke="#E5A800" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <svg viewBox="0 0 54 54"><path d="M12 10h30v34l-6-4-6 4-6-4-6 4-6-4z" fill="none" stroke="#E5A800" stroke-width="3.5" stroke-linejoin="round"/></svg>
      <svg viewBox="0 0 54 54"><path d="M27 8l5 12 13 1-10 9 3 13-11-7-11 7 3-13-10-9 13-1z" fill="none" stroke="#E5A800" stroke-width="3.5" stroke-linejoin="round"/></svg>
    </div>
  </body></html>`;
}

/** On the contact sheet only: a slide somebody still has to screenshot, and what goes in it. */
function gapHtml(slide, n) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${STAND_IN_FACE}
    html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#15151a}
    body{font-family:${SYSTEM};color:#fff;display:flex;flex-direction:column;justify-content:center;padding:0 110px;box-sizing:border-box;border:10px dashed #3a3a44}
    .n{font-size:40px;color:#8e8e93;letter-spacing:6px;text-transform:uppercase}
    .note{margin:48px 0 0;font-size:48px;line-height:1.35;color:#d8d8e0}
  </style></head><body><div class="n">${String(n).padStart(2, "0")} · ${esc(slide.type)} · yours</div>${slide.note ? `<p class="note">${esc(slide.note)}</p>` : ""}</body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
// The stand-in is a data URL, so it loads after first use; a slide shot before it lands is set in the
// very Arial it is there to prevent.
const settle = () =>
  page.evaluate(async () => {
    for (const w of [400, 600, 700]) await document.fonts.load(`${w} 51px "iMessage Stand-in"`);
    await document.fonts.ready;
  });
const sheet = [];
let n = 0;
for (const slide of script.slides) {
  n += 1;
  const draw = slide.type === "photo" ? photoHtml : slide.type === "note" ? noteHtml : script.style === "messenger" ? msgHtml : script.style === "instagram" ? igHtml : html;
  // A gift slide with a `still` is a Live Photo from tiktok-gift-live.mjs: it is posted as it is, so
  // there is no slide file to write — its still only goes on the contact sheet.
  const still = slide.type === "gift" && slide.still ? join(dirname(scriptPath), slide.still) : null;
  if (still && existsSync(still)) {
    if (SHEET) sheet.push(readFileSync(still));
    continue;
  }
  if (slide.type !== "chat" && slide.type !== "photo" && slide.type !== "note") {
    if (SHEET) {
      await page.setContent(gapHtml(slide, n));
      await settle();
      sheet.push(await page.screenshot());
    }
    continue;
  }
  await page.setContent(draw(slide));
  await settle();
  await page.waitForTimeout(150);
  const file = join(outDir, `slide-${String(n).padStart(2, "0")}.png`);
  sheet.push(await page.screenshot({ path: file }));
  console.log("wrote", file);
}

// `--sheet`: every slide in order at a quarter size, so a post can be read the way someone swipes it.
if (SHEET && sheet.length) {
  const cols = Math.min(sheet.length, 6);
  const rows = Math.ceil(sheet.length / cols);
  const mime = (b) => (b[0] === 0xff && b[1] === 0xd8 ? "image/jpeg" : "image/png");
  const cells = sheet.map((b) => `<img src="data:${mime(b)};base64,${b.toString("base64")}">`).join("");
  await page.setViewportSize({ width: cols * 290 + 20, height: rows * 510 + 20 });
  await page.setContent(`<style>body{margin:0;padding:10px;background:#000;display:grid;grid-template-columns:repeat(${cols},270px);gap:20px}img{width:270px;height:480px;border-radius:14px;outline:2px solid #2c2c33;outline-offset:-1px}</style>${cells}`);
  const file = join(outDir, "sheet.png");
  await page.screenshot({ path: file, fullPage: true });
  console.log("wrote", file);
}
await browser.close();
