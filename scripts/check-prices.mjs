/**
 * Compares the prices the site shows (src/lib/pricing/products.ts) with the prices Stripe charges,
 * for every currency in NEXT_PUBLIC_PRICE_CURRENCIES. Run it after changing a price in either place:
 *   node --env-file=.env.local scripts/check-prices.mjs
 * Read-only: it retrieves products and prices and changes nothing in Stripe.
 */
import { readFileSync } from "node:fs";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
const charged = (process.env.NEXT_PUBLIC_PRICE_CURRENCIES ?? "eur").split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
const source = readFileSync(new URL("../src/lib/pricing/products.ts", import.meta.url), "utf8");
const shown = {};
for (const id of ["single", "pick3", "everything"]) {
  // The product's line in products.ts, then the amounts object on it.
  const line = source.split("\n").find((l) => l.trim().startsWith(`${id}: {`)) ?? "";
  const amounts = line.slice(line.indexOf("amounts: {"), line.indexOf("}", line.indexOf("amounts: {")));
  shown[id] = Object.fromEntries([...amounts.matchAll(/(usd|eur|gbp): (\d+)/g)].map((m) => [m[1], Number(m[2])]));
}
const api = async (path) => {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
};
let bad = 0;
for (const id of ["single", "pick3", "everything"]) {
  const envName = { single: "SINGLE", pick3: "PICK3", everything: "EVERYTHING" }[id];
  let priceId = process.env[`STRIPE_PRICE_${envName}`];
  if (!priceId) {
    const productId = process.env[`STRIPE_PRODUCT_${envName}`];
    if (!productId) { console.log(`${id}: no STRIPE_PRICE_${envName} or STRIPE_PRODUCT_${envName}`); bad++; continue; }
    const product = await api(`products/${productId}`);
    priceId = typeof product.default_price === "string" ? product.default_price : product.default_price?.id;
  }
  const price = await api(`prices/${priceId}?expand[]=currency_options`);
  const real = { [price.currency]: price.unit_amount, ...Object.fromEntries(Object.entries(price.currency_options ?? {}).map(([c, o]) => [c, o.unit_amount])) };
  for (const currency of charged) {
    const page = shown[id][currency];
    const stripe = real[currency];
    const ok = page === stripe;
    if (!ok) bad++;
    console.log(`${ok ? "ok " : "BAD"} ${id.padEnd(10)} ${currency}  page ${page ?? "—"}  stripe ${stripe ?? "— (not carried: Stripe converts from " + price.currency + ")"}`);
  }
}
console.log(bad ? `\n${bad} mismatch(es): fix Stripe or products.ts before deploying.` : "\nEvery shown price is the charged price.");
process.exit(bad ? 1 : 0);
