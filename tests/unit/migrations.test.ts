import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CREATOR_COMMISSION_PCT } from "@/lib/commerce/creators";

/**
 * The database is production and shared with the live site, and the migrations are applied by hand
 * (SQL editor or `supabase db push`), sometimes twice. From 0008 on, every migration must be safe to
 * run again and additive: nothing the live code reads is dropped or renamed, and every new table has
 * row-level security. This reads the SQL itself, since nothing here can run it.
 */
const DIR = join(process.cwd(), "supabase/migrations");
const FROM = 8;

const migrations = readdirSync(DIR)
  .filter((f) => /^\d{4}_.+\.sql$/.test(f) && Number(f.slice(0, 4)) >= FROM)
  .map((file) => ({
    file,
    // Comments out, so a sentence that says "drop" or "rename" is not mistaken for a statement.
    sql: readFileSync(join(DIR, file), "utf8")
      .replace(/--.*$/gm, "")
      .toLowerCase(),
  }));

describe("migrations from 0008 on", () => {
  it("are all found", () => {
    expect(migrations.map((m) => m.file)).toEqual(expect.arrayContaining(["0009_commerce.sql", "0010_reminders.sql", "0011_privacy_fixes.sql", "0012_consent.sql", "0013_app_store.sql"]));
  });

  for (const { file, sql } of migrations) {
    describe(file, () => {
      it("can be run twice", () => {
        expect(sql.match(/create table (?!if not exists)/g)).toBeNull();
        expect(sql.match(/create (unique )?index (?!if not exists)/g)).toBeNull();
        expect(sql.match(/create function /g)).toBeNull();
        expect(sql.match(/create trigger /g)).toBeNull();
        expect(sql.match(/add column (?!if not exists)/g)).toBeNull();
        for (const [, name] of sql.matchAll(/create policy "([^"]+)"/g)) expect(sql).toContain(`drop policy if exists "${name}"`);
      });

      it("only adds: no table or column is dropped or renamed", () => {
        expect(sql).not.toMatch(/drop table|drop column|rename (to|column)|alter column \w+ type/);
      });

      it("turns on row-level security for every table it creates", () => {
        for (const [, table] of sql.matchAll(/create table if not exists public\.(\w+)/g)) expect(sql).toContain(`alter table public.${table} enable row level security`);
      });

      it("keeps its trigger functions off the API", () => {
        for (const [, fn] of sql.matchAll(/create or replace function public\.(\w+)\(\)\s+returns trigger/g)) expect(sql).toContain(`revoke all on function public.${fn}() from public, anon, authenticated`);
      });
    });
  }
});

describe("0009: a pass never outlives itself", () => {
  const sql = migrations.find((m) => m.file === "0009_commerce.sql")!.sql;

  it("takes the partner's lent rows when the pass row goes (the owner deleted their account)", () => {
    expect(sql).toMatch(/create or replace trigger couple_passes_deleted\s+after delete on public\.couple_passes/);
    expect(sql).toMatch(/delete from public\.template_unlocks\s+where purchase_id = old\.purchase_id and template_slug in \('\*', 'pack:\*'\)/);
  });

  it("and when the pass purchase goes, before template_unlocks.purchase_id is set to null", () => {
    expect(sql).toMatch(/create or replace trigger purchases_pass_deleted\s+before delete on public\.purchases\s+for each row when \(old\.product = 'pass'\)/);
  });

  it("defaults a new creator to the deal the /creators page promises", () => {
    expect(sql).toContain(`commission_pct smallint not null default ${CREATOR_COMMISSION_PCT}`);
  });
});

describe("0012: consent, free replies and gift card details", () => {
  const sql = migrations.find((m) => m.file === "0012_consent.sql")!.sql;

  it("adds the consent record as nullable columns, so the live site's inserts still work", () => {
    expect(sql).toContain("alter table public.purchases add column if not exists terms_consent text;");
    expect(sql).toContain("alter table public.purchases add column if not exists terms_consent_at timestamptz;");
  });

  it("allows one free reply per gift answered, and keeps both tables off the API", () => {
    expect(sql).toMatch(/original_gift_id uuid primary key/);
    // Deleting the reply must not make the gift answerable for free again: one token, one free reply.
    expect(sql).toMatch(/reply_gift_id\s+uuid unique references public\.gifts \(id\) on delete set null/);
    expect(sql).not.toMatch(/free_replies[\s\S]*on delete cascade/);
    expect(sql).toContain("revoke all on public.free_replies from anon, authenticated");
    expect(sql).toContain("revoke all on public.gift_card_details from anon, authenticated");
    expect(sql).not.toMatch(/create policy/);
  });
});

describe("0013: App Store purchases", () => {
  const sql = migrations.find((m) => m.file === "0013_app_store.sql")!.sql;

  it("adds the store columns as nullable, so the live site's inserts still work", () => {
    for (const column of ["store", "store_product_id", "store_transaction_id", "store_environment"]) expect(sql).toContain(`alter table public.purchases add column if not exists ${column} text`);
    expect(sql).not.toMatch(/not null/);
    expect(sql).toContain("check (store in ('stripe', 'app_store'))");
    expect(sql).toContain("check (store_environment in ('production', 'sandbox'))");
  });

  it("records an Apple transaction once, with an index ON CONFLICT (store, store_transaction_id) can use", () => {
    expect(sql).toMatch(/create unique index if not exists purchases_store_tx_idx on public\.purchases \(store, store_transaction_id\);/);
    // A partial index can't be the target of PostgREST's on_conflict, which is how the code inserts.
    expect(sql).not.toMatch(/purchases_store_tx_idx[^;]*where/);
  });
});
