import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { DATA_MAX_BYTES, MAX_SAVED_DATES, TITLE_MAX } from "@/lib/saved-dates/validate";

vi.mock("server-only", () => ({}));
const { REMINDER_BATCH } = await import("@/lib/saved-dates/reminders");

/**
 * 0015 adds saved dates (docs/MEMBERSHIP.md 1.5, 1.7). The shared checks in migrations.test.ts (run
 * twice, additive, RLS on, trigger functions off the API) cover it too; these are what this file
 * must do for the code and for the live site sharing the database, which never reads the new table.
 * Nothing here can run the SQL, so it is read.
 */
const raw = readFileSync(join(process.cwd(), "supabase/migrations/0015_saved_dates.sql"), "utf8");
const sql = raw
  .replace(/--.*$/gm, "")
  .toLowerCase()
  .replace(/\s+/g, " ");
/** One function's body, from its `create or replace` to the next statement after its `$$`. */
const fn = (name: string) => {
  const start = sql.indexOf(`create or replace function public.${name}(`);
  expect(start).toBeGreaterThanOrEqual(0);
  const open = sql.indexOf("$$", start);
  return sql.slice(start, sql.indexOf("$$", open + 2) + 2);
};

describe("0015: saved dates", () => {
  it("waits at most a few seconds for a lock", () => {
    expect(sql.trim().startsWith("set local lock_timeout = '5s';")).toBe(true);
  });

  it("is safe to run twice: every statement creates only if missing, or replaces", () => {
    expect(sql).toContain("create table if not exists public.saved_dates (");
    expect(sql.match(/create (unique )?index (?!if not exists)/g)).toBeNull();
    expect(sql.match(/create function |create trigger /g)).toBeNull();
    for (const [, name] of sql.matchAll(/create policy "([^"]+)"/g)) expect(sql).toContain(`drop policy if exists "${name}" on public.saved_dates;`);
  });

  it("only adds: no other table is altered, nothing is updated, deleted or dropped", () => {
    expect(sql).not.toMatch(/drop table|drop column|drop function|rename |alter column|truncate/);
    expect(sql.match(/alter table public\.(\w+)/g)).toEqual(["alter table public.saved_dates"]);
    expect(sql).not.toMatch(/\bupdate public\.|\bdelete from\b|\binsert into\b/);
  });

  it("keeps the table's checks in step with what the API accepts", () => {
    expect(TITLE_MAX).toBe(80);
    expect(sql).toContain(`title text not null default '' check (char_length(title) <= ${TITLE_MAX})`);
    expect(sql).toContain("city text check (char_length(city) <= 80)");
    expect(sql).toContain("data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 16384)");
    expect(DATA_MAX_BYTES).toBeLessThan(16384);
    expect(sql).toContain("stops_count smallint not null default 0 check (stops_count between 0 and 99)");
    expect(sql).toContain("kind text not null check (kind in ('date', 'trip'))");
    expect(sql).toContain("version integer not null default 1 check (version >= 1)");
    expect(sql).toContain("remind boolean not null default true");
  });

  it("belongs to one account, goes with it, and forgets an editor who deleted theirs", () => {
    expect(sql).toContain("owner_user_id uuid not null references public.profiles (id) on delete cascade");
    expect(sql).toContain("last_edited_by uuid references public.profiles (id) on delete set null");
  });

  it("stamps every row and every new version with the database's clock", () => {
    expect(sql).toContain("created_at timestamptz not null default now()");
    expect(sql).toContain("updated_at timestamptz not null default now()");
    const touch = fn("saved_dates_touch");
    expect(touch).toContain("returns trigger");
    expect(touch).toContain("if new.version is distinct from old.version then new.updated_at := now(); end if;");
    expect(sql).toContain("create or replace trigger saved_dates_touch before update on public.saved_dates for each row execute function public.saved_dates_touch();");
  });

  it("turns row-level security on, and lets signed-in people read their own rows and their partner's, nothing more", () => {
    expect(sql).toContain("alter table public.saved_dates enable row level security;");
    expect(sql).toContain('create policy "saved_dates: owner or partner read" on public.saved_dates for select to authenticated using ((select auth.uid()) = owner_user_id or owner_user_id = (select public.couple_partner((select auth.uid()))));');
    expect(sql.match(/create policy/g)).toHaveLength(1);
    // Every write is the API's, with the service role, after the membership checks.
    expect(sql).toContain("revoke all on public.saved_dates from anon;");
    expect(sql).toContain("revoke insert, update, delete on public.saved_dates from authenticated;");
    expect(sql).toContain("grant select on public.saved_dates to authenticated;");
  });

  it("answers couple_partner() and is_member() only about the caller, and never to anon", () => {
    for (const name of ["couple_partner", "is_member"]) {
      const body = fn(name);
      expect(body).toContain("security definer set search_path = public");
      expect(body).toContain("where p_user = coalesce((select auth.uid()), p_user)");
      expect(body).toContain("cp.starts_at <= now() and cp.ends_at > now()");
      expect(sql).toContain(`revoke all on function public.${name}(uuid) from public, anon;`);
      expect(sql).toContain(`grant execute on function public.${name}(uuid) to authenticated, service_role;`);
    }
    expect(fn("couple_partner")).toContain("and cp.partner_user_id is not null");
  });

  it("keeps one row per trip per account, which the API answers with the row it has", () => {
    expect(sql).toContain("create unique index if not exists saved_dates_trip_idx on public.saved_dates (owner_user_id, (data ->> 'tripid')) where kind = 'trip';");
    expect(sql).toContain("create index if not exists saved_dates_owner_idx on public.saved_dates (owner_user_id, updated_at desc);");
    expect(sql).toContain("create index if not exists saved_dates_day_idx on public.saved_dates (day) where remind and day is not null;");
  });

  it("has a 500 backstop the API tells apart from a CHECK by its words, kept off the API", () => {
    const cap = fn("saved_dates_cap");
    expect(cap).toContain(`>= ${MAX_SAVED_DATES} then raise exception 'too many saved dates' using errcode = '23514';`);
    // server.ts reads exactly these words to answer "limit_reached" rather than "invalid_input".
    expect(readFileSync(join(process.cwd(), "src/lib/saved-dates/server.ts"), "utf8")).toContain('const CAP_MESSAGE = "too many saved dates";');
    expect(sql).toContain("revoke all on function public.saved_dates_cap() from public, anon, authenticated;");
    expect(sql).toContain("create or replace trigger saved_dates_cap before insert on public.saved_dates for each row execute function public.saved_dates_cap();");
    expect(sql).toContain("revoke all on function public.saved_dates_touch() from public, anon, authenticated;");
  });

  it("gives the reminder cron members' rows only, oldest first and bounded, and only to the service role", () => {
    const due = fn("saved_dates_due");
    expect(due).toContain("returns setof public.saved_dates language sql stable");
    expect(due).not.toContain("security definer");
    expect(due).toContain("where sd.remind and sd.day = p_day and (sd.reminded_for is null or sd.reminded_for <> p_day)");
    // The same test as is_member(): a running membership, as owner or partner.
    expect(due).toContain("and exists ( select 1 from public.couple_passes cp where (cp.owner_user_id = sd.owner_user_id or cp.partner_user_id = sd.owner_user_id) and cp.starts_at <= now() and cp.ends_at > now() )");
    expect(due).toContain("order by sd.created_at, sd.id limit greatest(least(p_limit, 500), 0)");
    expect(REMINDER_BATCH).toBeLessThanOrEqual(500);
    expect(sql).toContain("revoke all on function public.saved_dates_due(date, integer) from public, anon, authenticated;");
    expect(sql).toContain("grant execute on function public.saved_dates_due(date, integer) to service_role;");
  });

  it("creates the table before anything that reads its type, and the functions its policy calls before the policy", () => {
    expect(sql.indexOf("create table if not exists public.saved_dates")).toBeLessThan(sql.indexOf("create or replace function public.saved_dates_due("));
    expect(sql.indexOf("create or replace function public.couple_partner(")).toBeLessThan(sql.indexOf('create policy "saved_dates: owner or partner read"'));
  });
});
