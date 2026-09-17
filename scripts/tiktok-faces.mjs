/**
 * Puts the two faces (and the cover photo) into a carousel folder and re-renders it.
 *
 *   node scripts/tiktok-faces.mjs 98 ~/Downloads/her.jpg ~/Downloads/him.jpg [~/Downloads/cover.jpg]
 *
 * If the picture is only in a chat and never got saved, copy it (right-click, Copy Image) and use
 * the clipboard instead of a path:
 *
 *   node scripts/tiktok-faces.mjs 98 --clip her     # then copy his photo and run it again with him
 *
 * The circles are round, so a portrait has to be squared first or it crops to whatever happens to
 * be in the middle — a chest, a bouquet. Sharp's attention crop keeps the busiest part, which on a
 * photo of a person is usually the face; `--top` forces the top instead, which is right when the
 * face is high in the frame. The cover is cropped to 1080×1920 the same way.
 */
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import sharp from "sharp";


/** macOS keeps a copied image on the clipboard, not on disk; this puts it on disk. */
function fromClipboard() {
  const out = join(tmpdir(), `tiktok-clip-${Date.now()}.png`);
  const script = `set f to (open for access POSIX file ${JSON.stringify(out)} with write permission)
try
  write (the clipboard as «class PNGf») to f
  close access f
on error e
  close access f
  error e
end try`;
  try {
    execFileSync("osascript", ["-e", script], { stdio: ["ignore", "ignore", "pipe"] });
  } catch {
    console.log("there is no picture on the clipboard — right-click the image, Copy Image, then run this again");
    process.exit(1);
  }
  return out;
}

/** When a path is wrong, show what is actually sitting in the obvious folders. */
function suggest() {
  const seen = [];
  for (const dir of [join(homedir(), "Downloads"), join(homedir(), "Desktop")]) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (!/\.(jpe?g|png|webp|heic)$/i.test(f)) continue;
      seen.push({ path: join(dir, f), at: statSync(join(dir, f)).mtimeMs });
    }
  }
  seen.sort((a, b) => b.at - a.at);
  if (!seen.length) {
    console.log("\nNo pictures in Downloads or Desktop either. Two ways to get one in:");
    console.log("  · save the image (right-click → Save Image), then pass that path");
    console.log("  · or copy it (right-click → Copy Image) and run:  --clip her");
    return;
  }
  console.log("\nPictures I can see:");
  for (const { path } of seen.slice(0, 8)) console.log("  " + path);
}

const args = process.argv.slice(2);
const top = args.includes("--top");
const clipAt = args.indexOf("--clip");
const clipRole = clipAt === -1 ? null : args[clipAt + 1];
const positional = args.filter((a, i) => !a.startsWith("--") && !(clipAt !== -1 && i === clipAt + 1));
const [who, ...files] = positional;
if (!who || (files.length === 0 && !clipRole)) {
  console.log("usage: node scripts/tiktok-faces.mjs <carousel> <her.jpg> <him.jpg> [cover.jpg] [--top]");
  console.log("   or: node scripts/tiktok-faces.mjs <carousel> --clip her|him|cover   (uses the copied image)");
  process.exit(1);
}

const expand = (p) => (p.startsWith("~") ? join(homedir(), p.slice(1)) : p);
// Run it from anywhere: the folders are found from the script's own location, not the shell's.
const repo = resolve(import.meta.dirname, "..");
const dir = resolve(repo, /^\d+$/.test(who) ? `docs/marketing/tiktok-${who}` : expand(who));
mkdirSync(dir, { recursive: true });
const position = top ? sharp.gravity.north : sharp.strategy.attention;

const ROLES = { her: ["pfp-her.jpg", 512, 512], him: ["pfp-him.jpg", 512, 512], cover: ["cover.jpg", 1080, 1920] };
let jobs;
if (clipRole) {
  const role = ROLES[clipRole];
  if (!role) {
    console.log("--clip takes her, him or cover");
    process.exit(1);
  }
  jobs = [[fromClipboard(), ...role]];
} else {
  const [her, him, cover] = files.map((f) => (f ? resolve(expand(f)) : undefined));
  jobs = [
    [her, "pfp-her.jpg", 512, 512],
    [him, "pfp-him.jpg", 512, 512],
    [cover, "cover.jpg", 1080, 1920],
  ];
}

for (const [src, name, w, h] of jobs) {
  if (!src) continue;
  if (!existsSync(src)) {
    console.log("missing", src);
    suggest();
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
