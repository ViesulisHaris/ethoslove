/**
 * Captures a carousel's gift frames from the live demo of a template, 1080×1920, as a phone sees it:
 *   node scripts/tiktok-demo-frames.mjs docs/marketing/tiktok-104 [https://tryethos.io]
 *
 * The carousel's script.json says which demo and what to do to it:
 *   "demo": { "template": "the-toast", "steps": ["shot gift-1.png", "tap", "wait 3500",
 *             "press \"hold to pour\"", "wait 2500", "shot gift-2.png", "release"] }
 *
 * Steps: `shot <file>` · `wait <ms>` · `tap` (the middle) · `tap <x> <y>` (in the 360×640 viewport)
 * · `tap "text"` (a control in the gift with that text or label) · `press "text"` / `release` (hold
 * it down, for "hold to pour") · `swipe up|down|left|right` · `swap "Ana" "Nan"` (from then on,
 * every shot has that whole word replaced in the gift's text — the name on the letter, the age on
 * the cake, a caption — so the frame belongs to the story's people; the drawing is untouched).
 *
 * Why the demo and not a real gift: nothing is published and nobody's account is touched, and the
 * demo is exactly what a viewer who goes looking will find. The price used to be the names — Ana
 * and Marco, Elena, Sam, Dani and Mamá; `swap` pays it, so a story about a nan or a brother can
 * show a card addressed to them. The demo's own bar ("All templates", "Use this template") is
 * hidden, and cookies are declined, so a frame shows only the gift.
 *
 * These are stills. scripts/tiktok-gift-live.mjs films the gift moving, with your own names and
 * photos, for Live Photos — use that for any template it has choreography for (Halfway, so far).
 */
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const dir = resolve(process.argv[2] ?? ".");
const base = process.argv[3] ?? "https://tryethos.io";
const script = JSON.parse(readFileSync(join(dir, "script.json"), "utf8"));
if (!script.demo?.template || !Array.isArray(script.demo.steps)) {
  console.error(`${dir}/script.json has no "demo": { "template", "steps" }`);
  process.exit(1);
}

const W = 360;
const H = 640;
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
});
await context.addInitScript(() => {
  try {
    localStorage.setItem("ethos-analytics-consent", "denied");
  } catch {
    // a frame without storage still renders; the banner may show
  }
});
const page = await context.newPage();
await page.goto(`${base}/demo/${script.demo.template}`, { waitUntil: "networkidle", timeout: 90_000 });
await page.evaluate(() => {
  const back = [...document.querySelectorAll("a")].find((a) => a.textContent?.includes("All templates"));
  if (back?.parentElement) back.parentElement.style.display = "none";
});
await page.waitForTimeout(2500);

/** The middle of a control in the gift whose text or label contains `text`, or null. */
async function find(text) {
  const box = await page.evaluate((needle) => {
    const n = needle.toLowerCase();
    const els = [...document.querySelectorAll(".gift-root button, .gift-root [role=button], .gift-root a, .gift-root *")];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      const label = `${el.getAttribute("aria-label") ?? ""} ${el.children.length ? "" : el.textContent ?? ""}`.toLowerCase();
      if (label.includes(n)) return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }
    return null;
  }, text);
  return box;
}

async function drag(from, to) {
  await page.mouse.move(from[0], from[1]);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(from[0] + ((to[0] - from[0]) * i) / 12, from[1] + ((to[1] - from[1]) * i) / 12);
    await page.waitForTimeout(25);
  }
  await page.mouse.up();
}

/** Whole-word replacements applied to the gift's text right before every shot. */
const swaps = [];
const applySwaps = async () => {
  if (!swaps.length) return;
  await page.evaluate((pairs) => {
    const root = document.querySelector(".gift-root") ?? document.body;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      let text = node.nodeValue ?? "";
      for (const [from, to] of pairs) text = text.replace(new RegExp(`\\b${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"), to);
      if (text !== node.nodeValue) node.nodeValue = text;
    }
  }, swaps);
  await page.waitForTimeout(120);
};

const SWIPES = { up: [[W / 2, H * 0.85], [W / 2, H * 0.3]], down: [[W / 2, H * 0.3], [W / 2, H * 0.85]], left: [[W * 0.9, H / 2], [W * 0.1, H / 2]], right: [[W * 0.1, H / 2], [W * 0.9, H / 2]] };

for (const step of script.demo.steps) {
  const [verb, ...rest] = step.trim().split(/\s+/);
  const quoted = step.match(/"([^"]+)"/)?.[1];
  if (verb === "shot") {
    const file = join(dir, rest[0]);
    await applySwaps();
    await page.screenshot({ path: file });
    console.log("wrote", file);
  } else if (verb === "wait") {
    await page.waitForTimeout(Number(rest[0]) || 1000);
  } else if (verb === "tap" || verb === "press") {
    const at = quoted ? await find(quoted) : rest.length >= 2 ? { x: Number(rest[0]), y: Number(rest[1]) } : { x: W / 2, y: H / 2 };
    if (!at) throw new Error(`step "${step}": nothing in the gift says "${quoted}"`);
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    if (verb === "tap") await page.mouse.up();
  } else if (verb === "release") {
    await page.mouse.up();
  } else if (verb === "swipe" && SWIPES[rest[0]]) {
    await drag(...SWIPES[rest[0]]);
  } else if (verb === "swap") {
    const [from, to] = [...step.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
    if (!from || to === undefined) throw new Error(`step "${step}": swap needs "from" "to"`);
    swaps.push([from, to]);
  } else {
    throw new Error(`unknown step "${step}"`);
  }
}
await browser.close();
