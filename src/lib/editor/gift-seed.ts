import type { z } from "zod";

/**
 * A gift that starts half made: a page elsewhere on the site (a preset trip, say) hands the editor
 * the template fields it already knows, so "Make it a surprise" opens the ticket with the
 * destination, the stops and the nights filled in. It can also hand over "a surprise inside" (a
 * planned date or a trip, GiftData.unwrap), which any template carries. Kept in sessionStorage
 * rather than the URL, read once, and only by the template it was meant for; the editor still
 * validates every field. No zod here: /plan saves seeds, and keeps the schema library out of its page.
 */
const KEY = "ethos:gift-seed";
const MAX_AGE_MS = 60 * 60 * 1000;
const FIELDS_MAX_CHARS = 20_000;

export type GiftSeed = { slug: string; fields: Record<string, unknown>; unwrap?: Record<string, unknown> };

const isRecord = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);

export function saveGiftSeed(seed: GiftSeed): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ ...seed, savedAt: Date.now() }));
  } catch {}
}

/** The seed for this template when there is a fresh one. It is removed either way. */
export function takeGiftSeed(slug: string): GiftSeed | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(KEY);
    if (raw.length > FIELDS_MAX_CHARS) return null;
    const seed = JSON.parse(raw) as Partial<GiftSeed & { savedAt: number }>;
    if (seed.slug !== slug || typeof seed.savedAt !== "number" || Date.now() - seed.savedAt > MAX_AGE_MS) return null;
    if (!isRecord(seed.fields)) return null;
    return { slug, fields: seed.fields, ...(isRecord(seed.unwrap) ? { unwrap: seed.unwrap } : {}) };
  } catch {
    return null;
  }
}

/**
 * `base` with the seed's fields on top, as the template's schema parses them. A field that does not
 * validate is left out and the rest are kept, so one bad value never costs the whole trip; null
 * when nothing from the seed survives.
 */
export function mergeSeedFields(schema: z.ZodType, base: Record<string, unknown>, fields: Record<string, unknown>): Record<string, unknown> | null {
  const all = schema.safeParse({ ...base, ...fields });
  if (all.success) return all.data as Record<string, unknown>;
  // A base that no longer validates (a draft saved by an older version of the template) would fail
  // every field below and lose the whole seed: build on the template's defaults instead.
  const defaults = schema.safeParse({});
  const start = schema.safeParse(base).success || !defaults.success ? base : (defaults.data as Record<string, unknown>);
  let merged: Record<string, unknown> | null = null;
  for (const [key, value] of Object.entries(fields)) {
    const next = schema.safeParse({ ...(merged ?? start), [key]: value });
    if (next.success) merged = next.data as Record<string, unknown>;
  }
  return merged;
}

/**
 * The seed's surprise, as the gift schema reads it (`schema` is giftUnwrapSchema, passed in for the
 * reason above), or null. All or nothing: half a plan, or a picture from a host the allow-list
 * doesn't name, is not something to wrap. It replaces whatever surprise a draft already had.
 */
export function seedUnwrap<T>(schema: z.ZodType<T>, unwrap: unknown): T | null {
  if (!isRecord(unwrap)) return null;
  const parsed = schema.safeParse(unwrap);
  return parsed.success ? parsed.data : null;
}
