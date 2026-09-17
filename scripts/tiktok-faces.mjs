/**
 * Puts the two faces (and the cover photo) into a carousel folder and re-renders it.
 *
 *   node scripts/tiktok-faces.mjs 98 ~/Downloads/her.jpg ~/Downloads/him.jpg [~/Downloads/cover.jpg]
 *
 * The circles are round, so a portrait has to be squared first or it crops to whatever happens to
 * be in the middle — a chest, a bouquet. Sharp's attention crop keeps the busiest part, which on a
 * photo of a person is usually the face; `--top` forces the top instead, which is right when the
 * face is high in the frame. The cover is cropped to 1080×1920 the same way.
 */
import { existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const top = args.includes("--top");
const [who, ...files] = args.filter((a) => !a.startsWith("--"));
if (!who || files.length === 0) {
  console.log("usage: node scripts/tiktok-faces.mjs <carousel> <her.jpg> <him.jpg> [cover.jpg] [--top]");
  process.exit(1);
}

const expand = (p) => (p.startsWith("~") ? join(homedir(), p.slice(1)) : p);
// Run it from anywhere: the folders are found from the script's own location, not the shell's.
const repo = resolve(import.meta.dirname, "..");
const dir = resolve(repo, /^\d+$/.test(who) ? `docs/marketing/tiktok-${who}` : expand(who));
mkdirSync(dir, { recursive: true });
const position = top ? sharp.gravity.north : sharp.strategy.attention;

const [her, him, cover] = files.map((f) => (f ? resolve(expand(f)) : undefined));
const jobs = [
  [her, "pfp-her.jpg", 512, 512],
  [him, "pfp-him.jpg", 512, 512],
  [cover, "cover.jpg", 1080, 1920],
];

for (const [src, name, w, h] of jobs) {
  if (!src) continue;
  if (!existsSync(src)) {
    console.log("missing", src);
    process.exit(1);
  }
  const out = join(dir, name);
  await sharp(src).rotate().resize(w, h, { fit: "cover", position }).jpeg({ quality: 92, mozjpeg: true }).toFile(out);
  console.log("wrote", out);
}

const script = join(dir, "script.json");
if (existsSync(script)) {
  execFileSync("node", [join(import.meta.dirname, "tiktok-slides.mjs"), script, dir], { stdio: "inherit" });
} else {
  console.log("no script.json in", dir, "— faces written, nothing to render");
}
