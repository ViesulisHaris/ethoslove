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

export const siteOrigin = () => process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || SITE.url;

/** English lives at the root, Spanish under /es (i18n/routing.ts). */
export const localePath = (locale: Locale, path: string) => (locale === "es" ? `/es${path}` : path);

export const inviteUrl = (code: string, locale: Locale) => `${siteOrigin()}${localePath(locale, "/for-two/join")}?code=${encodeURIComponent(code)}`;

export const redeemUrl = (code: string, locale: Locale) => `${siteOrigin()}${localePath(locale, "/redeem")}?code=${encodeURIComponent(code)}`;

export const renewUrl = (locale: Locale) => `${siteOrigin()}${localePath(locale, "/pricing")}?renew=pass`;
