import { ArrowRight, Plus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { GIFT_CARD_MONTHS, PRODUCTS, PRODUCT_ORDER, formatAmount, type Currency } from "@/lib/pricing/products";
import type { TemplateManifest } from "@/templates/types";
import { Link } from "@/i18n/navigation";
import { QUESTION_PLUS, QUESTION_ROW } from "@/components/templates/page/sections";
import { Intro } from "@/components/templates/page/spread";
import { GiftCardOffer } from "./gift-card-offer";
import { PricingCards } from "./pricing-cards";
import { pricingGifts } from "./free-gifts";

/**
 * The three ways to pay for gifts (`#gifts`, which /digital-cards and the editor link to), on the
 * paper: the section's label and heading, then the three cards (One gift, Pick three, Everything)
 * in the gallery card's dress, the one line about checkout, a closed row that holds every line the
 * cards used to list, and "Make it special" for a free template as a slim card of the same paper.
 * The gift card stands beside it while it is on sale. The links from the editor (?template=,
 * ?plan=pick3, ?return=) still land here and do what they did: PricingCards is unchanged in what
 * it sends.
 *
 * From 1280px the heading's column stands at the left of the cards, as a spread; under that it
 * stands over them, so three cards still fit side by side from 768px.
 */
export async function SingleGifts({
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
  const t = await getTranslations("membership.single");
  const tPricing = await getTranslations("pricing");
  const locale = (await getLocale()) === "es" ? "es" : "en";
  const tCard = await getTranslations("money.giftcard");
  // The gifts that go out free, as the gallery has them (PLAN-pricing.md, addendum of 24 Nov 2026): with the
  // free note live that is The Letter alone, and Constellations, sold whole at this card's price, is not
  // named here as a free gift whose extras it sells.
  const { free, note: short } = pricingGifts(manifests);
  const letter = free.find((m) => m.slug === "the-letter") ?? free[0];
  const names = new Intl.ListFormat(locale, { type: "conjunction" }).format(free.map((m) => m.name[locale]));

  return (
    <section id="gifts" className="relative scroll-mt-[calc(var(--header-h)+1rem)]" aria-labelledby="gifts-title">
      <div className="container-x relative grid gap-y-9 pt-10 pb-20 sm:pt-14 lg:pt-8 lg:pb-24 xl:grid-cols-[17.5rem_minmax(0,1fr)] xl:gap-x-16">
        <Intro id="gifts-title" label={tPricing("page.giftsLabel")} heading={tPricing("page.giftsHeading")} />

        <div className="min-w-0">
          <PricingCards currency={currency} manifests={manifests} authed={false} paymentsEnabled={paymentsEnabled} preselect={preselect} openPick3={openPick3} returnTo={returnTo} quiet />

          {/* Every line the three cards listed before the page was remade, closed: nothing a buyer could read is gone. */}
          <details data-includes className="group mt-6 border-y border-page-line">
            <summary className={QUESTION_ROW}>
              {tPricing("page.includes")}
              <Plus aria-hidden="true" className={QUESTION_PLUS} strokeWidth={1.6} />
            </summary>
            <div data-reveal className="grid gap-6 pb-6 md:grid-cols-3">
              {PRODUCT_ORDER.map((id) => (
                <div key={id}>
                  <h3 className="font-display text-[1.25rem] leading-tight text-page-ink">{tPricing(`page.cards.${id}.name`)}</h3>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-page-body">{tPricing(`plans.${id}.blurb`)}</p>
                  <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-[0.9375rem] leading-snug text-page-body marker:text-page-line">
                    {(tPricing.raw(`page.cards.${id}.includes`) as string[]).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                    <li>{tPricing("oneTime")}</li>
                  </ul>
                </div>
              ))}
              <p className="text-[0.9375rem] leading-relaxed text-page-body md:col-span-3">{tPricing(short ? "freeNoteShort" : "freeNote")}</p>
              <p className="text-[0.9375rem] leading-relaxed text-page-body md:col-span-3">
                <span className="text-page-ink">{t("special.name")}.</span> {t(short ? "special.blurbShort" : "special.blurb", { names })} {t("special.note")}
              </p>
              {giftCards ? (
                <p className="text-[0.9375rem] leading-relaxed text-page-body md:col-span-3">
                  <span className="text-page-ink">{tCard("title")}.</span> {tCard("blurb")} {tCard("features.valid", { months: GIFT_CARD_MONTHS })}. {tCard("note")}
                </p>
              ) : null}
            </div>
          </details>

          <div className="mt-6 grid gap-4">
            {letter ? (
              <article
                className="relative flex flex-col gap-4 rounded-[28px] bg-card p-6 shadow-[0_26px_48px_-34px_rgba(74,32,24,0.55)] ring-1 ring-ink/[0.07] sm:flex-row sm:items-center sm:gap-6 sm:px-7"
                data-testid="special-card"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <h3 className="font-display text-[1.5rem] leading-tight text-ink">{t("special.name")}</h3>
                    <span className="font-display text-[1.75rem] leading-none tracking-tight text-ink tabular-nums" data-testid="price-extras">
                      {formatAmount(PRODUCTS.extras.amounts[currency], currency, locale)}
                    </span>
                  </div>
                  <p className="mt-2 max-w-xl text-[0.9375rem] leading-snug text-ink-soft">{tPricing("page.specialLine")}</p>
                </div>
                <Link
                  href={`/create/${letter.slug}`}
                  className="inline-flex h-12 shrink-0 items-center justify-center gap-2 self-start rounded-full border border-ink/20 px-6 text-[15px] font-semibold text-ink transition-[background-color,border-color,scale] duration-200 hover:border-ink/45 hover:bg-paper active:scale-[0.98] active:bg-paper-deep sm:self-center"
                >
                  {t("special.cta", { name: letter.name[locale] })}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </article>
            ) : null}
            {giftCards ? <GiftCardOffer currency={currency} paymentsEnabled={paymentsEnabled} /> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
