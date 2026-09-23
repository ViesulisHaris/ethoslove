"use client";

import { useTranslations } from "next-intl";
import type { Currency } from "@/lib/pricing/products";
import type { TemplateManifest } from "@/templates/types";
import { cn } from "@/lib/utils";
import { PassCard } from "./for-two";
import { GiftCardOffer } from "./gift-card-offer";
import { PricingCards } from "./pricing-cards";

/**
 * Everything the pricing page sells: the template plans, the pass and, while it is on sale, the gift
 * card. A signed-in buyer who already owns templates sees Everything at the difference, as they
 * would in the editor. There is no code field: the prices here are the prices for everyone.
 */
export function PricingOffers({
  currency,
  manifests,
  paymentsEnabled,
  giftCards,
  preselect,
  openPick3,
  renewPass,
  returnTo,
}: {
  currency: Currency;
  manifests: TemplateManifest[];
  paymentsEnabled: boolean;
  /** Gift cards on sale (GIFT_CARDS_ENABLED, read on the server). */
  giftCards: boolean;
  preselect?: string;
  openPick3: boolean;
  renewPass: boolean;
  returnTo?: string;
}) {
  const tForTwo = useTranslations("forTwo");

  return (
    <>
      <p className="mb-6 text-eyebrow text-ink-soft">{tForTwo("giftsEyebrow")}</p>
      <PricingCards
        currency={currency}
        manifests={manifests}
        authed={false}
        paymentsEnabled={paymentsEnabled}
        preselect={preselect}
        openPick3={openPick3}
        returnTo={returnTo}
      />

      <div className="mt-16 grid gap-5 lg:grid-cols-5 lg:items-stretch">
        <PassCard currency={currency} paymentsEnabled={paymentsEnabled} renewing={renewPass} className={cn(giftCards ? "lg:col-span-3" : "lg:col-span-5")} />
        {giftCards ? <GiftCardOffer currency={currency} paymentsEnabled={paymentsEnabled} className="lg:col-span-2" /> : null}
      </div>
    </>
  );
}
