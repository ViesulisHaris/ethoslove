import { unique, type Db } from "./db";
import { voidUnredeemedCards } from "./gift-cards";
import { regrantRunningPasses, shortenRefundedPass } from "./passes";
import { relockGifts, revokeUnlocksOf } from "./unlocks";

/**
 * A refund or a chargeback takes back everything the purchase granted, to whoever holds it: the
 * buyer's unlocks (the order bump's "*" included), a pass's year and its rows for both people, a gift
 * card (unredeemed: it stops working; redeemed: the redeemer's "*" goes). Anyone who still has a pass
 * running gets its rows back straight away, then gifts with nothing left behind them are relocked.
 * Safe to run twice (a refund and a dispute on the same payment).
 */
export async function revokePurchase(db: Db, purchase: { id: string; user_id: string | null; product: string }, now: number): Promise<void> {
  await db.from("purchases").update({ status: "refunded" }).eq("id", purchase.id);
  if (purchase.product === "pass") await shortenRefundedPass(db, purchase.id, now);
  if (purchase.product === "giftcard") await voidUnredeemedCards(db, purchase.id, now);
  // A buyer who deleted their account has no user_id left (0011); whoever held the rows still counts.
  const affected = unique([...(purchase.user_id ? [purchase.user_id] : []), ...(await revokeUnlocksOf(db, purchase.id))]);
  await regrantRunningPasses(db, affected, now);
  for (const userId of affected) await relockGifts(db, userId);
}
