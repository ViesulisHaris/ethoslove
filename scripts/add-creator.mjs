/**
 * Adds a creator to the programme and prints their personal link. They are credited only through
 * that link (?ref=c-<code>): there is no code for followers to type and no discount, so the price is
 * everyone's price. scripts/creator-payouts.mjs reports what they earn. Writes one creators row with
 * the service role; refuses to overwrite a code that is already taken.
 *
 *   node scripts/add-creator.mjs CODE "Name" email [--commission=30] [--env=.env.local]
 *
 * CODE is 3–20 letters and digits, stored in capitals; the link carries it in lower case. The email
 * goes in creators.contact and is required: it is how the creator's own purchases are recognised and
 * left out of their commission. To pause a link later: update creators set active = false where code = 'CODE'.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const SITE = "https://tryethos.io";

const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
const [rawCode, name, contact] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const code = (rawCode ?? "").trim().toUpperCase();
const email = (contact ?? "").trim().toLowerCase();
const commission = Number(flags.commission ?? 30);

const problems = [];
if (!/^[A-Z0-9]{3,20}$/.test(code)) problems.push(`code "${rawCode ?? ""}" must be 3–20 letters and digits`);
if (!name?.trim()) problems.push("a name is needed");
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push("the creator's email is needed: it is how their own purchases are kept out of their commission");
if (!Number.isInteger(commission) || commission < 0 || commission > 90) problems.push("--commission must be a whole percentage, 0–90");
if (flags.discount !== undefined) problems.push("--discount is gone: creators are paid a commission, and buyers pay the normal price");
if (problems.length) {
  console.error(`${problems.join("\n")}\n\nUsage: node scripts/add-creator.mjs CODE "Name" email [--commission=30]`);
  process.exit(1);
}

const envFile = flags.env ?? ".env.local";
const env = Object.fromEntries(readFileSync(envFile, "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]));
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(`No NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in ${envFile}`);
  process.exit(1);
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// A plain insert, so an existing code (someone else's) is an error, never silently replaced.
// discount_pct is a column from before the programme dropped discounts (0009): nothing reads it, and
// 0 keeps a row from ever looking like it promises one.
const { data, error } = await db
  .from("creators")
  .insert({ code, name: name.trim(), contact: email, commission_pct: commission, discount_pct: 0 })
  .select()
  .single();
if (error) {
  console.error(error.code === "23505" ? `The code ${code} is already taken.` : `Couldn't add ${code}: ${error.message}`);
  process.exit(1);
}
console.log(`Added ${data.code} for ${data.name} <${data.contact}>, commission ${data.commission_pct}%.\nTheir link: ${SITE}/?ref=c-${data.code.toLowerCase()}`);
