/**
 * What each creator earned in a month: the sales that came through their personal link
 * (?ref=c-<code>, recorded as purchases.creator_code), what was paid for them, and their commission
 * at the rate on their creators row (30% by default). Read-only.
 *
 *   node scripts/creator-payouts.mjs [YYYY-MM=last month] [envFile=.env.local]
 *
 * .env.local points at whatever project its service key belongs to. For the real figures, pull
 * production's and delete them after:
 *   vercel env pull .env.vercel --environment=production
 *   node scripts/creator-payouts.mjs 2026-09 .env.vercel
 *   rm .env.vercel
 *
 * The commission is worked out after VAT and refunds, as the /creators page promises: only
 * purchases still marked paid count, a disputed sale earns nothing, and a partly refunded one earns
 * on what was kept. The database keeps the VAT-inclusive amount only, so each sale's VAT and refunds
 * are read back from its Stripe Checkout Session and charge (reads, nothing is changed): the env
 * file needs STRIPE_SECRET_KEY. A creator's own purchases earn nothing: a sale whose buyer's account
 * email is the creator's contact is left out and listed. Ethos for Two counts like any other sale,
 * on its first payment only: a subscription's renewals carry no creator code. Payouts go out monthly once a creator is
 * owed over €20; less carries over, so the report says which. It doesn't know what was carried
 * from earlier months: add those by hand. A sale Stripe didn't work VAT out for (automatic tax off,
 * as in test mode before Stripe Tax is set up) is counted with its VAT and flagged, never guessed.
 */
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { readFileSync } from "node:fs";

const month = process.argv[2] ?? (() => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
})();
if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
  console.error(`Month must look like 2026-09, not "${month}"`);
  process.exit(1);
}
const envFile = process.argv[3] ?? ".env.local";
const env = Object.fromEntries(readFileSync(envFile, "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]));
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(`No NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in ${envFile}`);
  process.exit(1);
}
if (!env.STRIPE_SECRET_KEY) {
  console.error(`No STRIPE_SECRET_KEY in ${envFile}: it is needed to take VAT out of each sale before the commission`);
  process.exit(1);
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const stripe = new Stripe(env.STRIPE_SECRET_KEY);
// Test purchases land in the same database (development runs on test keys against it): a sale
// counts only when its session was made in the same mode as the key.
const liveKey = /_live_/.test(env.STRIPE_SECRET_KEY);
const sameMode = (sessionId) => !sessionId || sessionId.startsWith(liveKey ? "cs_live_" : "cs_test_");

/** Payouts go out once a creator is owed over this much (in euros); less carries over to next month. */
const PAYOUT_MIN_EUR = 20;

/**
 * The part of a sale that is neither VAT nor refunded, in the purchase's own currency. Prices are
 * VAT-inclusive, so the session's tax over its total is the VAT share, and the charge's refunded
 * amount over the total is the refunded share (a refund gives the VAT back with it); applying both
 * to the recorded amount also holds when Stripe showed the buyer a converted price.
 */
async function netOfVatAndRefunds(sale) {
  if (!sale.stripe_session_id) return { net: sale.amount, known: false };
  const session = await stripe.checkout.sessions.retrieve(sale.stripe_session_id, { expand: ["payment_intent.latest_charge"] });
  const tax = session.total_details?.amount_tax ?? 0;
  const total = session.amount_total ?? 0;
  if (total <= 0) return { net: 0, known: true };
  // Without automatic tax Stripe reports no VAT at all, and the whole price would earn commission.
  const vatKnown = session.automatic_tax?.enabled === true;
  const charge = typeof session.payment_intent === "object" && session.payment_intent ? session.payment_intent.latest_charge : await firstInvoiceCharge(sale);
  if (charge && typeof charge === "object" && charge.disputed) return { net: 0, known: true, disputed: true };
  const refunded = charge && typeof charge === "object" ? Math.min(total, charge.amount_refunded ?? 0) : 0;
  return { net: Math.round(sale.amount * ((total - tax) / total) * ((total - refunded) / total)), known: vatKnown, refunded: refunded > 0 };
}

/**
 * A subscription's Checkout Session has no payment intent of its own: its first invoice paid it,
 * and fulfilment recorded that payment intent on the purchase. A withdrawal (a partial refund) or a
 * dispute shows there.
 */
async function firstInvoiceCharge(sale) {
  if (!sale.stripe_payment_intent_id) return null;
  const intent = await stripe.paymentIntents.retrieve(sale.stripe_payment_intent_id, { expand: ["latest_charge"] });
  return intent.latest_charge;
}

const from = new Date(`${month}-01T00:00:00.000Z`);
const to = new Date(from);
to.setUTCMonth(to.getUTCMonth() + 1);

const { data: creators, error: creatorsError } = await db.from("creators").select("code, name, contact, commission_pct");
if (creatorsError) {
  console.error("creators:", creatorsError.message);
  process.exit(1);
}
const sales = [];
for (let page = 0; ; page++) {
  const { data, error } = await db
    .from("purchases")
    .select("creator_code, amount, currency, product, created_at, stripe_session_id, stripe_payment_intent_id, user_id")
    .not("creator_code", "is", null)
    .eq("status", "paid")
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString())
    .order("created_at", { ascending: true })
    .range(page * 1000, page * 1000 + 999);
  if (error) {
    console.error("purchases:", error.message);
    process.exit(1);
  }
  sales.push(...data);
  if (data.length < 1000) break;
}

const otherMode = sales.filter((sale) => !sameMode(sale.stripe_session_id)).length;
sales.splice(0, sales.length, ...sales.filter((sale) => sameMode(sale.stripe_session_id)));

// A creator's own purchases earn nothing: the buyer's account email against the creator's contact.
const buyerIds = [...new Set(sales.map((sale) => sale.user_id).filter(Boolean))];
const emails = new Map();
for (let i = 0; i < buyerIds.length; i += 200) {
  const { data, error } = await db.from("profiles").select("id, email").in("id", buyerIds.slice(i, i + 200));
  if (error) {
    console.error("profiles:", error.message);
    process.exit(1);
  }
  for (const p of data) emails.set(p.id, (p.email ?? "").trim().toLowerCase());
}
const ownPurchase = (sale) => {
  const contact = creators.find((c) => c.code === sale.creator_code)?.contact?.trim().toLowerCase();
  return Boolean(contact && sale.user_id && emails.get(sale.user_id) === contact);
};
const own = sales.filter(ownPurchase);
sales.splice(0, sales.length, ...sales.filter((sale) => !ownPurchase(sale)));

const money = (minor, currency) => `${(minor / 100).toFixed(2)} ${currency.toUpperCase()}`;
const byCreator = new Map();
for (const sale of sales) {
  const creator = creators.find((c) => c.code === sale.creator_code);
  const pct = creator?.commission_pct ?? 0;
  const row = byCreator.get(sale.creator_code) ?? { creator, sales: 0, paid: {}, net: {}, commission: {}, unknown: 0, refunded: 0, disputed: 0 };
  const { net, known, refunded, disputed } = await netOfVatAndRefunds(sale);
  row.sales += 1;
  if (!known) row.unknown += 1;
  if (refunded) row.refunded += 1;
  if (disputed) row.disputed += 1;
  row.paid[sale.currency] = (row.paid[sale.currency] ?? 0) + sale.amount;
  row.net[sale.currency] = (row.net[sale.currency] ?? 0) + net;
  // Per sale, rounded to the cent, so the total is the sum of what each sale earned.
  row.commission[sale.currency] = (row.commission[sale.currency] ?? 0) + Math.round((net * pct) / 100);
  byCreator.set(sale.creator_code, row);
}

const mode = env.NEXT_PUBLIC_SUPABASE_URL.replace(/^https?:\/\//, "").split(".")[0];
console.log(`Creator payouts for ${month} (project ${mode}, ${liveKey ? "live" : "test"} sales)`);
if (otherMode) console.log(`(${otherMode} ${liveKey ? "test-mode" : "live"} sale(s) left out)`);
if (own.length) console.log(`(${own.length} sale(s) left out as the creator's own purchase: ${[...new Set(own.map((s) => s.creator_code))].join(", ")})`);
if (!byCreator.size) console.log("\nNo sales through a creator's link.");
for (const [code, row] of [...byCreator].sort((a, b) => b[1].sales - a[1].sales)) {
  const who = row.creator ? `${row.creator.name}${row.creator.contact ? ` <${row.creator.contact}>` : ""}, ${row.creator.commission_pct}%` : "NOT IN creators: no rate on file";
  const paid = Object.entries(row.paid).map(([c, m]) => money(m, c)).join(" + ");
  const net = Object.entries(row.net).map(([c, m]) => money(m, c)).join(" + ");
  const owed = Object.entries(row.commission).map(([c, m]) => money(m, c)).join(" + ");
  // A sale with no session id, or one Stripe worked no tax out for, can't have its VAT taken out: say so rather than guess.
  const warn = row.unknown ? `\n  CHECK BY HAND: ${row.unknown} sale(s) with no Stripe session or no automatic tax, counted with VAT` : "";
  const adjusted = row.refunded || row.disputed ? `\n  ${row.refunded} partly refunded, ${row.disputed} disputed (earning nothing)` : "";
  const eur = row.commission.eur ?? 0;
  const other = Object.keys(row.commission).some((c) => c !== "eur");
  const payout = other
    ? "CHECK BY HAND: owed in more than one currency"
    : row.unknown
      ? "CHECK BY HAND before paying: the VAT isn't out of every sale yet"
      : eur > PAYOUT_MIN_EUR * 100
        ? "PAY this month"
        : `not over €${PAYOUT_MIN_EUR}: carries over to next month`;
  console.log(`\n${code}  (${who})\n  ${row.sales} sale(s), paid ${paid}, ${net} after VAT and refunds${adjusted}\n  commission ${owed}: ${payout}${warn}`);
}
