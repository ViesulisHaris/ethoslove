"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { PRODUCTS, formatAmount, type Currency } from "@/lib/pricing/products";
import type { TemplateManifest } from "@/templates/types";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { TornEdge } from "@/components/marketing/home/cutouts";
import { GiftCardOffer } from "./gift-card-offer";
import { PricingCards } from "./pricing-cards";

/**
 * The one-time gifts, under Ethos for Two and quieter than it: the three template plans (the same
 * cards as /gifts, in their lighter dress), "Make it special" for a free template, and the gift card
 * while it's on sale. The links from the editor (?template=, ?plan=pick3, ?return=) still land here.
 */
export function SingleGifts({
  currency,
  manifests,
  paymentsEnabled,
  giftCards,
  preselect,
  openPick3,
  returnTo,
}: {
  currency: Currency;
  manifests: TemplateManifest[];
  paymentsEnabled: boolean;
  /** Gift cards on sale (GIFT_CARDS_ENABLED, read on the server). */
  giftCards: boolean;
  preselect?: string;
  openPick3: boolean;
  returnTo?: string;
}) {
  const t = useTranslations("membership.single");
  const tPricing = useTranslations("pricing");
  const locale = useLocale() === "es" ? "es" : "en";
  const free = manifests.filter((m) => m.tier === "free");
  const letter = free.find((m) => m.slug === "the-letter") ?? free[0];
  const names = new Intl.ListFormat(locale, { type: "conjunction" }).format(free.map((m) => m.name[locale]));

  return (
    <section id="gifts" className="relative bg-rose-mist pb-20 lg:pb-28" aria-labelledby="gifts-title">
      <TornEdge from="var(--brand-paper)" to="var(--color-rose-mist)" />
      <div className="container-x pt-14 lg:pt-20">
        <div className="grid gap-4 lg:grid-cols-12 lg:items-end" data-reveal>
          <div className="lg:col-span-7">
            <p className="text-eyebrow text-rose-ink">{t("eyebrow")}</p>
            <h2 id="gifts-title" className="mt-4 display-lg text-forest">
              {t("title")}
            </h2>
          </div>
          <p className="max-w-md text-[17px] leading-relaxed text-ink-soft lg:col-span-5 lg:justify-self-end lg:pb-1">{t("sub")}</p>
        </div>

        <div className="mt-10">
          <PricingCards currency={currency} manifests={manifests} authed={false} paymentsEnabled={paymentsEnabled} preselect={preselect} openPick3={openPick3} returnTo={returnTo} quiet />
        </div>

        <div className={cn("mt-5 grid gap-5", giftCards && "lg:grid-cols-2")}>
          {letter ? (
            <article className="relative flex flex-col gap-5 overflow-hidden rounded-3xl border border-line bg-card p-6 sm:flex-row sm:items-center sm:p-8" data-testid="special-card" data-reveal>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-eyebrow text-rose-ink">
                  <Sparkles aria-hidden="true" className="size-3.5" />
                  {t("special.eyebrow")}
                </p>
                <h3 className="mt-3 font-display text-[1.75rem] leading-tight text-forest">{t("special.name")}</h3>
                <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-soft">{t("special.blurb", { names })}</p>
                <p className="mt-2 text-[13px] text-muted-foreground">{t("special.note")}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:items-end">
                <span className="font-display text-[2.6rem] leading-none tracking-tight text-forest" data-testid="price-extras">
                  {formatAmount(PRODUCTS.extras.amounts[currency], currency, locale)}
                </span>
                <Link href={`/create/${letter.slug}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-ink px-6 text-[15px] font-semibold text-ink transition-colors hover:bg-ink hover:text-paper">
                  {t("special.cta", { name: letter.name[locale] })}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
            </article>
          ) : null}
          {giftCards ? <GiftCardOffer currency={currency} paymentsEnabled={paymentsEnabled} /> : null}
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-relaxed text-muted-foreground">{tPricing("freeNote")}</p>
      </div>
    </section>
  );
}
