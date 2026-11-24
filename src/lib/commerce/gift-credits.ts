import type Stripe from "stripe";
import { EVERY_TEMPLATE, PAIR_GIFTS, photosUnlock, type Currency } from "@/lib/pricing/products";
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
 * A refund or a dispute of the whole purchase: every gift of it, used or not, stops counting, marked
 * with why (`reason`), so a won dispute gives back only its own. The unlock rows the used ones wrote
 * point at the same purchase, so revokeUnlocksOf takes those.
 */
export async function revokeGiftsOf(db: Db, purchaseId: string, now: number, reason: "refund" | "dispute" = "refund"): Promise<void> {
  const { error } = await db.from("gift_credits").update({ revoked_at: iso(now), revoked_for: reason }).eq("purchase_id", purchaseId).is("revoked_at", null);
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
  const { data: taken, error: failed } = await db.from("gift_credits").update({ revoked_at: iso(now), revoked_for: "refund" }).eq("id", unused.id).is("revoked_at", null).select("id");
  if (failed) throw new Error(`gift credit not revoked: ${failed.message}`);
  return (taken ?? []).length > 0;
}

/**
 * A dispute decided in our favour: the gifts the dispute took count again; one a half refund had
 * already given back stays gone, since that money stays refunded. Returns the templates the restored
 * used ones were spent on, so their unlock rows can be granted again (lib/commerce/revoke.ts).
 */
export async function restoreGiftsOf(db: Db, purchaseId: string): Promise<string[]> {
  const { data, error } = await db.from("gift_credits").update({ revoked_at: null, revoked_for: null }).eq("purchase_id", purchaseId).eq("revoked_for", "dispute").select("spent_slug");
  if (error) {
    if (isMissingTable(error)) return [];
    throw new Error(`gift credits not restored: ${error.message}`);
  }
  return (data ?? []).map((row) => row.spent_slug).filter((slug): slug is string => typeof slug === "string" && slug.length > 0);
}

/** How long an open checkout for two more gifts is gone back to rather than replaced. */
export const PAIR_REUSE_MS = 12 * 60 * 60 * 1000;
/** Stripe closes a Checkout Session after a day: pending rows older than that hold nothing open. */
const PAIR_OPEN_MS = 24 * 60 * 60 * 1000;

/**
 * Keeps at most one checkout for two more gifts open on an account, so two can never both be paid
 * (two charges, four gifts): the wallet session the card makes when it is seen, the Stripe page of
 * "Pay by card instead", one in another currency. With `want`, the newest still-open session of that
 * kind (a wallet's, or Stripe's page) at that price, made in the last 12 hours, is kept and returned;
 * every other open one is closed. Without it (fulfilment of a paid one), all of them are closed.
 * Null: nothing to go back to, and nothing open is left. As openUpgradeCheckout does for the upgrade
 * (lib/commerce/after-checkout.ts).
 */
export async function settlePairSessions(
  stripe: Stripe,
  db: Db,
  userId: string,
  now: number,
  want?: { amount: number; currency: Currency; oneTap: boolean },
): Promise<Stripe.Checkout.Session | null> {
  const { data } = await db
    .from("purchases")
    .select("stripe_session_id, amount, currency, created_at")
    .eq("user_id", userId)
    .eq("product", "pair")
    .eq("status", "pending")
    .gte("created_at", iso(now - PAIR_OPEN_MS))
    .order("created_at", { ascending: false })
    .limit(10);
  let kept: Stripe.Checkout.Session | null = null;
  for (const row of data ?? []) {
    if (!row.stripe_session_id) continue;
    const session = await stripe.checkout.sessions.retrieve(row.stripe_session_id).catch(() => null);
    if (session?.status !== "open") continue;
    const madeAt = row.created_at ? Date.parse(row.created_at) : Number.NaN;
    const fits =
      want &&
      !kept &&
      row.amount === want.amount &&
      row.currency === want.currency &&
      now - madeAt <= PAIR_REUSE_MS &&
      (String(session.ui_mode) === "elements") === want.oneTap &&
      Boolean(want.oneTap ? session.client_secret : session.url);
    if (fits) kept = session;
    else await stripe.checkout.sessions.expire(session.id).catch(() => null);
  }
  return kept;
}

/** The products whose buyers may be offered two more gifts: someone who has just paid for one. */
export const PAIR_AFTER = ["single", "extras", "photos", "pick3"] as const;

/** How long after paying for a gift its share screen may still offer two more gifts. */
export const PAIR_OFFER_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Whether this template's gift was paid for just now: one of the account's unlock rows for it (the
 * template's own, or its note with photos) points at a paid purchase of PAIR_AFTER made within
 * PAIR_OFFER_WINDOW_MS. The offer card is for "someone who has just paid for this gift"
 * (DESIGN-after-payment.md 2): never after a free note, a free reply, a gift on a template bought
 * weeks ago, or one sent on a gift ready (its row points at the pair, which isn't in PAIR_AFTER).
 * Pure: getEntitlement (app/actions/gift.ts) reads the rows.
 */
export function paidForGiftRecently(
  unlocks: { template_slug: string; purchase_id: string | null }[],
  purchases: { id: string; product: string; status: string; created_at: string | null }[],
  slug: string,
  now: number,
): boolean {
  const ids = new Set(unlocks.filter((u) => u.purchase_id && (u.template_slug === slug || u.template_slug === photosUnlock(slug))).map((u) => u.purchase_id));
  return purchases.some((p) => {
    if (!ids.has(p.id) || p.status !== "paid" || !(PAIR_AFTER as readonly string[]).includes(p.product)) return false;
    const at = p.created_at ? Date.parse(p.created_at) : Number.NaN;
    return Number.isFinite(at) && now - at >= 0 && now - at <= PAIR_OFFER_WINDOW_MS;
  });
}

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
