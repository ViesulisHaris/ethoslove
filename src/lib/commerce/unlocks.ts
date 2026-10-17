import { premiumExtras } from "@/lib/gift/publish";
import type { GiftData } from "@/lib/gift/schema";
import { hasUnlock } from "@/lib/pricing/products";
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
    if (hasUnlock(owned, gift.template_slug)) continue;
    const data = gift.data as unknown as GiftData;
    const paidFeature =
      getManifest(gift.template_slug)?.tier !== "free" ||
      premiumExtras({ ...data, photos: Array.isArray(data.photos) ? data.photos : [] }).length > 0 ||
      gift.password_hash !== null ||
      gift.unlock_at !== null;
    if (paidFeature) await db.from("gifts").update({ status: "draft" }).eq("id", gift.id);
    else if (!gift.watermark)
      await db
        .from("gifts")
        .update({ watermark: true, data: { ...data, watermark: true } as unknown as Json })
        .eq("id", gift.id);
  }
}
