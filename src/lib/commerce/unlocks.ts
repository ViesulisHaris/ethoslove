import { premiumExtras } from "@/lib/gift/publish";
import { noteRules } from "@/lib/gift/free-tier";
import type { GiftData } from "@/lib/gift/schema";
import { EVERY_TEMPLATE, groupRows, hasGroupUnlock, hasPhotosUnlock, hasUnlock, photosUnlock } from "@/lib/pricing/products";
import type { Json } from "@/lib/supabase/types";
import { getManifest } from "@/templates/manifests";
import { unique, type Db } from "./db";

/** Purchase ids of every pass the user owns or joined: the unlock rows those grant end with them. */
export async function passPurchaseIds(db: Db, userId: string): Promise<string[]> {
  const [owned, joined] = await Promise.all([
    db.from("couple_passes").select("purchase_id").eq("owner_user_id", userId),
    db.from("couple_passes").select("purchase_id").eq("partner_user_id", userId),
  ]);
  return unique([...(owned.data ?? []), ...(joined.data ?? [])].map((p) => p.purchase_id));
}

/** Split a user's unlock rows into what they keep for good and what a pass lends them. */
export function splitUnlocks(rows: { template_slug: string; purchase_id: string | null }[], passIds: string[]) {
  const forever: string[] = [];
  const lent: string[] = [];
  for (const row of rows) (row.purchase_id && passIds.includes(row.purchase_id) ? lent : forever).push(row.template_slug);
  return { forever, lent };
}

/** The unlock rows a user keeps whatever happens to a pass. */
export async function foreverUnlocks(db: Db, userId: string): Promise<string[]> {
  const [{ data: rows }, passIds] = await Promise.all([
    db.from("template_unlocks").select("template_slug, purchase_id").eq("user_id", userId),
    passPurchaseIds(db, userId),
  ]);
  return splitUnlocks(rows ?? [], passIds).forever;
}

/**
 * Grants unlock rows for good, pointing at the purchase that paid for them. A row the user already
 * holds only through a pass is taken over: one row per (user, slug) means that otherwise the end of
 * the pass would take away something bought outright. Safe to run twice.
 */
export async function grantForever(db: Db, userId: string, slugs: string[], purchaseId: string | null): Promise<{ error?: string }> {
  if (slugs.length === 0) return {};
  const rows = unique(slugs).map((template_slug) => ({ user_id: userId, template_slug, purchase_id: purchaseId }));
  const { error } = await db.from("template_unlocks").upsert(rows, { onConflict: "user_id,template_slug", ignoreDuplicates: true });
  if (error) return { error: error.message };
  const passIds = (await passPurchaseIds(db, userId)).filter((id) => id !== purchaseId);
  if (passIds.length === 0) return {};
  const { error: takeOver } = await db
    .from("template_unlocks")
    .update({ purchase_id: purchaseId })
    .eq("user_id", userId)
    .in("template_slug", unique(slugs))
    .in("purchase_id", passIds);
  return takeOver ? { error: takeOver.message } : {};
}

/**
 * What a paid purchase covers for good, read back from its row: its templates (and the order bump's
 * "*"), Everything, or a game pack. A pass, a membership or a gift card covers nothing here: passes
 * have their own regrant, and a card's "*" belongs to whoever redeemed it.
 */
export function foreverRowsOfPurchase(purchase: { product: string; template_slugs: string[] | null; kind: string | null }): string[] {
  switch (purchase.product) {
    case "single":
    case "extras":
    case "pick3":
      return [...(purchase.template_slugs ?? []), ...(purchase.kind === "bump" ? [EVERY_TEMPLATE] : [])];
    case "photos":
      return (purchase.template_slugs ?? []).map(photosUnlock);
    // A group card: its group row, and the template only when this purchase paid for it (`kind` is
    // "group"; the step up is "group_addon"). So a refunded single is never handed back by a step up.
    case "group":
      return (purchase.template_slugs ?? []).flatMap((slug) => groupRows(slug, purchase.kind));
    case "everything":
    case "upgrade":
      return [EVERY_TEMPLATE];
    case "pack":
      return purchase.template_slugs ?? [];
    default:
      return [];
  }
}

/**
 * After a refund or a chargeback took a purchase's rows away, whatever the same people's other paid
 * purchases cover is granted again, from those. There is one row per user and template, pointing at
 * the purchase recorded first; without this, refunding that one of two payments for the same
 * template (a buyer charged twice) took the template away and relocked a gift still paid for.
 */
export async function regrantFromOtherPurchases(db: Db, userIds: string[], refundedId: string): Promise<void> {
  for (const userId of unique(userIds)) {
    const { data } = await db.from("purchases").select("id, product, template_slugs, kind").eq("user_id", userId).eq("status", "paid");
    for (const other of (data ?? []).filter((p) => p.id !== refundedId)) {
      const { error } = await grantForever(db, userId, foreverRowsOfPurchase(other), other.id);
      if (error) throw new Error(`regrant failed: ${error}`);
    }
  }
}

/** Deletes every unlock row the purchase(s) granted, to whoever holds them. Returns whose rows went. */
export async function revokeUnlocksOf(db: Db, purchaseIds: string | string[]): Promise<string[]> {
  const ids = Array.isArray(purchaseIds) ? purchaseIds : [purchaseIds];
  if (ids.length === 0) return [];
  const { data } = await db.from("template_unlocks").delete().in("purchase_id", ids).select("user_id");
  return unique((data ?? []).map((row) => row.user_id));
}

/**
 * Live and scheduled gifts with no unlock left behind them: one that uses a paid feature goes back
 * to draft (republishing asks for payment again), one that only paid to drop the footer gets it back.
 * Only for money that went back (a refund, a chargeback). A pass that simply ran its year leaves the
 * gifts sent during it alone: they were paid for.
 */
export async function relockGifts(db: Db, userId: string): Promise<void> {
  const [{ data: unlocks }, { data: gifts }] = await Promise.all([
    db.from("template_unlocks").select("template_slug").eq("user_id", userId),
    db
      .from("gifts")
      .select("id, template_slug, data, watermark, password_hash, unlock_at")
      .eq("user_id", userId)
      .in("status", ["live", "scheduled"]),
  ]);
  const owned = (unlocks ?? []).map((u) => u.template_slug);
  for (const gift of gifts ?? []) {
    if (!lacksUnlock(gift, owned)) {
      if (hasUnlock(owned, gift.template_slug)) continue;
      if (!gift.watermark)
        await db
          .from("gifts")
          .update({ watermark: true, data: { ...(gift.data as unknown as GiftData), watermark: true } as unknown as Json })
          .eq("id", gift.id);
      continue;
    }
    await db.from("gifts").update({ status: "draft" }).eq("id", gift.id);
  }
}

type LockableGift = { template_slug: string; data: unknown; password_hash: string | null; unlock_at: string | null };

/** Whether a gift uses something paid that none of `owned` covers: such a gift can't stay published. */
function lacksUnlock(gift: LockableGift, owned: string[]): boolean {
  const data = gift.data as unknown as GiftData;
  // A group card with nothing paid for its group behind it goes back to draft, whatever else the
  // account holds: its link stops opening until it is paid for again, or sent without its notes.
  if (Array.isArray(data?.contributions) && data.contributions.length > 0 && !hasGroupUnlock(owned, gift.template_slug))
    return true;
  if (hasUnlock(owned, gift.template_slug)) return false;
  const manifest = getManifest(gift.template_slug);
  return (
    manifest?.tier !== "free" ||
    // A note with photos that is still paid for keeps its photos; one whose payment went back doesn't.
    premiumExtras(
      { ...data, photos: Array.isArray(data.photos) ? data.photos : [] },
      { note: manifest ? noteRules(manifest, data) : false, photosOwned: hasPhotosUnlock(owned, gift.template_slug) },
    ).length > 0 ||
    gift.password_hash !== null ||
    gift.unlock_at !== null
  );
}

/**
 * The way back from relockGifts, for a chargeback decided in our favour: drafts that had been
 * published (a relock keeps published_at) and that the user's unlocks cover again go back to live,
 * or to scheduled while their opening time is still ahead. Returns how many.
 */
export async function republishGifts(db: Db, userId: string, now: number): Promise<number> {
  const [{ data: unlocks }, { data: gifts }] = await Promise.all([
    db.from("template_unlocks").select("template_slug").eq("user_id", userId),
    db
      .from("gifts")
      .select("id, template_slug, data, password_hash, unlock_at")
      .eq("user_id", userId)
      .eq("status", "draft")
      .not("published_at", "is", null),
  ]);
  const owned = (unlocks ?? []).map((u) => u.template_slug);
  let count = 0;
  for (const gift of gifts ?? []) {
    // Only a gift something paid for now covers: a draft for any other reason stays a draft.
    const covered = hasUnlock(owned, gift.template_slug) || hasPhotosUnlock(owned, gift.template_slug);
    if (!covered || lacksUnlock(gift, owned)) continue;
    const status = gift.unlock_at && Date.parse(gift.unlock_at) > now ? "scheduled" : "live";
    await db.from("gifts").update({ status }).eq("id", gift.id);
    count += 1;
  }
  return count;
}
