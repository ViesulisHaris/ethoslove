// Copies MapLibre's browser files out of node_modules into public/vendor, where the Dates map
// loads them at runtime. MapLibre 6 is three ES modules that find each other by relative URL
// (the map, the code it shares with its worker, and the worker), so they have to sit side by
// side on our own origin rather than go through the bundler. The folder carries the version,
// which lets it be cached for a year; it is gitignored and rebuilt before every dev and build.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgDir = join(root, "node_modules", "maplibre-gl");
if (!existsSync(pkgDir)) {
  console.warn("[copy-maplibre] maplibre-gl is not installed; the Dates map will fall back to the list.");
  process.exit(0);
}
const { version } = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
const vendor = join(root, "public", "vendor", "maplibre-gl");
const out = join(vendor, version);
const files = ["maplibre-gl.mjs", "maplibre-gl-shared.mjs", "maplibre-gl-worker.mjs"];

if (files.every((f) => existsSync(join(out, f)))) process.exit(0);
rmSync(vendor, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const file of files) cpSync(join(pkgDir, "dist", file), join(out, file));
console.log(`[copy-maplibre] public/vendor/maplibre-gl/${version}`);
