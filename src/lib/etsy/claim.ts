import type { Db } from "@/lib/commerce/db";
import { grantForever } from "@/lib/commerce/unlocks";
import { etsyProduct, type ClaimableUnit } from "./receipt";

export type EtsyClaim = { ok: true; purchaseId: string; again: boolean } | { ok: false; error: "used" | "failed" };

/**
 * Hands one item of a paid Etsy order to `userId`: a purchase row like any other (store 'etsy'),
 * then the template's unlock. The row is keyed by the item (lib/etsy/receipt.ts claimKey) and the
 * key is unique (0013's index), so an item is handed over once, to one account, however many
 * browsers try at once. The same account asking again is let through (a double tap, a retry after
 * a failed unlock) without using a second item.
 */
export async function claimEtsyItem(db: Db, args: { userId: string; slug: string; units: ClaimableUnit[] }): Promise<EtsyClaim> {
  const keys = args.units.map((u) => u.key);
  if (keys.length === 0) return { ok: false, error: "used" };
  const { data: taken, error: readError } = await db
    .from("purchases")
    .select("id, user_id, status, store_transaction_id")
    .eq("store", "etsy")
    .in("store_transaction_id", keys);
  if (readError) return { ok: false, error: "failed" };
  const mine = (taken ?? []).find((row) => row.user_id === args.userId && row.status === "paid");
  if (mine) return grant(db, args.userId, args.slug, mine.id, true);

  const used = new Set((taken ?? []).map((row) => row.store_transaction_id));
  const product = etsyProduct(args.slug);
  for (const unit of args.units) {
    if (used.has(unit.key)) continue;
    const { data, error } = await db
      .from("purchases")
      .upsert(
        {
          user_id: args.userId,
          product,
          template_slugs: [args.slug],
          amount: unit.amount,
          currency: unit.currency,
          status: "paid",
          kind: product,
          ref: "etsy",
          store: "etsy",
          store_product_id: String(unit.listingId),
          store_transaction_id: unit.key,
          store_environment: "production",
        },
        { onConflict: "store,store_transaction_id", ignoreDuplicates: true },
      )
      .select("id");
    if (error) return { ok: false, error: "failed" };
    // Empty: another browser took this item a moment ago. Try the next one, if the order has one.
    const id = data?.[0]?.id;
    if (id) return grant(db, args.userId, args.slug, id, false);
  }
  return { ok: false, error: "used" };
}

async function grant(db: Db, userId: string, slug: string, purchaseId: string, again: boolean): Promise<EtsyClaim> {
  const granted = await grantForever(db, userId, [slug], purchaseId);
  return granted.error ? { ok: false, error: "failed" } : { ok: true, purchaseId, again };
}
