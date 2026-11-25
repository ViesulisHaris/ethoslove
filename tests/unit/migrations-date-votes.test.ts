import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 0026 adds the counters behind "Was this a good date?" (BRIEF-dates2.md 3). The shared checks in
 * migrations.test.ts (run twice, additive, RLS on) cover it too; these are what this file must do
 * for a live site that keeps working while it has not been applied. Nothing here runs the SQL.
 */
const raw = readFileSync(join(process.cwd(), "supabase/migrations/0026_date_votes.sql"), "utf8");
const sql = raw
  .replace(/--.*$/gm, "")
  .toLowerCase()
  .replace(/\s+/g, " ");

describe("0026: date votes", () => {
  it("M1 waits at most a few seconds for a lock", () => {
    expect(sql.trim().startsWith("set local lock_timeout = '5s';")).toBe(true);
  });

  it("M2 only adds: one table, one function, nothing else touched", () => {
    expect(sql.match(/create table/g)).toHaveLength(1);
    expect(sql).toContain("create table if not exists public.date_votes (");
    expect(sql.match(/create (or replace )?function/g)).toHaveLength(1);
    expect(sql).toContain("create or replace function public.date_votes_apply(");
    for (const m of sql.matchAll(/alter table ([a-z_.]+)/g)) expect(m[1]).toBe("public.date_votes");
    for (const bad of ["drop ", "update public.", "delete from", "truncate"]) expect(sql, bad).not.toContain(bad);
  });

  it("M3 row-level security is on, with no policy, and the public roles are shut out", () => {
    expect(sql).toContain("alter table public.date_votes enable row level security;");
    expect(sql).not.toContain("create policy");
    expect(sql).toContain("revoke all on public.date_votes from public, anon, authenticated;");
  });

  it("M4 the function runs as its owner on a fixed path, never goes under zero, takes nine at most, and only the service role may call it", () => {
    const fn = sql.slice(sql.indexOf("create or replace function public.date_votes_apply("), sql.lastIndexOf("$$") + 2);
    expect(fn).toContain("security definer set search_path = public");
    expect(fn).toContain("yes = greatest(v.yes + p_yes[i], 0)");
    expect(fn).toContain("no = greatest(v.no + p_no[i], 0)");
    expect(fn).toContain("array_length(p_targets, 1) > 9");
    expect(sql).toContain("revoke all on function public.date_votes_apply(text[], integer[], integer[]) from public, anon, authenticated;");
    expect(sql).toContain("grant execute on function public.date_votes_apply(text[], integer[], integer[]) to service_role;");
    expect(sql.match(/grant /g)).toHaveLength(1);
  });

  it("M6 keeps nothing about a person", () => {
    const table = sql.slice(sql.indexOf("create table if not exists public.date_votes ("), sql.indexOf("alter table public.date_votes"));
    const columns = [...table.matchAll(/(?:\(|, )\s*([a-z_]+) (text|integer|timestamptz)/g)].map((m) => m[1]);
    expect(columns).toEqual(["target", "yes", "no", "updated_at"]);
    for (const c of columns) expect(c).not.toMatch(/ip|user|session|device|email/);
  });

  it("M5 the table's pattern is the code's", async () => {
    const { TARGET } = await import("@/lib/dates/votes");
    const inSql = raw.match(/check \(target ~ '([^']+)'\)/)?.[1];
    expect(inSql).toBeDefined();
    expect(inSql).toBe(TARGET.source.replaceAll("\\d", "[0-9]").replaceAll("\\/", "/"));
  });
});
