import { unique, type Db } from "./db";
import { voidUnredeemedCards } from "./gift-cards";
import { restoreGiftsOf, revokeGiftsOf } from "./gift-credits";
import { endMembershipNow, membershipOfPurchase, paysLatestPeriod } from "./memberships";
import { regrantRunningPasses } from "./passes";
import { foreverRowsOfPurchase, grantForever, regrantFromOtherPurchases, relockGifts, republishGifts, revokeUnlocksOf } from "./unlocks";

type RevokedPurchase = { id: string; user_id: string | null; product: string; membership_id?: string | null };
type RestoredPurchase = { id: string; user_id: string | null; product: string; status: string; template_slugs: string[] | null; kind: string | null };

export type RevokeOptions = {
  /** A chargeback ends a membership whichever of its payments it is about; a refund, only the latest. */
  mode?: "refund" | "dispute";
  /** Cancels a Stripe subscription at once; passed in so lib/commerce stays free of Stripe. */
  cancelSubscription?: ((subscriptionId: string) => Promise<void>) | null;
};

/**
 * A refund or a chargeback takes back everything the purchase granted, to whoever holds it: the
 * buyer's unlocks (the order bump's "*" included), a gift card (unredeemed: it stops working;
 * redeemed: the redeemer's "*" goes), and Ethos for Two for both people. Anyone who still has a
 * membership running gets its rows back straight away, then gifts with nothing left behind them are
 * relocked. Safe to run twice (a refund and a dispute on the same payment).
 *
 * Ethos for Two (a pass year, or any payment of a subscription): a dispute ends the membership now,
 * as does a full refund of the period it is in (the pass's own year, or the subscription's latest
 * payment), and a subscription is cancelled at Stripe so nothing more is charged. Refunding an older
 * period of a subscription changes nothing else: the period it is in is paid for.
 */
export async function revokePurchase(db: Db, purchase: RevokedPurchase, now: number, options: RevokeOptions = {}): Promise<void> {
  // Read before anything is written: without migration 0014 this throws, and a retry once it is
  // applied finds the purchase still paid and does the whole revoke (a caller skips refunded ones).
  const row = purchase.product === "pass" || purchase.product === "membership" ? await membershipOfPurchase(db, purchase) : null;
  await db.from("purchases").update({ status: "refunded" }).eq("id", purchase.id);
  if (purchase.product === "pass" || purchase.product === "membership") {
    if (row) {
      const ends = options.mode === "dispute" || purchase.product === "pass" || (await paysLatestPeriod(db, row, purchase.id));
      if (ends) {
        const ended = await endMembershipNow(db, row, now, { relock: true, cancelSubscription: options.cancelSubscription });
        if (ended.error) throw new Error(ended.error);
      }
      return;
    }
  }
  if (purchase.product === "giftcard") await voidUnredeemedCards(db, purchase.id, now);
  // Two more gifts: none of them counts any more. The unlock rows the used ones wrote point at this
  // purchase, so the generic part below takes those templates back and relocks what went out with them.
  if (purchase.product === "pair") await revokeGiftsOf(db, purchase.id, now);
  // A buyer who deleted their account has no user_id left (0011); whoever held the rows still counts.
  const affected = unique([...(purchase.user_id ? [purchase.user_id] : []), ...(await revokeUnlocksOf(db, purchase.id))]);
  // A second payment for the same template still covers it: only what nothing else paid for goes.
  await regrantFromOtherPurchases(db, affected, purchase.id);
  await regrantRunningPasses(db, affected, now);
  for (const userId of affected) await relockGifts(db, userId);
}

/**
 * A chargeback decided in our favour: the money came back, so what the dispute took returns by
 * itself. The purchase is paid again, its rows are granted to the buyer once more, and gifts the
 * dispute unpublished (drafts that had been published, now covered again) go back to live, or to
 * scheduled when their opening time is still ahead. Ethos for Two and gift cards are left alone: the
 * dispute ended the membership (and may have cancelled the subscription) or voided the cards, and
 * the team restores those by hand. Returns what it did. Safe to run twice.
 */
export async function restorePurchase(db: Db, purchase: RestoredPurchase, now: number): Promise<{ restored: boolean; gifts: number }> {
  if (!purchase.user_id || purchase.status !== "refunded") return { restored: false, gifts: 0 };
  if (purchase.product === "pair") return restorePair(db, { ...purchase, user_id: purchase.user_id }, now);
  const rows = foreverRowsOfPurchase(purchase);
  if (rows.length === 0) return { restored: false, gifts: 0 };
  const { error } = await db.from("purchases").update({ status: "paid" }).eq("id", purchase.id).eq("status", "refunded");
  if (error) throw new Error(`restore failed: ${error.message}`);
  const granted = await grantForever(db, purchase.user_id, rows, purchase.id);
  if (granted.error) throw new Error(`restore failed: ${granted.error}`);
  return { restored: true, gifts: await republishGifts(db, purchase.user_id, now) };
}

/**
 * Two more gifts after a won dispute: the purchase is paid again, its gifts count again, the
 * templates the used ones went on are the buyer's again, and what the dispute unpublished goes back.
 */
async function restorePair(db: Db, purchase: RestoredPurchase & { user_id: string }, now: number): Promise<{ restored: boolean; gifts: number }> {
  const { error } = await db.from("purchases").update({ status: "paid" }).eq("id", purchase.id).eq("status", "refunded");
  if (error) throw new Error(`restore failed: ${error.message}`);
  const used = await restoreGiftsOf(db, purchase.id);
  const granted = await grantForever(db, purchase.user_id, used, purchase.id);
  if (granted.error) throw new Error(`restore failed: ${granted.error}`);
  return { restored: true, gifts: await republishGifts(db, purchase.user_id, now) };
}

/**
 * A withdrawal within the 14 days (a partial refund "requested by customer" of an Ethos for Two
 * payment: what's left after the days used): the membership ends now for both and a subscription is
 * cancelled, but the purchase stays paid and no gift is relocked, since the days used were paid for.
 * Returns false when the purchase isn't Ethos for Two, so any other partial refund changes nothing.
 */
export async function withdrawPurchase(db: Db, purchase: RevokedPurchase, now: number, options: Pick<RevokeOptions, "cancelSubscription"> = {}): Promise<boolean> {
  if (purchase.product !== "pass" && purchase.product !== "membership") return false;
  const row = await membershipOfPurchase(db, purchase);
  if (!row) return false;
  const ended = await endMembershipNow(db, row, now, { relock: false, cancelSubscription: options.cancelSubscription });
  if (ended.error) throw new Error(ended.error);
  return true;
}
