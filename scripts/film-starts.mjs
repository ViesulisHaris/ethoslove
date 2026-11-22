/**
 * Measures where each gift's preview film really begins, for src/content/template-film-starts.ts.
 *
 *   node scripts/film-starts.mjs            every film in public/templates
 *   node scripts/film-starts.mjs passport   only these
 *
 * Needs ffmpeg on the PATH. Prints one line per film: the second its gift's own first screen is up.
 *
 * A recording (scripts/capture-thumbnails.mjs) opens on up to three things that are not the gift:
 * a blank white frame while the page loads, the demo page's own bar on a dark strip, and the cover
 * every gift opens on ("someone made this for you", a red heart on a dark ground, "turn your sound
 * on"). In the phone lying in a gift page's hero the film is silent and is the first thing the
 * page shows, so it starts after all three. Every tenth of a second of the film is read, small:
 *
 * - white: nearly every pixel is nearly white;
 * - the cover: a dark frame with the red heart where the cover draws it, a little above the middle,
 *   and hardly any other red (a wrapped red present is not a cover);
 * - the bar: the red "Use this template" button on a strip of neutral black along the top edge (a
 *   red lacquer table is not a bar).
 *
 * Five gifts open on a drawn cover of their own instead (an envelope or a present, "For Ana"): that
 * is the gift's first screen, and their film starts on it.
 *
 * The opening is the run of such frames from the film's first frame, read over its first eight
 * seconds. The start is the last tenth of that run, plus six tenths for the cover's fade (three for a
 * film with no cover), in tenths.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const W = 78;
const H = 120;
const FPS = 10;
const only = process.argv.slice(2);
const root = "public/templates";

function frames(file) {
  const run = spawnSync("ffmpeg", ["-v", "error", "-t", "8", "-i", file, "-vf", `fps=${FPS},scale=${W}:${H}`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 1 << 28 });
  if (run.status !== 0) throw new Error(`ffmpeg failed on ${file}: ${run.stderr}`);
  const size = W * H * 3;
  const out = [];
  for (let at = 0; at + size <= run.stdout.length; at += size) out.push(run.stdout.subarray(at, at + size));
  return out;
}

const px = (frame, x, y) => {
  const i = (y * W + x) * 3;
  return [frame[i], frame[i + 1], frame[i + 2]];
};
const luma = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;

function read(frame) {
  let light = 0;
  let red = 0;
  let sum = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const p = px(frame, x, y);
      const l = luma(p);
      sum += l;
      if (p[0] > 170 && p[1] < 120 && p[2] < 160 && p[0] - p[1] > 80) red += 1;
      if (l > 235) light += 1;
    }
  const mean = sum / (W * H);
  // The cover's heart: a red disc a quarter of the way down, in the middle.
  let heart = 0;
  for (let y = 26; y < 40; y++)
    for (let x = 32; x < 46; x++) {
      const [r, g, b] = px(frame, x, y);
      if (r > 170 && g < 120 && b < 160 && r - g > 80) heart += 1;
    }
  // The demo page's bar: a red button at the right of a dark strip along the top.
  let button = 0;
  let strip = 0;
  for (let y = 1; y < 9; y++)
    for (let x = 0; x < W; x++) {
      const p = px(frame, x, y);
      if (Math.max(...p) < 60) strip += 1;
      if (x > W / 2 && p[0] > 170 && p[1] < 120 && p[2] < 140) button += 1;
    }
  return { white: light > W * H * 0.97, cover: mean < 90 && heart >= 4 && red < W * H * 0.015, bar: button >= 6 && strip > W * 8 * 0.5 };
}

const slugs = readdirSync(root).filter((slug) => existsSync(join(root, slug, "preview.webm")) && (only.length === 0 || only.includes(slug)));
for (const slug of slugs) {
  const seen = frames(join(root, slug, "preview.webm")).map(read);
  // The opening is one run from the first frame. Until the cover has come up, a second of anything else
  // (the dark loading screen between the bar and the cover) does not end it; once it has, three tenths
  // do. Read that way a gift whose own screen has a red curtain further in is not taken for a cover.
  let end = -1;
  let cover = -1;
  let other = -1;
  for (let i = 0; i < seen.length && i - end <= (cover < 0 ? 12 : 3); i++) {
    const frame = seen[i];
    if (frame.cover) cover = end = i;
    else if (frame.white || frame.bar) other = end = i;
  }
  const start = end < 0 ? 0 : Math.max(cover >= 0 ? cover + 6 : 0, other >= 0 ? other + 3 : 0) / FPS;
  console.log(`${slug}: ${start.toFixed(1)}${cover >= 0 ? `  cover until ${(cover / FPS).toFixed(1)}` : "  no cover"}${other >= 0 ? `, bar or white until ${(other / FPS).toFixed(1)}` : ""}`);
}
