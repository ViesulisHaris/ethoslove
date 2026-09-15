/**
 * Runs the daily storage sweep by hand (the same rules as the cron, lib/gift/retention.ts):
 * deletes drafts untouched for 7 days and unreferenced files older than 24 hours.
 *   node scripts/storage-retention.mjs [budgetSeconds=240] [--dry-run]
 * Uses the service role in .env.local, so it acts on the project that key belongs to.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const budgetMs = Number(process.argv[2] ?? 240) * 1000;
const dryRun = process.argv.includes("--dry-run");
const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const started = Date.now();
if (!dryRun) {
  const { data: purged, error } = await admin.rpc("purge_stale_drafts", { p_days: 7 });
  console.log("stale drafts deleted:", error ? "error " + error.message : purged);
}
let deleted = 0, bytes = 0;
while (Date.now() - started < budgetMs) {
  const { data: rows, error } = await admin.rpc("storage_orphans", { p_limit: 500 });
  if (error) { console.log("orphans error:", error.message); break; }
  if (!rows?.length) break;
  if (dryRun) { console.log("would delete", rows.length, "files,", (rows.reduce((s, r) => s + Number(r.bytes), 0) / 1e9).toFixed(2), "GB (first page)"); break; }
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error: rmErr } = await admin.storage.from("gifts").remove(batch.map((r) => r.name));
    if (rmErr) { console.log("remove error:", rmErr.message); process.exit(1); }
    deleted += batch.length;
    bytes += batch.reduce((s, r) => s + Number(r.bytes), 0);
  }
  console.log(`… ${deleted} files, ${(bytes / 1e9).toFixed(2)} GB, ${Math.round((Date.now() - started) / 1000)}s`);
  if (rows.length < 500) break;
}
console.log(`done: ${deleted} files removed, ${(bytes / 1e9).toFixed(2)} GB freed`);
