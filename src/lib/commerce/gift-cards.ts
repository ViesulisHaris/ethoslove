import { EVERY_TEMPLATE, GIFT_CARD_MONTHS } from "@/lib/pricing/products";
import type { Tables } from "@/lib/supabase/types";
import { generateGiftCardCode } from "./codes";
import { DAY_MS, iso, type Db } from "./db";
import { foreverUnlocks, grantForever } from "./unlocks";

/**
 * "Give Everything" gift cards: bought like any product, redeemed by someone else for Everything,
 * forever. The redeemer's "*" row points at the card's purchase, so refunding the card takes it back.
 */
export type GiftCard = Tables<"gift_cards">;

/** Calendar months, in UTC: a card bought on 31 Jan lasts until 31 Jan two years on, not a day short. */
export function addMonths(now: number, months: number): number {
  const d = new Date(now);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.getTime();
}

/** A card's optional personal touch, as the buyer typed it at checkout. */
export type GiftCardTouch = { recipientName?: string | null; note?: string | null };

/**
 * Stripe's recovery link (30 days) can still bring an abandoned gift card checkout back to be paid,
 * so its name and note are kept a day longer than that before the daily job deletes them.
 */
export const GIFT_CARD_DETAILS_DAYS = 31;

const touchRow = (touch: GiftCardTouch) => ({
  recipient_name: touch.recipientName?.trim().slice(0, 60) || null,
  note: touch.note?.trim().slice(0, 300) || null,
});

/**
 * Keeps a gift card's name and note until fulfilment, in our database: Stripe metadata never carries
 * a person's name or a note (the account is shared). False when it couldn't be saved.
 */
export async function saveGiftCardDetails(db: Db, purchaseId: string, touch: GiftCardTouch): Promise<boolean> {
  const row = touchRow(touch);
  if (!row.recipient_name && !row.note) return true;
  const { error } = await db.from("gift_card_details").upsert({ purchase_id: purchaseId, ...row }, { onConflict: "purchase_id" });
  if (error) console.error("[gift cards] details not saved", error.message);
  return !error;
}

/** The name and note checkout kept for a purchase, if any. */
export async function giftCardDetails(db: Db, purchaseId: string): Promise<GiftCardTouch> {
  const { data } = await db.from("gift_card_details").select("recipient_name, note").eq("purchase_id", purchaseId).maybeSingle();
  return { recipientName: data?.recipient_name ?? null, note: data?.note ?? null };
}

/** Once the card carries them, and for checkouts nobody came back to: nothing is kept twice or for long. */
export async function deleteGiftCardDetails(db: Db, target: { purchaseId: string } | { olderThan: number }): Promise<void> {
  const query = db.from("gift_card_details").delete();
  const { error } = "purchaseId" in target ? await query.eq("purchase_id", target.purchaseId) : await query.lt("created_at", iso(target.olderThan));
  if (error) console.error("[gift cards] details not deleted", error.message);
}

export const staleGiftCardDetailsBefore = (now: number) => now - GIFT_CARD_DETAILS_DAYS * DAY_MS;

/** Mints the card a paid purchase bought. One per purchase, so running fulfilment twice is safe. */
export async function issueGiftCard(
  db: Db,
  args: { purchaseId: string; buyerId: string; recipientName?: string | null; note?: string | null; now: number },
): Promise<{ card: GiftCard; created: boolean } | { error: string }> {
  const { purchaseId, buyerId, now } = args;
  const existing = await db.from("gift_cards").select("*").eq("purchase_id", purchaseId).maybeSingle();
  if (existing.data) return { card: existing.data, created: false };
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await db
      .from("gift_cards")
      .upsert(
        {
          code: generateGiftCardCode(),
          purchase_id: purchaseId,
          buyer_user_id: buyerId,
          recipient_name: args.recipientName?.trim().slice(0, 60) || null,
          note: args.note?.trim().slice(0, 300) || null,
          expires_at: iso(addMonths(now, GIFT_CARD_MONTHS)),
        },
        { onConflict: "purchase_id", ignoreDuplicates: true },
      )
      .select("*");
    // 23505 here can only be the code (the purchase is the conflict target): draw another.
    if (error?.code === "23505") continue;
    if (error) return { error: error.message };
    if (data?.[0]) return { card: data[0], created: true };
    const again = await db.from("gift_cards").select("*").eq("purchase_id", purchaseId).maybeSingle();
    return again.data ? { card: again.data, created: false } : { error: "gift_card_missing" };
  }
  return { error: "gift_card_code_collision" };
}

export type RedeemError = "not_found" | "voided" | "expired" | "already_redeemed" | "already_owned" | "failed";
export type RedeemResult = { ok: true; alreadyYours: boolean } | { ok: false; error: RedeemError };

/**
 * Single use. The card is claimed by filling its empty redeemed_by, so of two people redeeming the
 * same code at once exactly one gets it; if the unlock can't be written the claim is released again.
 * Somebody who already owns Everything is told so before the card is spent, so they can pass it on.
 */
export async function redeemGiftCard(db: Db, args: { code: string; userId: string; now: number }): Promise<RedeemResult> {
  const { code, userId, now } = args;
  const { data: card } = await db.from("gift_cards").select("*").eq("code", code).maybeSingle();
  if (!card) return { ok: false, error: "not_found" };
  if (card.redeemed_by === userId) {
    const regrant = await grantForever(db, userId, [EVERY_TEMPLATE], card.purchase_id);
    return regrant.error ? { ok: false, error: "failed" } : { ok: true, alreadyYours: true };
  }
  // redeemed_at stays when the redeemer deletes their account (redeemed_by goes null with it): the
  // card was still used once, and must not come back to life for somebody else.
  if (card.redeemed_by || card.redeemed_at) return { ok: false, error: "already_redeemed" };
  if (card.purchase_id) {
    const { data: purchase } = await db.from("purchases").select("status").eq("id", card.purchase_id).maybeSingle();
    if (purchase?.status === "refunded") return { ok: false, error: "voided" };
  }
  if (card.expires_at && Date.parse(card.expires_at) <= now) return { ok: false, error: "expired" };
  if ((await foreverUnlocks(db, userId)).includes(EVERY_TEMPLATE)) return { ok: false, error: "already_owned" };

  const { data: claimed } = await db
    .from("gift_cards")
    .update({ redeemed_by: userId, redeemed_at: iso(now) })
    .eq("id", card.id)
    .is("redeemed_by", null)
    .is("redeemed_at", null)
    .select("id");
  if ((claimed ?? []).length === 0) return { ok: false, error: "already_redeemed" };

  const granted = await grantForever(db, userId, [EVERY_TEMPLATE], card.purchase_id);
  if (granted.error) {
    await db.from("gift_cards").update({ redeemed_by: null, redeemed_at: null }).eq("id", card.id).eq("redeemed_by", userId);
    return { ok: false, error: "failed" };
  }
  return { ok: true, alreadyYours: false };
}

/**
 * A refunded or disputed card purchase: a card nobody redeemed yet stops working (it expires now).
 * One already redeemed loses its unlock with the rest of the purchase's rows.
 */
export async function voidUnredeemedCards(db: Db, purchaseId: string, now: number): Promise<void> {
  await db.from("gift_cards").update({ expires_at: iso(now) }).eq("purchase_id", purchaseId).is("redeemed_by", null);
}
