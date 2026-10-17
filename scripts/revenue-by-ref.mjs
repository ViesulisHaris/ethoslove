/**
 * Checkouts started, paid and revenue per ?ref= link (docs/marketing/PLAYBOOK.md), then day by
 * day, to hold up against the posting dates in docs/marketing/tracker.csv. Revenue is what was
 * charged; refunds aren't subtracted.
 *
 *   node scripts/revenue-by-ref.mjs [days=30] [envFile=.env.local]
 *
 * .env.local holds the test keys. For real sales, pull production's and delete them after:
 *   vercel env pull .env.vercel --environment=production
 *   node scripts/revenue-by-ref.mjs 30 .env.vercel
 *   rm .env.vercel
 */
import Stripe from "stripe";
import { readFileSync } from "node:fs";

const days = Number(process.argv[2] ?? 30);
const envFile = process.argv[3] ?? ".env.local";
const env = Object.fromEntries(readFileSync(envFile, "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]));
if (!env.STRIPE_SECRET_KEY) {
  console.error(`No STRIPE_SECRET_KEY in ${envFile}`);
  process.exit(1);
}
const stripe = new Stripe(env.STRIPE_SECRET_KEY);

// src/lib/pricing/products.ts. The Stripe account is shared, so only sessions carrying one of
// these and a purchase_id are Ethos's.
const PRODUCTS = new Set(["single", "pick3", "everything", "extras", "pass", "pack", "giftcard", "upgrade"]);
// A gift's short id: what the "send one back" button sent before it carried a sealed token instead
// (checkout now drops a ref shaped like one; older sessions may still have it). "reply" is the new
// ref for the same button, and "c-<code>" a creator's personal link.
const GIFT_ID = /^[2-9a-hjkmnp-z]{9}$/;
const label = (ref) => (!ref ? "(none)" : ref !== "watermark" && GIFT_ID.test(ref) ? "from a gift" : ref.startsWith("c-") ? `creator ${ref.slice(2).toUpperCase()}` : ref);

const byRef = new Map();
const byDay = new Map();
const byKind = new Map();
const count = (map, key, session) => {
  const row = map.get(key) ?? { started: 0, paid: 0, revenue: {} };
  row.started += 1;
  if (session.payment_status === "paid") {
    row.paid += 1;
    row.revenue[session.currency] = (row.revenue[session.currency] ?? 0) + (session.amount_total ?? 0);
  }
  map.set(key, row);
};

const since = Math.floor(Date.now() / 1000) - days * 86400;
for await (const session of stripe.checkout.sessions.list({ created: { gte: since }, limit: 100 })) {
  const { metadata } = session;
  if (!metadata?.purchase_id || !PRODUCTS.has(metadata.product)) continue;
  count(byRef, label(metadata.ref), session);
  count(byDay, new Date(session.created * 1000).toISOString().slice(0, 10), session);
  // "bump" is a single or "make it special" with every other template added at checkout.
  count(byKind, metadata.kind || metadata.product, session);
}

const money = (revenue) =>
  Object.entries(revenue).map(([currency, minor]) => `${(minor / 100).toFixed(2)} ${currency.toUpperCase()}`).join(" + ") || "0";
const print = (title, rows) => {
  const width = Math.max(12, ...rows.map(([key]) => key.length));
  console.log(`\n${title.padEnd(width)}  started  paid  revenue`);
  for (const [key, row] of rows)
    console.log(`${key.padEnd(width)}  ${String(row.started).padStart(7)}  ${String(row.paid).padStart(4)}  ${money(row.revenue)}`);
};

const mode = /_live_/.test(env.STRIPE_SECRET_KEY) ? "live" : "test mode";
console.log(`Ethos checkouts, last ${days} days (${mode})`);
if (!byRef.size) console.log("\nNone yet.");
else {
  print("By ref", [...byRef].sort((a, b) => b[1].paid - a[1].paid || b[1].started - a[1].started));
  print("By product", [...byKind].sort((a, b) => b[1].paid - a[1].paid || b[1].started - a[1].started));
  print("By day", [...byDay].sort((a, b) => a[0].localeCompare(b[0])));
}
