/**
 * Editor extras walkthrough: real-song search + select, voice message recording (fake mic),
 * library MP3s decode, and the draft persists both.   node scripts/verify-extras.mjs [outDir] [baseURL]
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const out = process.argv[2] ?? "./.verify";
const base = process.argv[3] ?? "http://localhost:3000";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"] });
const context = await browser.newContext({ viewport: { width: 1380, height: 900 }, locale: "en-US", permissions: ["microphone"] });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text().slice(0, 200)}`));
const shot = (n) => page.screenshot({ path: join(out, `extras-${n}.png`) });

await page.goto(`${base}/create/the-letter`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

// library MP3s decode
const durations = await page.evaluate(async (ids) => {
  const out = {};
  for (const id of ids) {
    out[id] = await new Promise((resolve) => {
      const a = new Audio(`/audio/library/${id}.mp3`);
      a.addEventListener("loadedmetadata", () => resolve(Math.round(a.duration)));
      a.addEventListener("error", () => resolve("error"));
    });
  }
  return out;
}, ["first-light", "paper-boats", "sunday-slowly", "golden-hour", "slow-dance", "under-the-stars", "home", "quiet-hours"]);
console.log("library durations:", durations);

// real song
await page.getByRole("radio", { name: "A real song" }).or(page.getByRole("button", { name: "A real song" })).first().click();
await page.getByTestId("song-search").fill("perfect ed sheeran");
await page.getByTestId("song-result").first().waitFor({ timeout: 20000 });
await shot("01-song-results");
await page.getByTestId("song-result").first().click();
await page.getByText("At the end of the gift").waitFor({ timeout: 5000 });
await shot("02-song-selected");

// voice message
const rec = page.getByTestId("voice-record");
await rec.scrollIntoViewIfNeeded();
await rec.click();
await page.waitForTimeout(2600);
await rec.click();
await page.getByText(/Voice message · \d+s/).waitFor({ timeout: 10000 });
await shot("03-voice-recorded");

// draft persisted with both
await page.waitForTimeout(1200);
const draft = await page.evaluate(() => Object.entries(localStorage).filter(([k]) => k.includes("the-letter")).map(([, v]) => v).join(""));
console.log("draft has catalog song:", draft.includes('"source":"catalog"'), "| has voice note:", draft.includes('"voiceNote"'));

// the real song is free and sits on the end screen as a tap-to-play card (tests/unit/song-preview); just confirm no errors
await browser.close();
console.log(errors.length ? `ERRORS:\n${errors.join("\n")}` : "no page errors");
console.log(Object.values(durations).every((d) => typeof d === "number" && d > 30) && draft.includes('"source":"catalog"') && draft.includes('"voiceNote"') ? "EXTRAS OK" : "EXTRAS FAILED");
