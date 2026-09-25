import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 0014 turns couple_passes into the membership table (docs/MEMBERSHIP.md 1.6). The shared checks in
 * migrations.test.ts (run twice, additive, RLS, trigger functions off the API) cover it too; these are
 * what this file must do for the code, and for the live site that shares the database.
 */
const sql = readFileSync(join(process.cwd(), "supabase/migrations/0014_membership.sql"), "utf8")
  .replace(/--.*$/gm, "")
  .toLowerCase()
  .replace(/\s+/g, " ");

describe("0014: the membership table", () => {
  it("adds every membership column to couple_passes, with the defaults an existing pass reads as", () => {
    for (const [column, type] of [
      ["provider", "text not null default 'stripe_pass'"],
      ["plan", "text not null default 'yearly'"],
      ["status", "text not null default 'active'"],
      ["stripe_customer_id", "text"],
      ["stripe_subscription_id", "text"],
      ["store_original_transaction_id", "text"],
      ["current_period_end", "timestamptz"],
      ["cancel_at_period_end", "boolean not null default false"],
      ["pending_plan", "text"],
      ["provider_event_at", "timestamptz"],
      ["renewal_reminded_for", "timestamptz"],
      ["payment_failed_invoice", "text"],
      ["ended_notified_at", "timestamptz"],
    ])
      expect(sql).toContain(`alter table public.couple_passes add column if not exists ${column} ${type}`);
    expect(sql).toContain("check (provider in ('stripe_pass', 'stripe_subscription', 'app_store', 'app_store_pass'))");
    expect(sql).toContain("check (plan in ('monthly', 'yearly'))");
    expect(sql).toContain("check (status in ('incomplete', 'active', 'past_due', 'ended'))");
    expect(sql).toContain("check (pending_plan in ('monthly', 'yearly'))");
  });

  it("keeps one row per subscription with indexes PostgREST's on_conflict can use (never partial)", () => {
    expect(sql).toContain("create unique index if not exists couple_passes_subscription_idx on public.couple_passes (stripe_subscription_id);");
    expect(sql).toContain("create unique index if not exists couple_passes_store_original_idx on public.couple_passes (store_original_transaction_id);");
    expect(sql).toContain("create unique index if not exists purchases_invoice_idx on public.purchases (stripe_invoice_id);");
    expect(sql).not.toMatch(/(couple_passes_subscription_idx|couple_passes_store_original_idx|purchases_invoice_idx)[^;]*where/);
  });

  it("marks the App Store's one-time years by their purchase, touching nothing else", () => {
    expect(sql).toContain("update public.couple_passes cp set provider = 'app_store_pass' from public.purchases p where p.id = cp.purchase_id and p.store = 'app_store' and cp.provider = 'stripe_pass';");
    expect(sql.match(/\bupdate public\./g)).toHaveLength(1);
    expect(sql).not.toMatch(/\bdelete from\b/);
  });

  it("adds nullable purchase columns, so the live site's inserts keep working", () => {
    expect(sql).toContain("alter table public.purchases add column if not exists stripe_invoice_id text;");
    expect(sql).toContain("alter table public.purchases add column if not exists membership_id uuid references public.couple_passes (id) on delete set null;");
    expect(sql).not.toMatch(/alter table public\.purchases add column if not exists \w+ [^;]*not null/);
  });

  it("takes a membership's lent rows with its purchase, as 0009 does for a pass", () => {
    expect(sql).toContain("create or replace trigger purchases_membership_deleted before delete on public.purchases for each row when (old.product = 'membership') execute function public.pass_purchase_deleted();");
  });

  it("changes no policy and grants nothing new", () => {
    expect(sql).not.toMatch(/create policy|drop policy|grant |revoke /);
  });

  it("waits at most a few seconds for a lock on the live tables", () => {
    expect(sql.trim().startsWith("set local lock_timeout = '5s';")).toBe(true);
  });
});

/** The body of the first `name: { … }` block after `from` in a TypeScript source, braces matched. */
function block(source: string, name: string, from = 0): { body: string; end: number } {
  const start = source.indexOf(`${name}: {`, from);
  if (start < 0) throw new Error(`no ${name} block`);
  let depth = 0;
  for (let i = source.indexOf("{", start); i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) return { body: source.slice(start, i + 1), end: i + 1 };
  }
  throw new Error(`unclosed ${name} block`);
}

describe("0014 in src/lib/supabase/types.ts", () => {
  const types = readFileSync(join(process.cwd(), "src/lib/supabase/types.ts"), "utf8");
  const added = (table: string) => [...sql.matchAll(new RegExp(`alter table public\\.${table} add column if not exists (\\w+)`, "g"))].map((m) => m[1]);

  it("every column 0014 adds can be read, inserted and updated through the typed client", () => {
    for (const table of ["couple_passes", "purchases"]) {
      const columns = added(table);
      expect(columns.length, table).toBeGreaterThan(1);
      const tableBlock = block(types, `      ${table}`).body;
      for (const part of ["Row", "Insert", "Update"]) {
        const body = block(tableBlock, part).body;
        const missing = columns.filter((column) => !new RegExp(`\\b${column}\\??:`).test(body));
        expect(missing, `${table}.${part}`).toEqual([]);
      }
    }
  });
});
