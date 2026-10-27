/**
 * The approval step before a recipient's reaction appears on the site (src/lib/proof). Only reactions
 * whose writer ticked "Ethos may show this reaction on its site, without your name", and whose sender
 * hasn't said no, are listed. Approve one only if its words name nobody and give nothing away (no
 * names, no places, nothing from the gift): the site shows the emoji and the words, as they are. An
 * approved reaction appears once it is seven days old (the sender's time to say no), only on pages in
 * its own language (en or es, the gift's), and the newest three approved in a language replace that
 * language's samples on /gifts.
 *
 *   node scripts/reactions.mjs                 waiting for a decision, oldest first
 *   node scripts/reactions.mjs approved        on the site now (or once seven days old)
 *   node scripts/reactions.mjs approve <id>    approve one
 *   node scripts/reactions.mjs remove <id>     take one off the site again
 *   [--env=.env.local]
 *
 * Words are printed as JSON strings, so nothing in them can play tricks on the terminal.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const SHOWN_TEXT_MAX = 140;
const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
const [command = "list", id] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (!["list", "approved", "approve", "remove"].includes(command) || ((command === "approve" || command === "remove") && !UUID.test(id ?? ""))) {
  console.error("Usage: node scripts/reactions.mjs [approved | approve <id> | remove <id>] [--env=.env.local]");
  process.exit(1);
}

const envFile = flags.env ?? ".env.local";
const env = Object.fromEntries(readFileSync(envFile, "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]));
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(`No NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in ${envFile}`);
  process.exit(1);
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const COLUMNS = "id, emoji, text, locale, created_at, share_consent_at, approved_at";
const line = (r) => `${r.id}  ${r.created_at.slice(0, 10)}  ${r.locale ?? "??"}  ${r.emoji}  ${JSON.stringify(r.text ?? "")}${(r.text ?? "").length > SHOWN_TEXT_MAX ? "  (too long to show)" : ""}`;

if (command === "list" || command === "approved") {
  let query = db.from("reactions").select(COLUMNS).eq("share_consent", true).is("sender_withheld_at", null).not("text", "is", null);
  query = command === "list" ? query.is("approved_at", null).order("created_at", { ascending: true }) : query.not("approved_at", "is", null).order("approved_at", { ascending: false });
  const { data, error } = await query.limit(200);
  if (error) {
    console.error(`Couldn't read reactions: ${error.message}`);
    process.exit(1);
  }
  console.log(data.length ? data.map(line).join("\n") : command === "list" ? "Nothing waiting." : "None approved yet.");
  process.exit(0);
}

const { data: row, error } = await db.from("reactions").select(`${COLUMNS}, share_consent, sender_withheld_at`).eq("id", id).maybeSingle();
if (error || !row) {
  console.error(error ? `Couldn't read it: ${error.message}` : `No reaction ${id}.`);
  process.exit(1);
}
if (command === "approve") {
  const problem = !row.share_consent ? "its writer didn't agree to it being shown" : row.sender_withheld_at ? "the sender asked for it to stay private" : !row.text?.trim() ? "it has no words to show" : row.text.length > SHOWN_TEXT_MAX ? `its words are over ${SHOWN_TEXT_MAX} characters` : null;
  if (problem) {
    console.error(`Not approved: ${problem}.`);
    process.exit(1);
  }
  const { error: updateError } = await db.from("reactions").update({ approved_at: new Date().toISOString() }).eq("id", id).is("approved_at", null);
  if (updateError) {
    console.error(`Couldn't approve it: ${updateError.message}`);
    process.exit(1);
  }
  console.log(`Approved: ${line(row)}`);
} else {
  const { error: updateError } = await db.from("reactions").update({ approved_at: null }).eq("id", id);
  if (updateError) {
    console.error(`Couldn't remove it: ${updateError.message}`);
    process.exit(1);
  }
  console.log(`Off the site: ${line(row)}`);
}
