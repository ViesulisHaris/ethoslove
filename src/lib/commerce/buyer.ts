import type { Db } from "./db";
import { PURCHASE_CREDIT_COLUMNS, type PaidPurchase } from "./pricing";
import { passPurchaseIds, splitUnlocks } from "./unlocks";

/** What the buyer keeps for good and has paid: all checkout needs to know about them. */
export type BuyerContext = {
  /** Unlock rows kept for good (a pass's rows end with it, so they don't count). */
  ownedForever: string[];
  /** Their paid purchases, for the upgrade price. */
  purchases: PaidPurchase[];
};

/**
 * Read with the service role, by checkout and by every upgrade quote made outside the buyer's own
 * session (the success page, the receipt), so the price a page quotes is the price checkout charges.
 * A guest has nothing yet.
 */
export async function readBuyer(admin: Db, userId: string | null): Promise<BuyerContext> {
  if (!userId) return { ownedForever: [], purchases: [] };
  const [{ data: rows }, passIds, { data: purchases }] = await Promise.all([
    admin.from("template_unlocks").select("template_slug, purchase_id").eq("user_id", userId),
    passPurchaseIds(admin, userId),
    admin.from("purchases").select(PURCHASE_CREDIT_COLUMNS).eq("user_id", userId).eq("status", "paid"),
  ]);
  return { ownedForever: splitUnlocks(rows ?? [], passIds).forever, purchases: purchases ?? [] };
}
