import "server-only";

import { env, isConfigured } from "@/lib/env";
import { linkSecret, signToken, verifyToken } from "@/lib/lifecycle/links";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PersonalPriceKind } from "@/lib/pricing/products";

/**
 * A personal price: the link in an offer email opens it (GET /api/offer/open), a cookie keeps it
 * while the buyer looks around, the pay sheet shows it (GET /api/offer), and checkout charges it only
 * when the pay sheet asked for it and the cookie still holds (lib/commerce/plan.ts). One purchase per
 * link: the account it was sent to is the key, so a forwarded link is still one purchase.
 *
 * The cookie holds the signed link itself, nothing else: the account id it names is a random id, and
 * the signature means nobody can make one for an account or a time that isn't theirs.
 *
 * Two kinds, told apart by what the link is signed for: an offer email's ("personal-price", one price
 * for any gift) and the first monthly idea email's ("monthly-price", its own price per product,
 * MONTHLY_PRICE). The monthly one is also once per account ever: monthly_ideas.price_used_at.
 */
export const PERSONAL_PRICE_COOKIE = "ethos_offer";

export type PersonalPrice = { id: string; endsAt: number; kind: PersonalPriceKind };

/**
 * What the links are signed with: PERSONAL_PRICE_SECRET, else the other email links' secret
 * (lib/lifecycle/links.ts). Its own setting, readable where the list is made, so the links for an
 * email can be signed there; changing it ends every personal price at once, and nothing else.
 */
export function personalPriceSecret(): string | null {
  return process.env.PERSONAL_PRICE_SECRET || linkSecret();
}

/** The price a link offers, if it is ours and hasn't ended. `endsAt` is in milliseconds. */
export async function readPersonalPrice(token: string | null | undefined, now: number = Date.now()): Promise<PersonalPrice | null> {
  const secret = personalPriceSecret();
  if (!secret || !token) return null;
  const offer = await verifyToken("personal-price", token, secret);
  const value = offer ?? (await verifyToken("monthly-price", token, secret));
  if (!value) return null;
  const [id, seconds] = value.split(":");
  const endsAt = Number(seconds) * 1000;
  if (!Number.isFinite(endsAt) || endsAt <= now) return null;
  return { id, endsAt, kind: offer ? "offer" : "monthly" };
}

/** A link for `accountId` that ends at `endsAt` (milliseconds): what an offer email's button carries. */
export async function personalPriceToken(accountId: string, endsAt: number, secret: string): Promise<string> {
  return signToken("personal-price", `${accountId.toLowerCase()}:${Math.floor(endsAt / 1000)}`, secret);
}

/** The first monthly idea email's link: the same shape, signed for its own purpose. */
export async function monthlyPriceToken(accountId: string, endsAt: number, secret: string): Promise<string> {
  return signToken("monthly-price", `${accountId.toLowerCase()}:${Math.floor(endsAt / 1000)}`, secret);
}

// Without Redis (development, tests), a per-process set: good enough for one server.
const usedHere = new Set<string>();
const usedKey = (id: string) => `personal-price-used:${id}`;
// Kept well past any link's end, so a link reopened later is still spent.
const USED_SECONDS = 60 * 86_400;

async function redis(command: (string | number)[]): Promise<unknown> {
  const res = await fetch(`${env.upstashRedisUrl}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.upstashRedisToken}`, "content-type": "application/json" },
    body: JSON.stringify([command]),
    cache: "no-store",
  });
  const json = (await res.json()) as { result?: unknown }[];
  return json[0]?.result ?? null;
}

/** Whether a purchase has already been made at this personal price. Unknown counts as not used. */
export async function personalPriceUsed(id: string): Promise<boolean> {
  if (!isConfigured.upstash) return usedHere.has(id);
  try {
    return (await redis(["GET", usedKey(id)])) !== null;
  } catch {
    // Redis down: the price still works; one link can't buy more than its holder would anyway.
    return false;
  }
}

/**
 * Spends the personal price, once its purchase is paid (lib/stripe/fulfil.ts). One used key for both
 * kinds, so buying with either ends the other; a monthly one is also marked on the account's row, for
 * good (the key lasts 60 days, the row as long as the account).
 */
export async function spendPersonalPrice(id: string, kind: PersonalPriceKind = "offer"): Promise<void> {
  if (kind === "monthly") {
    try {
      const admin = getSupabaseAdminClient();
      const result = admin ? await admin.from("monthly_ideas").update({ price_used_at: new Date().toISOString() }).eq("user_id", id).is("price_used_at", null) : null;
      if (result?.error) console.error("[offer] couldn't mark the monthly price as used", id, result.error.message);
    } catch (e) {
      console.error("[offer] couldn't mark the monthly price as used", id, (e as Error).message);
    }
  }
  if (!isConfigured.upstash) {
    usedHere.add(id);
    return;
  }
  try {
    await redis(["SET", usedKey(id), "1", "EX", USED_SECONDS]);
  } catch (e) {
    console.error("[offer] couldn't mark a personal price as used", id, (e as Error).message);
  }
}

/**
 * Whether the account's monthly price is still there to use: its row says it was sent and not used.
 * No database, no row, or a failed read: no price.
 */
async function monthlyPriceOpen(id: string): Promise<boolean> {
  const admin = getSupabaseAdminClient();
  if (!admin) return false;
  try {
    const { data, error } = await admin.from("monthly_ideas").select("price_sent_at, price_used_at").eq("user_id", id).maybeSingle();
    return !error && Boolean(data?.price_sent_at) && !data?.price_used_at;
  } catch {
    return false;
  }
}

/** The personal price the request's cookie holds, if it is valid and not spent yet. */
export async function activePersonalPrice(token: string | null | undefined, now: number = Date.now()): Promise<PersonalPrice | null> {
  const price = await readPersonalPrice(token, now);
  if (!price) return null;
  if (await personalPriceUsed(price.id)) return null;
  if (price.kind === "monthly" && !(await monthlyPriceOpen(price.id))) return null;
  return price;
}
