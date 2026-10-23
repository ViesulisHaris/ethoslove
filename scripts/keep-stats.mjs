/**
 * How "Keep this gift" is doing, read-only: how many recipients asked for a gift's link, how many
 * confirmed their address, the reminders they set (and how many have been sent), and what was sold
 * through the links in their emails (purchases with ref "gift-keep"). Taps on the end screen's link
 * and the keep page's sends are counted in Vercel Web Analytics (keep_tapped, keep_requested, and
 * page views of /g/[shortId]/keep); everything here is from the database.
 *
 *   node scripts/keep-stats.mjs [--days=45] [--env=.env.local]
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
const days = Number(flags.days ?? 45);
if (!Number.isInteger(days) || days < 1 || days > 3650) {
  console.error("Usage: node scripts/keep-stats.mjs [--days=45] [--env=.env.local]");
  process.exit(1);
}
const envFile = flags.env ?? ".env.local";
const env = Object.fromEntries(readFileSync(envFile, "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]));
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(`No NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in ${envFile}`);
  process.exit(1);
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const since = new Date(Date.now() - days * 86_400_000).toISOString();
const count = async (query) => {
  const { count: n, error } = await query;
  if (error) throw new Error(error.message);
  return n ?? 0;
};

try {
  // Unconfirmed keeps are deleted after seven days, so "asked" counts what is still there plus every confirmed one.
  const asked = await count(db.from("gift_keeps").select("id", { count: "exact", head: true }).gte("created_at", since));
  const confirmed = await count(db.from("gift_keeps").select("id", { count: "exact", head: true }).gte("created_at", since).not("confirmed_at", "is", null));
  const reminders = await count(db.from("keep_reminders").select("id", { count: "exact", head: true }).gte("created_at", since));
  const sent = await count(db.from("keep_reminders").select("id", { count: "exact", head: true }).not("last_sent_year", "is", null));
  const { data: sales, error } = await db.from("purchases").select("amount, currency").eq("ref", "gift-keep").eq("status", "paid").gte("created_at", since);
  if (error) throw new Error(error.message);
  const revenue = Object.entries(
    (sales ?? []).reduce((acc, p) => ({ ...acc, [p.currency]: (acc[p.currency] ?? 0) + p.amount }), {}),
  ).map(([currency, minor]) => `${(minor / 100).toFixed(2)} ${currency.toUpperCase()}`);
  console.log(`Last ${days} days
  asked for a gift's link   ${asked}  (unconfirmed ones go after 7 days)
  confirmed their address   ${confirmed}
  reminders set             ${reminders}
  reminders sent (ever)     ${sent}
  purchases via gift-keep   ${(sales ?? []).length}${revenue.length ? `  (${revenue.join(", ")})` : ""}`);
} catch (e) {
  console.error(`Couldn't read the numbers: ${e.message}. Has migration 0017 been applied?`);
  process.exit(1);
}
