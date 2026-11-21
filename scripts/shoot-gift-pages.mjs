/**
 * Full-page screenshots of gift pages (/templates/<slug>), for someone to look at:
 *
 *   node scripts/shoot-gift-pages.mjs <base url> <out dir> [slug ...]
 *
 * For each gift: a desk (1440×900) and a phone (375×812) in English, and the phone in Spanish, as
 * v3-<slug>-desktop-en.png, v3-<slug>-phone-en.png and v3-<slug>-phone-es.png. For The Letter also
 * the other sizes the page is held to, the Spanish desk, the hero with the keyboard's focus on its
 * play button, the phone picked up, and the experience band.
 *
 * The live site runs with NEXT_PUBLIC_FREE_NOTE_SHARE=1 and NEXT_PUBLIC_LETTER_KEEP_SHARE=1: start
 * the dev server with both set to see the pages as visitors do.
 */
import { chromium } from "@playwright/test";

const [base, out, ...only] = process.argv.slice(2);
if (!base || !out) throw new Error("usage: node scripts/shoot-gift-pages.mjs <base url> <out dir> [slug ...]");
const GIFTS = ["the-letter", "birthday-cinema", "constellations", "xoxo", "the-council", "bloom", "halfway", "frosted-window", "light-the-candles", "string-the-lights", "gingerbread-house", "snow-globe", "nice-list", "jar-of-reasons", "our-timeline", "scrapbook", "scratch-card", "coquette", "passport", "picnic"];
const slugs = only.length ? only : GIFTS;
const origin = new URL(base).origin;
const browser = await chromium.launch();
const context = await browser.newContext({ storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: "ethos-consent", value: "denied" }] }] } });
const page = await context.newPage();
const issues = [];
page.on("pageerror", (e) => issues.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && issues.push(`console: ${m.text().slice(0, 160)}`));

/** Open a page at a size, scroll it through so everything lazy has arrived, and wait for the film in the hero. */
async function open(path, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += height * 0.7) {
    await page.evaluate((to) => window.scrollTo(0, to), y);
    await page.waitForTimeout(120);
  }
  await page.locator("[data-flatlay=hero]").scrollIntoViewIfNeeded();
  await page.locator("[data-flatlay=hero] video[data-on]").waitFor({ timeout: 8000 }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 0) issues.push(`${path} at ${width}: scrolls sideways by ${overflow}px`);
}
const shoot = (name, options = { fullPage: true }) => page.screenshot({ path: `${out}/v3-${name}.png`, ...options });

for (const slug of slugs) {
  await open(`/templates/${slug}`, 1440, 900);
  await shoot(`${slug}-desktop-en`);
  await open(`/templates/${slug}`, 375, 812);
  await shoot(`${slug}-phone-en`);
  await open(`/es/templates/${slug}`, 375, 812);
  await shoot(`${slug}-phone-es`);
  console.log("shot", slug);
}

if (slugs.includes("the-letter")) {
  for (const [width, height] of [[320, 568], [375, 812], [414, 896], [768, 1024], [1024, 768], [1280, 800], [1440, 900], [1920, 1080]]) {
    await open("/templates/the-letter", width, height);
    await shoot(`the-letter-${width}-en`);
  }
  await open("/templates/the-letter", 812, 375);
  await shoot("the-letter-812x375-en");
  await open("/es/templates/the-letter", 1440, 900);
  await shoot("the-letter-desktop-es");
  await open("/templates/the-letter", 1440, 900);
  await shoot("the-letter-desktop-en-top", { fullPage: false });
  await page.locator("section[aria-labelledby=template-experience]").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.locator("section[aria-labelledby=template-experience]").screenshot({ path: `${out}/v3-the-letter-experience.png` });
  // The cards opened, each showing its line to borrow.
  await page.locator("section[aria-labelledby=template-guide]").getByRole("button").first().click();
  await page.waitForTimeout(500);
  await page.locator("section[aria-labelledby=template-guide]").screenshot({ path: `${out}/v3-the-letter-cards-open.png` });
  // By keyboard: the focus on the hero's play button, then the phone picked up, with its close button.
  await page.evaluate(() => window.scrollTo(0, 0));
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate(() => document.activeElement?.hasAttribute("data-play"))) break;
  }
  await page.waitForTimeout(300);
  await shoot("the-letter-desktop-en-keyboard-focus", { fullPage: false });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2500);
  await shoot("the-letter-desktop-en-playing", { fullPage: false });
}

await browser.close();
console.log(issues.length ? `ISSUES:\n${[...new Set(issues)].join("\n")}` : "no page errors, no sideways scroll");
