/**
 * The creator campaign's grants (src/lib/commerce/campaign-rules.ts): who has one, how far through it
 * they are, and the owner's levers. A grant lives in the account's app_metadata.campaign.
 *
 *   node scripts/campaign.mjs report                  every grant: state, window, gifts published, live gifts
 *   node scripts/campaign.mjs extend <email> <days>   push the end out by <days> from now (a creator still posting)
 *   node scripts/campaign.mjs extend <email> forever  no end: a creator who has earned their first $6 on Whop
 *   node scripts/campaign.mjs revoke <email>          switch it off now (abuse); their gifts stay live
 *   node scripts/campaign.mjs restore <email>         undo a revoke
 *
 * Add an env file as the last argument to point somewhere other than .env.local, whose service key is
 * production's: report reads, the others change that account straight away.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

const TEMPLATES = ["coquette", "xoxo", "bouquet", "birthday-cinema"];
const LIMIT = 20;
const DAY_MS = 86_400_000;

const args = process.argv.slice(2);
const envFile = args.length && existsSync(args[args.length - 1]) && /\.env/.test(args[args.length - 1]) ? args.pop() : ".env.local";
const [command = "report", email, amount] = args;
const env = Object.fromEntries(readFileSync(envFile, "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]));
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(`No NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in ${envFile}`);
  process.exit(1);
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function allUsers() {
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

const stateOf = (grant, now) => (grant.revokedAt ? "revoked" : grant.endsAt && Date.parse(grant.endsAt) <= now ? "ended" : "active");
const day = (iso) => (iso ? iso.slice(0, 16).replace("T", " ") : "no end");

async function userByEmail(address) {
  const user = (await allUsers()).find((u) => u.email?.toLowerCase() === address?.toLowerCase());
  if (!user) {
    console.error(`No account with the email ${address}`);
    process.exit(1);
  }
  return user;
}

async function setGrant(user, patch) {
  const grant = user.app_metadata?.campaign;
  if (!grant) {
    console.error(`${user.email} has no campaign grant (they get one by entering the password on /campaign).`);
    process.exit(1);
  }
  const next = { ...grant, ...patch };
  const { error } = await db.auth.admin.updateUserById(user.id, { app_metadata: { ...user.app_metadata, campaign: next } });
  if (error) throw error;
  console.log(`${user.email}: ${stateOf(next, Date.now())}, ends ${day(next.endsAt)}, ${next.published ?? 0} of ${LIMIT} published`);
}

if (command === "report") {
  const now = Date.now();
  const granted = (await allUsers()).filter((u) => u.app_metadata?.campaign);
  if (!granted.length) {
    console.log("No campaign grants yet.");
    process.exit(0);
  }
  const { data: gifts } = await db
    .from("gifts")
    .select("user_id")
    .in("user_id", granted.map((u) => u.id))
    .in("template_slug", TEMPLATES)
    .in("status", ["live", "scheduled"])
    .eq("watermark", true);
  const live = new Map();
  for (const g of gifts ?? []) live.set(g.user_id, (live.get(g.user_id) ?? 0) + 1);
  const rows = granted
    .map((u) => ({ u, g: u.app_metadata.campaign }))
    .sort((a, b) => Date.parse(b.g.grantedAt) - Date.parse(a.g.grantedAt));
  const width = Math.max(5, ...rows.map(({ u }) => (u.email ?? "").length));
  console.log(`${"email".padEnd(width)}  state    granted           ends              published  live`);
  for (const { u, g } of rows)
    console.log(`${(u.email ?? "").padEnd(width)}  ${stateOf(g, now).padEnd(7)}  ${day(g.grantedAt)}  ${day(g.endsAt).padEnd(16)}  ${String(g.published ?? 0).padStart(5)}/${LIMIT}  ${String(live.get(u.id) ?? 0).padStart(4)}`);
  const active = rows.filter(({ g }) => stateOf(g, now) === "active").length;
  console.log(`\n${rows.length} grants, ${active} active, ${rows.reduce((n, { g }) => n + (g.published ?? 0), 0)} gifts published through the campaign.`);
} else if (command === "extend") {
  if (!email || !amount) throw new Error("extend <email> <days|forever>");
  const endsAt = amount === "forever" ? null : new Date(Date.now() + Number(amount) * DAY_MS).toISOString();
  if (amount !== "forever" && !(Number(amount) > 0)) throw new Error(`Days must be a number above 0, not "${amount}"`);
  await setGrant(await userByEmail(email), { endsAt });
} else if (command === "revoke") {
  if (!email) throw new Error("revoke <email>");
  await setGrant(await userByEmail(email), { revokedAt: new Date().toISOString() });
} else if (command === "restore") {
  if (!email) throw new Error("restore <email>");
  await setGrant(await userByEmail(email), { revokedAt: null });
} else {
  console.error(`Unknown command "${command}": report, extend, revoke or restore.`);
  process.exit(1);
}
