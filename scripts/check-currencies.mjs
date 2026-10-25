/**
 * Before switching on dollar and pound prices (NEXT_PUBLIC_PRICE_CURRENCIES=eur,usd,gbp,
 * docs/marketing/LOCAL-PRICES.md): what the Stripe account says about charging them. Prints the
 * account's country and payout currency, which currencies its recent charges were in (the account is
 * shared, so another business's dollar sales count as proof the account takes dollars), which
 * currencies its balance holds (a dollar balance means dollars are paid out as dollars, with no 2%
 * conversion), and the countries Stripe Tax is registered in (no US or UK registration: Stripe adds
 * no tax there, and UK VAT stays ours to work out, as today).
 *
 * Read-only: it only retrieves and lists, and prints counts, never a customer.
 *   vercel env pull .env.vercel --environment=production
 *   node --env-file=.env.vercel scripts/check-currencies.mjs
 *   rm .env.vercel
 */
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY is not set (see the comment at the top for how to run this).");
  process.exit(1);
}
const stripe = new Stripe(key);
const count = (values) => Object.entries(values.reduce((all, v) => ({ ...all, [v]: (all[v] ?? 0) + 1 }), {})).map(([k, n]) => `${k} ${n}`).join(", ") || "none";

const account = await stripe.accounts.retrieve();
console.log(`Account: ${account.country}, pays out in ${account.default_currency?.toUpperCase()} (${key.startsWith("sk_live") ? "live" : "test"} mode)`);

const charges = [];
for await (const charge of stripe.charges.list({ limit: 100, created: { gte: Math.floor(Date.now() / 1000) - 90 * 86400 } })) {
  charges.push(charge);
  if (charges.length >= 1000) break;
}
const paid = charges.filter((c) => c.paid && !c.refunded);
console.log(`Charges, last 90 days (up to 1,000): ${paid.length} paid, by currency: ${count(paid.map((c) => c.currency.toUpperCase()))}`);
const shown = paid.map((c) => c.presentment_details?.presentment_currency?.toUpperCase()).filter(Boolean);
if (shown.length) console.log(`  shown to the buyer in another currency first (Adaptive Pricing): ${count(shown)}`);

const balance = await stripe.balance.retrieve();
console.log(`Balance held in: ${[...new Set([...balance.available, ...balance.pending].map((b) => b.currency.toUpperCase()))].join(", ")}`);

const tax = await stripe.tax.settings.retrieve().catch((e) => ({ status: `unreadable (${e.code ?? e.type})` }));
console.log(`Stripe Tax: ${tax.status}`);
const registrations = await stripe.tax.registrations.list({ status: "active", limit: 100 }).catch(() => ({ data: [] }));
console.log(`Tax registrations: ${registrations.data.map((r) => r.country + (r.country_options?.us?.state ? `-${r.country_options.us.state}` : "")).join(", ") || "none"}`);
for (const country of ["US", "GB"]) {
  if (!registrations.data.some((r) => r.country === country)) console.log(`  ${country}: none, so Stripe adds no tax there and the price is the whole charge`);
}
