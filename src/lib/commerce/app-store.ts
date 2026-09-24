import { EVERY_TEMPLATE, PRODUCTS, hasUnlock, packUnlock } from "@/lib/pricing/products";
import type { Tables } from "@/lib/supabase/types";
import { getManifest } from "@/templates/manifests";
import { appStoreProduct, type AppStoreProduct } from "./app-store-products";
import { iso, type Db } from "./db";
import { startPass } from "./passes";
import { revokePurchase } from "./revoke";
import { foreverUnlocks, grantForever } from "./unlocks";

export { APP_STORE_PRODUCTS, appStoreProduct } from "./app-store-products";

/**
 * The iPhone app's In-App Purchases, turned into what a Stripe checkout of the same product gives:
 * a `purchases` row (marked store = 'app_store', keyed by Apple's transaction id so it is recorded
 * once however many times we hear of it) and the same unlock rows, pass year or credit.
 *
 * Apple sells; RevenueCat validates the receipt and is how we hear: its webhook as each purchase
 * happens (app/api/revenuecat/webhook), and its REST API when the app asks to sync (a restore, a
 * new phone, a webhook that hasn't arrived). Our database stays the truth for what someone owns;
 * RevenueCat's own entitlements are never read. Contract: Ethos app docs/ARCHITECTURE.md §3.4.
 *
 * Like the rest of lib/commerce, every write goes through the `Db` passed in, so the tests run it
 * against the in-memory fake.
 */

/** One App Store purchase as RevenueCat reports it. */
export type StoreTransaction = {
  productId: string;
  /** Apple's transaction id. */
  transactionId: string;
  /** ISO time of purchase. */
  purchasedAt: string;
  sandbox: boolean;
  /** What the buyer paid, when a webhook said (minor units, lower-case currency). */
  price?: { amount: number; currency: string };
};

/** A credit bought in the app and not spent yet (POST /api/app/purchases/sync `credits`). */
export type StoreCredit = { purchaseId: string; product: "single" | "extras"; storeProductId: string; transactionId: string; purchasedAt: string };

type PurchaseRow = Pick<Tables<"purchases">, "id" | "user_id" | "product" | "status" | "template_slugs" | "amount" | "currency" | "store_product_id" | "store_transaction_id" | "created_at">;
const ROW = "id, user_id, product, status, template_slugs, amount, currency, store_product_id, store_transaction_id, created_at";

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Apple's transaction ids are digits; anything that could be a filter or a path is refused. */
const TRANSACTION_ID = /^[A-Za-z0-9._:-]{1,128}$/;
export const isTransactionId = (v: unknown): v is string => typeof v === "string" && TRANSACTION_ID.test(v);

/** The catalogue's currencies: a price in one of these is kept as paid, anything else as the euro list price. */
const PRICED_IN = new Set(["eur", "usd", "gbp"]);

/** What a webhook says the buyer paid, when it says it in a currency the site prices in. */
export function eventPrice(price: unknown, currency: unknown): StoreTransaction["price"] | undefined {
  const code = typeof currency === "string" ? currency.toLowerCase() : "";
  if (typeof price !== "number" || !Number.isFinite(price) || price < 0 || !PRICED_IN.has(code)) return undefined;
  return { amount: Math.round(price * 100), currency: code };
}

/**
 * GET https://api.revenuecat.com/v1/subscribers/{id} → the App Store purchases of products we sell.
 * `non_subscriptions` holds every one-time purchase, the non-renewing year included.
 */
export function parseSubscriber(json: unknown): StoreTransaction[] {
  const subscriber = isRecord(json) && isRecord(json.subscriber) ? json.subscriber : null;
  const bought = subscriber && isRecord(subscriber.non_subscriptions) ? subscriber.non_subscriptions : {};
  const out: StoreTransaction[] = [];
  for (const [productId, purchases] of Object.entries(bought)) {
    if (!appStoreProduct(productId) || !Array.isArray(purchases)) continue;
    for (const p of purchases) {
      if (!isRecord(p) || (p.store !== undefined && p.store !== "app_store")) continue;
      const transactionId = p.store_transaction_id;
      const at = Date.parse(String(p.purchase_date ?? ""));
      if (!isTransactionId(transactionId) || !Number.isFinite(at)) continue;
      out.push({ productId, transactionId, purchasedAt: iso(at), sandbox: p.is_sandbox === true });
    }
  }
  return out;
}

export async function fetchSubscriber(userId: string, secretKey: string, doFetch: typeof fetch = fetch): Promise<StoreTransaction[] | null> {
  try {
    const res = await doFetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${secretKey}`, accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return parseSubscriber(await res.json());
  } catch {
    return null;
  }
}

async function findByTransaction(db: Db, transactionId: string): Promise<PurchaseRow | null> {
  const { data } = await db.from("purchases").select(ROW).eq("store", "app_store").eq("store_transaction_id", transactionId).maybeSingle();
  return (data as PurchaseRow | null) ?? null;
}

/** What a product's row starts with, as the same Stripe purchase would: a pack names its pack; a credit is spent later. */
const startingSlugs = (product: AppStoreProduct): string[] => (product.packId ? [packUnlock(product.packId)] : []);

/**
 * Records one purchase, once: the row is inserted unless Apple's transaction id is already there.
 * Returns the row as it stands (which may be refunded, or somebody else's). A price from a webhook
 * replaces the list price the row may have been recorded with first.
 */
async function record(db: Db, userId: string, tx: StoreTransaction, product: AppStoreProduct, status: "paid" | "refunded" = "paid"): Promise<PurchaseRow | { error: string }> {
  const { error } = await db.from("purchases").upsert(
    {
      user_id: userId,
      product: product.product,
      template_slugs: startingSlugs(product),
      amount: tx.price?.amount ?? PRODUCTS[product.product].amounts.eur,
      currency: tx.price?.currency ?? "eur",
      status,
      kind: product.product,
      store: "app_store",
      store_product_id: product.id,
      store_transaction_id: tx.transactionId,
      store_environment: tx.sandbox ? "sandbox" : "production",
      created_at: tx.purchasedAt,
    },
    { onConflict: "store,store_transaction_id", ignoreDuplicates: true },
  );
  if (error) return { error: error.message };
  const row = await findByTransaction(db, tx.transactionId);
  if (!row) return { error: "purchase_missing" };
  if (tx.price && row.user_id === userId && (row.amount !== tx.price.amount || row.currency !== tx.price.currency)) {
    const { error: priced } = await db.from("purchases").update({ amount: tx.price.amount, currency: tx.price.currency }).eq("id", row.id);
    if (priced) return { error: priced.message };
  }
  return row;
}

/** Hands over what a paid purchase bought. Every grant is keyed by the purchase, so it is safe to repeat. */
async function grant(db: Db, userId: string, row: PurchaseRow, product: AppStoreProduct, purchasedAt: number, now: number): Promise<{ error?: string }> {
  switch (product.product) {
    case "everything":
      return grantForever(db, userId, [EVERY_TEMPLATE], row.id);
    case "pack":
      return grantForever(db, userId, startingSlugs(product), row.id);
    case "pass": {
      // The year runs from the purchase (or from the end of the year it renews), however late we hear of it.
      const started = await startPass(db, { purchaseId: row.id, ownerId: userId, now: Math.min(purchasedAt, now), grantAt: now });
      return "error" in started ? { error: started.error } : {};
    }
    default:
      // A credit: nothing until it is spent on a template, then that template, for good.
      return row.template_slugs.length > 0 ? grantForever(db, userId, row.template_slugs, row.id) : {};
  }
}

/**
 * Records every App Store purchase of `userId` and grants what each bought. Idempotent: twice is
 * one row and one grant. A refunded purchase is left refunded and grants nothing. A transaction
 * already recorded for another account is never moved (RevenueCat's "keep with original App User
 * ID" should make that impossible; it is said loudly if it happens).
 */
export async function ingestAppStore(db: Db, userId: string, transactions: readonly StoreTransaction[], now: number): Promise<{ errors: string[] }> {
  const errors: string[] = [];
  for (const tx of transactions) {
    const product = appStoreProduct(tx.productId);
    if (!product) continue;
    const row = await record(db, userId, tx, product);
    if ("error" in row) {
      errors.push(row.error);
      continue;
    }
    if (row.user_id !== userId) {
      console.error("[app-store] a transaction recorded for another account: not moved", tx.transactionId);
      continue;
    }
    if (row.status !== "paid") continue;
    const at = Date.parse(tx.purchasedAt);
    const granted = await grant(db, userId, row, product, Number.isFinite(at) ? at : now, now);
    if (granted.error) errors.push(granted.error);
  }
  return { errors };
}

/**
 * A refund (Apple's, reported by RevenueCat as a CANCELLATION): everything the purchase granted goes,
 * as a Stripe refund does (lib/commerce/revoke.ts). A refund for a purchase never recorded is recorded
 * as refunded, so hearing of the purchase afterwards can't grant it. Safe to run twice.
 */
export async function revokeAppStoreTransaction(db: Db, userId: string | null, tx: StoreTransaction, now: number): Promise<{ error?: string }> {
  const found = await findByTransaction(db, tx.transactionId);
  if (found) {
    if (found.status === "refunded") return {};
    await revokePurchase(db, found, now);
    return {};
  }
  const product = appStoreProduct(tx.productId);
  if (!product || !userId) return {};
  const tombstone = await record(db, userId, tx, product, "refunded");
  return "error" in tombstone ? { error: tombstone.error } : {};
}

/** The credits bought in the app and not spent yet, oldest first. */
export async function unusedCredits(db: Db, userId: string): Promise<StoreCredit[]> {
  const { data } = await db.from("purchases").select(ROW).eq("user_id", userId).eq("store", "app_store").eq("status", "paid").order("created_at", { ascending: true });
  return ((data ?? []) as PurchaseRow[])
    .filter((row) => (row.product === "single" || row.product === "extras") && row.template_slugs.length === 0 && row.store_product_id && row.store_transaction_id)
    .map((row) => ({ purchaseId: row.id, product: row.product as StoreCredit["product"], storeProductId: row.store_product_id!, transactionId: row.store_transaction_id!, purchasedAt: row.created_at }));
}

export type ApplyCreditResult =
  | { ok: true }
  | { ok: false; error: "invalid_input" | "wrong_tier" | "not_found" | "already_owned" | "failed" }
  | { ok: false; error: "already_applied"; appliedTo: string };

async function findCredit(db: Db, userId: string, ref: { transactionId?: string; purchaseId?: string }): Promise<PurchaseRow | null> {
  const query = db.from("purchases").select(ROW).eq("user_id", userId).eq("store", "app_store");
  const { data } = await (ref.transactionId ? query.eq("store_transaction_id", ref.transactionId) : query.eq("id", ref.purchaseId ?? "")).maybeSingle();
  const row = (data as PurchaseRow | null) ?? null;
  return row && (row.product === "single" || row.product === "extras") ? row : null;
}

/**
 * Spends a template credit on one template, for good: "One template" on a premium one, "Make it
 * special" on a free one. The credit is found by Apple's transaction id (or our purchase id); a
 * credit the webhook hasn't delivered yet is looked for once more after `pull` (asking RevenueCat).
 * The write only fills a credit that is still empty, so two taps (or two templates at once) spend
 * it once. Spending it again on the same template is not an error: it answers as the first did.
 * A template the user already owns for good is refused, and the credit kept for another one.
 */
export async function applyCredit(
  db: Db,
  userId: string,
  input: { templateSlug: string; transactionId?: string; purchaseId?: string },
  options: { pull?: (() => Promise<void>) | null } = {},
): Promise<ApplyCreditResult> {
  const manifest = getManifest(input.templateSlug);
  if (!manifest || (!input.transactionId && !input.purchaseId)) return { ok: false, error: "invalid_input" };

  let row = await findCredit(db, userId, input);
  if (!row && options.pull) {
    await options.pull();
    row = await findCredit(db, userId, input);
  }
  if (!row || row.status !== "paid") return { ok: false, error: "not_found" };
  const tier = row.product === "single" ? "premium" : "free";
  if (manifest.tier !== tier) return { ok: false, error: "wrong_tier" };

  const regrant = async (): Promise<ApplyCreditResult> => ((await grantForever(db, userId, [input.templateSlug], row!.id)).error ? { ok: false, error: "failed" } : { ok: true });
  const applied = row.template_slugs[0];
  if (applied) return applied === input.templateSlug ? regrant() : { ok: false, error: "already_applied", appliedTo: applied };
  if (hasUnlock(await foreverUnlocks(db, userId), input.templateSlug)) return { ok: false, error: "already_owned" };

  const { data: claimed, error } = await db.from("purchases").update({ template_slugs: [input.templateSlug] }).eq("id", row.id).filter("template_slugs", "eq", "{}").select("id");
  if (error) return { ok: false, error: "failed" };
  if ((claimed ?? []).length === 0) {
    // Spent a moment ago by another request: on this template, the same answer; on another, taken.
    const now = await findCredit(db, userId, { purchaseId: row.id });
    const spent = now?.template_slugs[0];
    return spent === input.templateSlug ? regrant() : spent ? { ok: false, error: "already_applied", appliedTo: spent } : { ok: false, error: "failed" };
  }
  return regrant();
}

/**
 * Asks RevenueCat what the user bought and records it all (the sync route, and a credit the webhook
 * hasn't delivered yet). `upstream` when RevenueCat couldn't be asked; `failed` when writing failed.
 */
export async function pullAppStore(db: Db, userId: string, secretKey: string, now: number, doFetch: typeof fetch = fetch): Promise<{ ok: true } | { ok: false; error: "upstream" | "failed" }> {
  const transactions = await fetchSubscriber(userId, secretKey, doFetch);
  if (!transactions) return { ok: false, error: "upstream" };
  const { errors } = await ingestAppStore(db, userId, transactions, now);
  if (errors.length > 0) {
    console.error("[app-store] purchases not recorded", userId, errors);
    return { ok: false, error: "failed" };
  }
  return { ok: true };
}

/** RevenueCat's user ids are ours (the Supabase user id) once the app has logged in; anonymous ones are not. */
const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUserId = (v: unknown): v is string => typeof v === "string" && USER_ID.test(v);

/** The purchase a webhook event is about, when it is an App Store purchase of something we sell. */
export function eventTransaction(event: Record<string, unknown>, now: number): StoreTransaction | null {
  if (!appStoreProduct(event.product_id as string | undefined)) return null;
  if (event.store !== undefined && event.store !== null && event.store !== "APP_STORE") return null;
  const transactionId = isTransactionId(event.transaction_id) ? event.transaction_id : isTransactionId(event.original_transaction_id) ? event.original_transaction_id : null;
  if (!transactionId) return null;
  const at = typeof event.purchased_at_ms === "number" && Number.isFinite(event.purchased_at_ms) ? event.purchased_at_ms : now;
  const price = eventPrice(event.price_in_purchased_currency, event.currency);
  return { productId: event.product_id as string, transactionId, purchasedAt: iso(at), sandbox: event.environment === "SANDBOX", ...(price ? { price } : {}) };
}

export type WebhookOutcome = { status: "ignored" | "recorded" | "revoked" } | { status: "failed"; error: string };

/**
 * One RevenueCat webhook event (https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields):
 * a TEST does nothing; an event for an anonymous user or an account that no longer exists is ignored;
 * a CANCELLATION of a one-time purchase is Apple's refund and takes back what it granted; anything
 * else about a purchase records it and grants it (the event carries the purchase, so no secret key
 * is needed). An event with no purchase of ours in it (a TRANSFER, say) asks RevenueCat for the
 * user's purchases when `pull` can. A failure comes back as `failed`, so the route answers 500 and
 * RevenueCat tries again.
 */
export async function handleRevenueCatEvent(db: Db, event: Record<string, unknown>, now: number, options: { pull?: ((userId: string) => Promise<{ ok: boolean }>) | null } = {}): Promise<WebhookOutcome> {
  const type = typeof event.type === "string" ? event.type : "";
  if (type === "TEST") return { status: "ignored" };
  const userIds = [event.app_user_id, ...(type === "TRANSFER" && Array.isArray(event.transferred_to) ? event.transferred_to : [])].filter(isUserId);
  const userId = isUserId(event.app_user_id) ? event.app_user_id : null;
  const tx = eventTransaction(event, now);

  if (type === "CANCELLATION") {
    if (!tx) return { status: "ignored" };
    const revoked = await revokeAppStoreTransaction(db, userId && (await accountExists(db, userId)) ? userId : null, tx, now);
    return revoked.error ? { status: "failed", error: revoked.error } : { status: "revoked" };
  }
  if (tx && userId) {
    if (!(await accountExists(db, userId))) return { status: "ignored" };
    const { errors } = await ingestAppStore(db, userId, [tx], now);
    return errors.length > 0 ? { status: "failed", error: errors.join("; ") } : { status: "recorded" };
  }
  if (!options.pull || userIds.length === 0) return { status: "ignored" };
  for (const id of new Set(userIds)) {
    if (!(await accountExists(db, id))) continue;
    const pulled = await options.pull(id);
    if (!pulled.ok) return { status: "failed", error: "upstream" };
  }
  return { status: "recorded" };
}

/** A deleted account's purchases stay (0011) but nothing more is granted to nobody. */
async function accountExists(db: Db, userId: string): Promise<boolean> {
  const { data } = await db.from("profiles").select("id").eq("id", userId).maybeSingle();
  return Boolean(data);
}
