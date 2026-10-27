import type { Db } from "@/lib/commerce/db";
import { revokePurchase } from "@/lib/commerce/revoke";
import { receiptOfKey, type EtsyReceipt } from "./receipt";

/** How far back the daily check looks: Etsy cases and refunds come well within this. */
export const ETSY_RECHECK_DAYS = 100;
/** Orders read per run, to stay well inside Etsy's daily request allowance. */
const MAX_ORDERS = 300;

export type RefundCheck = { checked: number; revoked: number; flagged: number; failed: number };

/**
 * The daily look back at Etsy orders already handed over (/api/cron/etsy): a cancelled or fully
 * refunded order takes its templates back, as a Stripe refund does (lib/commerce/revoke.ts). A
 * partial refund is left alone and said loudly: on an order of one it is a goodwill refund, not
 * the item coming back. An order Etsy can't be asked about today is simply asked about tomorrow.
 */
export async function reconcileEtsyRefunds(db: Db, readReceipt: (receiptId: number) => Promise<EtsyReceipt | null>, now: number): Promise<RefundCheck> {
  const since = new Date(now - ETSY_RECHECK_DAYS * 86_400_000).toISOString();
  const { data, error } = await db.from("purchases").select("id, user_id, product, store_transaction_id").eq("store", "etsy").eq("status", "paid").gte("created_at", since);
  if (error) throw new Error(error.message);
  const byReceipt = new Map<number, { id: string; user_id: string | null; product: string }[]>();
  for (const row of data ?? []) {
    const receipt = receiptOfKey(row.store_transaction_id ?? "");
    if (receipt) byReceipt.set(receipt, [...(byReceipt.get(receipt) ?? []), row]);
  }
  const result: RefundCheck = { checked: 0, revoked: 0, flagged: 0, failed: 0 };
  for (const [receiptId, purchases] of [...byReceipt].slice(0, MAX_ORDERS)) {
    let receipt: EtsyReceipt | null;
    try {
      receipt = await readReceipt(receiptId);
    } catch {
      result.failed++;
      continue;
    }
    result.checked++;
    if (!receipt) continue;
    const status = receipt.status.toLowerCase();
    if (status === "canceled" || status === "cancelled" || status === "fully refunded") {
      for (const purchase of purchases) await revokePurchase(db, purchase, now);
      result.revoked += purchases.length;
    } else if (status === "partially refunded" || (receipt.refunds?.length ?? 0) > 0) {
      console.error("[etsy] partly refunded order: check by hand whether to take the template back", receiptId);
      result.flagged++;
    }
  }
  return result;
}
