/**
 * Puts heic2any's HEIC decoder in a worker file of our own: public/workers/heic-decoder-<version>.js
 *
 *   node scripts/heic-worker.mjs
 *
 * Why: heic2any builds its worker from a string at import time, as a blob: URL. A blob worker
 * inherits the page's Content-Security-Policy, and the decoder inside it — libheif compiled by
 * Emscripten — calls `new Function` while it starts up. Our policy has no 'unsafe-eval', so the
 * worker died on its first line and every HEIC photo sat on "Preparing…" until the 45-second
 * deadline, then vanished. (Reproduced on production in Chromium and WebKit, 18 Sep 2026; it is
 * both of the eval errors Clarity was reporting from the editor.)
 *
 * A worker loaded from our own URL gets the policy served with that file instead, so
 * next.config.ts gives /workers/ a policy of its own that allows eval there and nowhere else.
 * The page keeps its strict policy. This file only moves the decoder; it doesn't change a byte.
 *
 * Rerun after upgrading heic2any. tests/unit/heic-worker.test.ts fails if the committed worker
 * and the installed library disagree.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The decoder's source and the heic2any version it came from, read straight from node_modules. */
export function extractHeicWorker(root = ROOT) {
  const { version } = JSON.parse(readFileSync(resolve(root, "node_modules/heic2any/package.json"), "utf8"));
  const bundle = readFileSync(resolve(root, "node_modules/heic2any/dist/heic2any.js"), "utf8");
  const marker = "var workerString = ";
  const at = bundle.indexOf(marker);
  if (at < 0) throw new Error("heic2any: workerString not found — the library's layout changed");
  // Walk the string literal to its closing quote, stepping over escapes.
  const open = at + marker.length;
  if (bundle[open] !== '"') throw new Error("heic2any: workerString is not a double-quoted literal");
  let i = open + 1;
  while (i < bundle.length && bundle[i] !== '"') i += bundle[i] === "\\" ? 2 : 1;
  if (i >= bundle.length) throw new Error("heic2any: workerString never closes");
  // Evaluating the literal on its own yields the string; nothing else in the bundle runs.
  const code = vm.runInNewContext(bundle.slice(open, i + 1));
  if (typeof code !== "string" || !code.includes("HeifDecoder") || !code.includes("onmessage")) {
    throw new Error("heic2any: extracted worker does not look like the decoder");
  }
  return { version, code };
}

export function workerFileName(version) {
  return `heic-decoder-${version}.js`;
}

export function workerFileContents({ version, code }) {
  return `/* heic2any ${version} — libheif HEIC decoder, moved into its own worker file by scripts/heic-worker.mjs. Generated; do not edit. */\n${code}`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const worker = extractHeicWorker();
  const out = resolve(ROOT, "public/workers", workerFileName(worker.version));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, workerFileContents(worker));
  console.log(`wrote ${out} (${Math.round(worker.code.length / 1024)} KB, heic2any ${worker.version})`);
}
