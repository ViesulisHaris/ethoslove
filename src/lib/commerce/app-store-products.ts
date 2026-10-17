import { PRODUCTS, membershipAmount, type MembershipPlan, type ProductId } from "@/lib/pricing/products";
import type { PackId } from "@/lib/games/packs";
import type { TemplateTier } from "@/templates/types";

/**
 * What the iPhone app sells through In-App Purchase, and what each one is on the website. Apple
 * sells, RevenueCat validates and tells us (lib/commerce/app-store.ts); the purchase then lands as
 * the same `purchases` row and the same unlock rows a Stripe checkout of the web product writes, so
 * everything downstream (entitlements, refunds, the pass cron) treats both stores alike.
 *
 * Two are consumable CREDITS: the App Store can't ask which template while it takes the money, so
 * the app buys a credit and spends it on one template straight after (applyCredit). `tier` says
 * which templates a credit can be spent on: "One template" on a premium one, "Make it special"
 * on a free one (its paid extras and no footer).
 *
 * Ethos for Two is sold as two auto-renewable subscriptions in one subscription group, monthly and
 * yearly, which land as the same membership a Stripe subscription does (lib/commerce/app-store.ts
 * handleAppStoreSubscriptionEvent). The older non-renewing year stays on sale as a pass.
 */
export type AppStoreProductType = "consumable" | "nonConsumable" | "nonRenewing" | "autoRenewable";

export type AppStoreProduct = {
  /** The App Store product id. */
  id: string;
  type: AppStoreProductType;
  /** The website product it stands for (lib/pricing/products.ts). */
  product: ProductId;
  /** A credit, spent on one template of `tier` with applyCredit. */
  credit?: true;
  tier?: TemplateTier;
  packId?: PackId;
  /** An auto-renewable Ethos for Two: which plan. */
  plan?: MembershipPlan;
};

export const APP_STORE_PRODUCTS: readonly AppStoreProduct[] = [
  { id: "xyz.secuora.ethos.template", type: "consumable", product: "single", credit: true, tier: "premium" },
  { id: "xyz.secuora.ethos.special", type: "consumable", product: "extras", credit: true, tier: "free" },
  { id: "xyz.secuora.ethos.everything", type: "nonConsumable", product: "everything" },
  { id: "xyz.secuora.ethos.fortwo", type: "nonRenewing", product: "pass" },
  { id: "xyz.secuora.ethos.fortwo.monthly", type: "autoRenewable", product: "membership", plan: "monthly" },
  { id: "xyz.secuora.ethos.fortwo.yearly", type: "autoRenewable", product: "membership", plan: "yearly" },
  { id: "xyz.secuora.ethos.pack.deep", type: "nonConsumable", product: "pack", packId: "deep" },
  { id: "xyz.secuora.ethos.pack.distance", type: "nonConsumable", product: "pack", packId: "distance" },
  { id: "xyz.secuora.ethos.pack.spicy", type: "nonConsumable", product: "pack", packId: "spicy" },
];

export function appStoreProduct(id: string | null | undefined): AppStoreProduct | null {
  return APP_STORE_PRODUCTS.find((p) => p.id === id) ?? null;
}

/** The web's euro price for an App Store product: a subscription's is its plan's. */
export const appStoreEurCents = (p: AppStoreProduct) => (p.plan ? membershipAmount(p.plan, "eur") : PRODUCTS[p.product].amounts.eur);

/** The catalogue's list for the app (GET /api/app/catalog `products`): the euro price is the web's, for reference only. */
export function catalogProducts(): { id: string; type: AppStoreProductType; webProduct: ProductId; packId?: PackId; tier?: TemplateTier; plan?: MembershipPlan; eurCents: number }[] {
  return APP_STORE_PRODUCTS.map((p) => ({
    id: p.id,
    type: p.type,
    webProduct: p.product,
    ...(p.packId ? { packId: p.packId } : {}),
    ...(p.tier ? { tier: p.tier } : {}),
    ...(p.plan ? { plan: p.plan } : {}),
    eurCents: appStoreEurCents(p),
  }));
}
