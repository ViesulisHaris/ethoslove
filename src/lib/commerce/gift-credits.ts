import { EVERY_TEMPLATE, PAIR_GIFTS } from "@/lib/pricing/products";
import { iso, type Db } from "./db";

/**
 * Gifts ready: what "two more gifts" (the product "pair") puts on an account, one row each in
 * public.gift_credits (migration 0024_gift_credits.sql). A gift ready is used when the buyer
 * publishes a gift on a template they do not hold (app/actions/gift.ts, `useGift`): the row is marked
 * used and the ordinary unlock row is written, pointing at the purchase, by one database function.
 *
 * The site runs without the table (the live site between a deploy and the owner applying 0024):
 * every read here answers "nothing to know" rather than throwing, nothing is offered, and checkout
 * refuses the product.
 */

type DbError = { code?: string | null; message?: string | null } | null | undefined;

/** Postgres's undefined_table (42P01), or PostgREST's "table not in the schema cache" (PGRST205). */
export const isMissingTable = (error: DbError): boolean =>
  error?.code === "42P01" || error?.code === "PGRST205" || /relation .*gift_credits.* does not exist/i.test(error?.message ?? "");

/** How many gifts the account has ready; null when the table isn't there (0024 not applied) or the read failed. */
export async function readyGifts(db: Db, userId: string): Promise<number | null> {
  const { count, error } = await db.from("gift_credits").select("id", { count: "exact", head: true }).eq("user_id", userId).is("spent_slug", null).is("revoked_at", null);
  if (error) {
    if (!isMissingTable(error)) console.error("[gift-credits] ready count failed", error.message);
    return null;
  }
  return count ?? 0;
}

/**
 * Puts `count` gifts ready on the account for a paid purchase. Keyed by (purchase, n), so the webhook
 * and the success page can both run it: the second changes nothing.
 */
export async function grantGifts(db: Db, userId: string, purchaseId: string, count: number = PAIR_GIFTS): Promise<{ error?: string }> {
  const rows = Array.from({ length: count }, (_, i) => ({ user_id: userId, purchase_id: purchaseId, n: i + 1 }));
  const { error } = await db.from("gift_credits").upsert(rows, { onConflict: "purchase_id,n", ignoreDuplicates: true });
  return error ? { error: error.message } : {};
}

/**
 * Uses one gift ready on `slug` (migration 0024's spend_gift_credit, with the service role): "spent"
 * when one was used and the template is now the account's for good; "none" when nothing was used
 * (the template is already held, no gift is ready, or the table isn't there).
 */
export async function spendGift(admin: Db, userId: string, slug: string): Promise<"spent" | "none"> {
  const { data, error } = await admin.rpc("spend_gift_credit", { p_user: userId, p_slug: slug });
  if (error) {
    console.error("[gift-credits] spend failed", error.code ?? "", error.message);
    return "none";
  }
  return data ? "spent" : "none";
}

/**
 * A refund or a dispute of the whole purchase: every gift of it, used or not, stops counting. The
 * unlock rows the used ones wrote point at the same purchase, so revokeUnlocksOf takes those.
 */
export async function revokeGiftsOf(db: Db, purchaseId: string, now: number): Promise<void> {
  const { error } = await db.from("gift_credits").update({ revoked_at: iso(now) }).eq("purchase_id", purchaseId).is("revoked_at", null);
  if (error && !isMissingTable(error)) throw new Error(`gift credits not revoked: ${error.message}`);
}

/**
 * Half the money back: one unused gift of the purchase goes. Only once per purchase: a second event
 * for the same refund (Stripe sends charge.refunded again for each refund on a charge) finds one
 * already gone and changes nothing. False when nothing was taken (none unused, or one already went).
 */
export async function revokeOneUnusedOf(db: Db, purchaseId: string, now: number): Promise<boolean> {
  const { data, error } = await db.from("gift_credits").select("id, spent_slug, revoked_at, n").eq("purchase_id", purchaseId).order("n");
  if (error) {
    if (isMissingTable(error)) return false;
    throw new Error(`gift credits not read: ${error.message}`);
  }
  const rows = data ?? [];
  if (rows.some((row) => row.revoked_at !== null)) return false;
  const unused = [...rows].reverse().find((row) => row.spent_slug === null);
  if (!unused) return false;
  const { data: taken, error: failed } = await db.from("gift_credits").update({ revoked_at: iso(now) }).eq("id", unused.id).is("revoked_at", null).select("id");
  if (failed) throw new Error(`gift credit not revoked: ${failed.message}`);
  return (taken ?? []).length > 0;
}

/**
 * A dispute decided in our favour: the purchase's gifts count again. Returns the templates the used
 * ones were spent on, so their unlock rows can be granted again (lib/commerce/revoke.ts).
 */
export async function restoreGiftsOf(db: Db, purchaseId: string): Promise<string[]> {
  const { data, error } = await db.from("gift_credits").update({ revoked_at: null }).eq("purchase_id", purchaseId).select("spent_slug");
  if (error) {
    if (isMissingTable(error)) return [];
    throw new Error(`gift credits not restored: ${error.message}`);
  }
  return (data ?? []).map((row) => row.spent_slug).filter((slug): slug is string => typeof slug === "string" && slug.length > 0);
}

/** The products whose buyers may be offered two more gifts: someone who has just paid for one. */
export const PAIR_AFTER = ["single", "extras", "photos", "pick3"] as const;

export type PairRefusal = "not_on_sale" | "sign_in_required" | "pair_ready" | "already_owned" | "pair_needs_purchase";

/**
 * Who may buy two more gifts, the one place the rule lives (PLAN-pair.md 2): it is on sale and the
 * table is there; signed in; no gifts ready already; every template isn't theirs for good; no Ethos
 * for Two running; and at least one paid gift of their own, so the lower price is only ever a
 * buyer's. Pure: the checkout route and /api/entitlements look things up and ask this.
 */
export function pairAllowed(input: {
  onSale: boolean;
  signedIn: boolean;
  /** readyGifts: null when the table isn't there. */
  ready: number | null;
  ownedForever: string[];
  memberRunning: boolean;
  /** The `product` of each of their paid purchases. */
  paidProducts: string[];
}): { ok: true } | { ok: false; error: PairRefusal } {
  if (!input.onSale || (input.signedIn && input.ready === null)) return { ok: false, error: "not_on_sale" };
  if (!input.signedIn) return { ok: false, error: "sign_in_required" };
  if ((input.ready ?? 0) > 0) return { ok: false, error: "pair_ready" };
  if (input.ownedForever.includes(EVERY_TEMPLATE) || input.memberRunning) return { ok: false, error: "already_owned" };
  if (!input.paidProducts.some((product) => (PAIR_AFTER as readonly string[]).includes(product))) return { ok: false, error: "pair_needs_purchase" };
  return { ok: true };
}
