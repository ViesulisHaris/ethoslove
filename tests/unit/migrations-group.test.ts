import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CONTRIBUTION_LIMITS } from "@/lib/gift/schema";
import { GROUP_LIMITS } from "@/lib/group/limits";

/**
 * 0023 adds group cards (src/lib/group). The shared checks in migrations.test.ts (run twice,
 * additive, RLS on, trigger functions off the API) cover it too; these are what this file must do
 * for the code, and for the live site sharing the database, which reads none of it. It is applied by
 * hand, later, and maybe twice. Nothing here can run the SQL, so it is read.
 */
const raw = readFileSync(join(process.cwd(), "supabase/migrations/0023_group_gifts.sql"), "utf8");
const sql = raw
  .replace(/--.*$/gm, "")
  .toLowerCase()
  .replace(/\s+/g, " ");

describe("0023: group cards", () => {
  it("waits at most a few seconds for a lock", () => {
    expect(sql.trim().startsWith("set local lock_timeout = '5s';")).toBe(true);
  });

  it("is safe to run twice: every statement creates only if missing, or replaces", () => {
    expect(sql).toContain("create table if not exists public.gift_groups (");
    expect(sql).toContain("create table if not exists public.gift_contributions (");
    expect(sql.match(/create table (?!if not exists)/g)).toBeNull();
    expect(sql.match(/create (unique )?index (?!if not exists)/g)).toBeNull();
    expect(sql.match(/create function |create trigger /g)).toBeNull();
    expect(sql.match(/create or replace function/g)).toHaveLength(2);
    expect(sql).toContain("create or replace trigger gift_contributions_cap before insert on public.gift_contributions for each row execute function public.gift_contributions_cap();");
    expect(sql).not.toContain("create policy");
  });

  it("only adds: nothing the live site reads is altered, updated, deleted or dropped", () => {
    expect(sql).not.toMatch(/\bdrop\b|rename |alter column|truncate|add column/);
    expect(sql.match(/alter table public\.(\w+)/g)).toEqual(["alter table public.gift_groups", "alter table public.gift_contributions"]);
    expect(sql).not.toMatch(/\bupdate public\.|\bdelete from\b/);
    // The one row it writes is the private bucket, and only if it isn't there.
    expect(sql.match(/\binsert into\b/g)).toHaveLength(1);
    expect(sql).toContain("insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('contributions', 'contributions', false, 2097152, array['image/webp']) on conflict (id) do nothing;");
  });

  it("is the server's alone: row-level security on, no policies, nothing for anon or signed-in users", () => {
    expect(sql).toContain("alter table public.gift_groups enable row level security;");
    expect(sql).toContain("alter table public.gift_contributions enable row level security;");
    expect(sql).toContain("revoke all on public.gift_groups, public.gift_contributions from anon, authenticated;");
    expect(sql).toContain("revoke all on function public.gift_contributions_cap() from public, anon, authenticated;");
    expect(sql).toContain("revoke all on function public.group_photo_orphans(int) from public, anon, authenticated;");
    expect(sql).toContain("grant execute on function public.group_photo_orphans(int) to service_role;");
    expect(sql.match(/grant /g)).toHaveLength(1);
  });

  it("goes with its gift and its account", () => {
    expect(sql).toContain("gift_id uuid not null references public.gifts (id) on delete cascade");
    expect(sql).toContain("user_id uuid not null references public.profiles (id) on delete cascade");
    expect(sql).toContain("group_id uuid not null references public.gift_groups (id) on delete cascade");
    expect(sql).toContain("create unique index if not exists gift_groups_gift_idx on public.gift_groups (gift_id);");
    expect(sql).toContain("create unique index if not exists gift_groups_token_idx on public.gift_groups (token_sha256);");
  });

  it("keeps its checks in step with the limits the routes and the page use", () => {
    expect(CONTRIBUTION_LIMITS).toEqual({ max: 25, name: 24, note: 280 });
    expect(GROUP_LIMITS).toMatchObject({ name: 40, prompt: 140, entryName: 24, entryNote: 280, noteFloor: 20, open: 25, total: 60, days: 30, photoBytes: 2097152, photoEdge: 1600 });
    expect(sql).toContain(`from_name text not null check (char_length(from_name) between 1 and ${GROUP_LIMITS.name})`);
    expect(sql).toContain(`for_name text not null check (char_length(for_name) between 1 and ${GROUP_LIMITS.name})`);
    expect(sql).toContain(`prompt text check (char_length(prompt) <= ${GROUP_LIMITS.prompt})`);
    expect(sql).toContain(`max_entries smallint not null default 25 check (max_entries between 1 and ${GROUP_LIMITS.open})`);
    expect(sql).toContain(`note_max smallint not null default 140 check (note_max between ${GROUP_LIMITS.noteFloor} and ${GROUP_LIMITS.entryNote})`);
    expect(sql).toContain(`name text check (char_length(name) between 1 and ${GROUP_LIMITS.entryName})`);
    expect(sql).toContain(`note text check (char_length(note) between 1 and ${GROUP_LIMITS.entryNote})`);
    expect(sql).toContain(`photo_width smallint check (photo_width between 1 and ${GROUP_LIMITS.photoEdge})`);
    expect(sql).toContain(`photo_height smallint check (photo_height between 1 and ${GROUP_LIMITS.photoEdge})`);
    expect(sql).toContain(`closes_at timestamptz not null default (now() + interval '${GROUP_LIMITS.days} days')`);
    expect(sql).toContain("status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'removed', 'withdrawn'))");
    expect(sql).toContain("item_key text check (item_key ~ '^[a-z0-9]{10}$')");
    expect(sql).toMatch(/photo_path text check \(photo_path ~ '\^\[0-9a-f-\]\{36\}\/\[0-9a-f-\]\{36\}\\\.webp\$'\)/);
  });

  it("holds a group to its limits even when two notes arrive together", () => {
    const start = sql.indexOf("create or replace function public.gift_contributions_cap()");
    const body = sql.slice(start, sql.indexOf("end $$;", start));
    // The group's row is locked first, then both counts are taken.
    expect(body).toContain("select max_entries into v_max from public.gift_groups where id = new.group_id for update;");
    expect(body).toContain("status in ('pending', 'approved')) >= v_max");
    expect(body).toContain(`where group_id = new.group_id) >= ${GROUP_LIMITS.total}`);
    expect(body).toContain("raise exception 'group is full' using errcode = '23514'");
    expect(body).toContain("security definer set search_path = public");
  });

  it("a scrubbed note may lose its words, and only a scrubbed one", () => {
    expect(sql).toContain("constraint gift_contributions_has_words check (scrubbed_at is not null or (name is not null and note is not null))");
  });

  it("finds only files no note points at, and only after a day", () => {
    const start = sql.indexOf("create or replace function public.group_photo_orphans(");
    const body = sql.slice(start, sql.indexOf("$$;", start));
    expect(body).toContain("where o.bucket_id = 'contributions'");
    expect(body).toContain("o.created_at < now() - interval '24 hours'");
    expect(body).toContain("not exists (select 1 from public.gift_contributions c where c.photo_path = o.name)");
    expect(body).toContain("security definer set search_path = public, storage");
  });

  it("says it is safe to run again, and what it is for, in words", () => {
    expect(raw).toContain("-- Safe to run again.");
    expect(raw.startsWith("-- Group cards:")).toBe(true);
  });
});
