import type { SupabaseClient } from "@supabase/supabase-js";
import { SITE } from "@/config/site";
import type { Database } from "@/lib/supabase/types";

/**
 * The service-role client every commerce write goes through. Passed in rather than imported, so
 * the money logic runs the same against a fake in the unit tests.
 */
export type Db = SupabaseClient<Database>;

export type Locale = "en" | "es";

export const DAY_MS = 86_400_000;

export const iso = (ms: number) => new Date(ms).toISOString();

export const unique = <T>(values: T[]): T[] => Array.from(new Set(values));

export function chunks<T>(values: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
  return out;
}

/**
 * Migration 0014 (supabase/migrations/0014_membership.sql) adds the membership columns to
 * couple_passes and purchases, and must be applied before this code is deployed (docs/STRIPE.md,
 * docs/MEMBERSHIP.md 7). Deployed without it, PostgREST answers 42703 (a column in a select list, a
 * filter or an order doesn't exist) or PGRST204 (a column in a write isn't in its schema cache), and
 * `select("*")` comes back without the new columns. Where the live site's own paths meet them (a pass
 * sold or renewed, a refund or a dispute, the account page, the 14-day pass email) the code fails
 * loudly with this error, naming the migration, instead of reading a missing column as "nothing
 * there": a refund taken for another business's, a renewal refused as a second membership, no email.
 */
export const MEMBERSHIP_MIGRATION = "0014_membership.sql";

export class MissingMigrationError extends Error {
  constructor(what: string, migration = MEMBERSHIP_MIGRATION) {
    super(`migration ${migration} is not applied (${what}): apply it before deploying this code`);
    this.name = "MissingMigrationError";
  }
}

type DbError = { code?: string | null; message?: string | null } | null | undefined;

/** Postgres's undefined_column (42703), or PostgREST's "column not in the schema cache" (PGRST204). */
export const isMissingColumn = (error: DbError): boolean => error?.code === "42703" || error?.code === "PGRST204";

/** A MissingMigrationError, logged, when `error` is a missing 0014 column; null for anything else. */
export function missingMembershipColumns(error: DbError, what: string): MissingMigrationError | null {
  if (!isMissingColumn(error)) return null;
  const failure = new MissingMigrationError(`${what}: ${error?.message ?? "a column is missing"}`);
  console.error(`[db] ${failure.message}`);
  return failure;
}

/**
 * couple_passes rows as `select("*")` returns them. Before 0014 they have no `provider`, which every
 * membership decision reads: that throws (logged), rather than deciding anything on undefined.
 */
export function membershipRows<T extends object>(rows: T[] | null | undefined, what: string): T[] {
  const list = rows ?? [];
  if (list.some((row) => (row as { provider?: unknown }).provider === undefined)) {
    const failure = new MissingMigrationError(`${what}: couple_passes has no provider column`);
    console.error(`[db] ${failure.message}`);
    throw failure;
  }
  return list;
}

export const siteOrigin = () => process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || SITE.url;

/** English lives at the root, Spanish under /es (i18n/routing.ts). */
export const localePath = (locale: Locale, path: string) => (locale === "es" ? `/es${path}` : path);

export const inviteUrl = (code: string, locale: Locale) => `${siteOrigin()}${localePath(locale, "/for-two/join")}?code=${encodeURIComponent(code)}`;

export const redeemUrl = (code: string, locale: Locale) => `${siteOrigin()}${localePath(locale, "/redeem")}?code=${encodeURIComponent(code)}`;

export const renewUrl = (locale: Locale) => `${siteOrigin()}${localePath(locale, "/pricing")}?renew=pass`;

/** Ethos for Two on the pricing page, where a membership is bought (again). */
export const pricingUrl = (locale: Locale) => `${siteOrigin()}${localePath(locale, "/pricing")}#for-two`;

/** The account page's Ethos for Two section, where a membership is managed. */
export const accountUrl = (locale: Locale) => `${siteOrigin()}${localePath(locale, "/account")}#for-two`;
