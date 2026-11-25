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
    expect(migrations.map((m) => m.file)).toEqual(expect.arrayContaining(["0009_commerce.sql", "0010_reminders.sql", "0011_privacy_fixes.sql", "0012_consent.sql", "0013_app_store.sql", "0022_monthly_ideas.sql", "0027_date_letter.sql"]));
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

describe("0025: three e-mails before each reminded day", () => {
  const sql = migrations.find((m) => m.file === "0025_reminder_stages.sql")!.sql;

  it("adds the stage with a default, so the live site's inserts still work, and the currency as nullable", () => {
    expect(sql).toContain("alter table public.reminders add column if not exists last_stage smallint not null default 0 check (last_stage between 0 and 3);");
    expect(sql).toContain("alter table public.reminders add column if not exists currency text check (currency in ('usd', 'eur', 'gbp'));");
  });

  it("marks every reminder with a year recorded as done for that year, and touches no other", () => {
    expect(sql).toContain("update public.reminders set last_stage = 3 where last_sent_year is not null and last_stage = 0;");
    expect(sql.match(/update /g)).toHaveLength(1);
  });
});

describe("0022: the monthly idea", () => {
  const sql = migrations.find((m) => m.file === "0022_monthly_ideas.sql")!.sql;

  it("is found", () => {
    expect(sql).toContain("create table if not exists public.monthly_ideas");
  });

  it("lets the owner read their own row and nothing else: the server writes", () => {
    expect(sql.match(/create policy/g)).toHaveLength(1);
    expect(sql).toMatch(/create policy "monthly_ideas: owner reads" on public\.monthly_ideas\s+for select to authenticated\s+using \(\(select auth\.uid\(\)\) = user_id\)/);
    expect(sql).toContain("revoke all on public.monthly_ideas from anon, authenticated");
    expect(sql).toContain("grant select on public.monthly_ideas to authenticated");
    expect(sql).not.toMatch(/grant (insert|update|delete|all)/);
  });

  it("keeps one row per account, gone with the account, and knows the three ways in", () => {
    expect(sql).toMatch(/user_id\s+uuid primary key references public\.profiles \(id\) on delete cascade/);
    expect(sql).toContain("check (basis in ('notice', 'box', 'terms'))");
  });
});

describe("0027: the date letter", () => {
  const raw = readFileSync(join(DIR, "0027_date_letter.sql"), "utf8");
  const sql = migrations.find((m) => m.file === "0027_date_letter.sql")!.sql;

  it("is found", () => {
    expect(sql).toContain("create table if not exists public.date_letter");
  });

  it("is the server's alone: no policy, nothing granted, everything revoked", () => {
    expect(sql).not.toContain("create policy");
    expect(sql).not.toMatch(/\bgrant\b/);
    expect(sql).toContain("revoke all on public.date_letter from public, anon, authenticated");
    expect(sql).toContain("alter table public.date_letter enable row level security");
  });

  it("keeps one row per address, in lower case, with only a plain path, and names no account", () => {
    expect(sql).toContain("create unique index if not exists date_letter_email_idx on public.date_letter (email)");
    expect(sql).toContain("email = lower(email)");
    expect(sql).not.toContain("profiles");
    // The path check, read from the SQL itself, and the code's own (lib/lifecycle/date-letter.ts cleanPath).
    const pattern = /source_path ~ '([^']+)'/.exec(raw)?.[1];
    expect(pattern).toBeDefined();
    const check = new RegExp(pattern!);
    for (const [path, ok] of [["/dates", true], ["/es/dates/ideas/cheap", true], ["/Dates", false], ["/a?b", false], ["dates", false]] as const) {
      expect(check.test(path), path).toBe(ok);
    }
  });
});
