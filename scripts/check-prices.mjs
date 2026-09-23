/**
 * Guards "the price shown is the price charged". Checkout charges the catalogue's own amounts through
 * Stripe price_data (src/lib/pricing/products.ts), so Stripe can no longer disagree with the code; what
 * can still drift is a price typed by hand into copy. This script:
 *
 * 1. finds every money amount written into the site's words (messages/*.json, src/content, and any
 *    component or page) and fails on one the catalogue doesn't charge in that currency, such as a
 *    launch price left behind after a price change;
 * 2. with STRIPE_SECRET_KEY set, checks that every STRIPE_PRODUCT_* in the environment names a Stripe
 *    Product that exists and is active (checkout files its lines under them).
 *
 * Read-only on both sides: it reads files and retrieves products, and changes nothing anywhere.
 *   node --env-file=.env.local scripts/check-prices.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// The catalogue is TypeScript, run through Node's own type stripping. The package has no "type"
// field, so Node warns that it had to detect the module syntax: true, harmless, and only noise here.
process.removeAllListeners("warning");
process.on("warning", (w) => w.code !== "MODULE_TYPELESS_PACKAGE_JSON" && console.warn(w));
const { BUMP, PRODUCTS, bumpAmount } = await import("../src/lib/pricing/products.ts");

const root = new URL("..", import.meta.url).pathname;
const SYMBOLS = { "€": "eur", "£": "gbp", $: "usd" };

// Every amount the site can honestly show: each product, the bump on each product it goes on (it
// takes the order to Everything's price), a pick-three's "separately" figure.
const charged = { eur: new Set([0]), usd: new Set([0]), gbp: new Set([0]) };
for (const p of Object.values(PRODUCTS)) {
  for (const [c, minor] of Object.entries(p.amounts)) charged[c].add(minor);
  for (const [c, minor] of Object.entries(p.compareAt ?? {})) charged[c].add(minor);
}
for (const base of BUMP.onto) for (const c of Object.keys(charged)) charged[c].add(bumpAmount(base, c));

// Money written with cents, symbol first ("€9.99", "$14.99") or after ("9,99 €"). Round figures
// ("€150 a day") describe the world, not our prices, and are left alone.
const BEFORE = /([€£$])\s?(\d+)[.,](\d{2})(?![\d])/g;
const AFTER = /(?<![\d.,])(\d+)[.,](\d{2})\s?(€|£)/g;
// Not prices: code that computes them, and tests that pin them.
const SKIP = [/^src\/lib\/pricing\//, /^src\/lib\/commerce\//, /^src\/lib\/stripe\//, /\.test\.tsx?$/];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(json|ts|tsx)$/.test(name)) yield path;
  }
}

let bad = 0;
const sources = [...files(join(root, "messages")), ...files(join(root, "src"))];
for (const path of sources) {
  const file = relative(root, path);
  if (SKIP.some((pattern) => pattern.test(file))) continue;
  readFileSync(path, "utf8")
    .split("\n")
    .forEach((line, i) => {
      const found = [
        ...[...line.matchAll(BEFORE)].map((m) => ({ currency: SYMBOLS[m[1]], minor: Number(m[2]) * 100 + Number(m[3]), text: m[0] })),
        ...[...line.matchAll(AFTER)].map((m) => ({ currency: SYMBOLS[m[3]], minor: Number(m[1]) * 100 + Number(m[2]), text: m[0] })),
      ];
      for (const { currency, minor, text } of found) {
        if (charged[currency].has(minor)) continue;
        bad++;
        console.log(`BAD ${file}:${i + 1}  "${text}" is not a price the catalogue charges in ${currency.toUpperCase()}`);
      }
    });
}
console.log(bad ? "" : "ok  every price written into the site is one the catalogue charges");

const key = process.env.STRIPE_SECRET_KEY;
if (!key) console.log("--  STRIPE_SECRET_KEY not set: skipped checking the STRIPE_PRODUCT_* ids");
else {
  const keys = [...Object.values(PRODUCTS).map((p) => p.envProductKey), BUMP.envProductKey];
  for (const envKey of keys) {
    const id = process.env[envKey];
    if (!id) {
      console.log(`--  ${envKey} not set: its lines are described inline (fine)`);
      continue;
    }
    const res = await fetch(`https://api.stripe.com/v1/products/${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${key}` } });
    const product = res.ok ? await res.json() : null;
    if (!product) {
      bad++;
      console.log(`BAD ${envKey}=${id}: ${res.status} ${(await res.text()).slice(0, 200)}`);
    } else if (!product.active) {
      bad++;
      console.log(`BAD ${envKey}=${id} ("${product.name}") is archived: Stripe refuses new lines under it`);
    } else console.log(`ok  ${envKey}=${id} ("${product.name}")${product.tax_code && product.tax_code !== "txcd_10000000" ? `, tax code ${product.tax_code}` : ""}`);
  }
}

console.log(bad ? `\n${bad} problem(s): fix them before deploying.` : "\nEvery shown price is the charged price.");
process.exit(bad ? 1 : 0);
