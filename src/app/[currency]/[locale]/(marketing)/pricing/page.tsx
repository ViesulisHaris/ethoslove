import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SITE } from "@/config/site";
import { CHARGED_CURRENCIES, chargedCurrency, giftCardsOnSale, subscriptionsEnabled, type Currency } from "@/lib/pricing/products";
import { breadcrumbNode, faqNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { stripeReady } from "@/lib/stripe/server";
import { isTemplateSlug, listManifests } from "@/templates/manifests";
import { noteShare } from "@/lib/gift/free-tier";
import { JsonLd } from "@/components/shared/json-ld";
import { MembershipCompare } from "@/components/pricing/membership-compare";
import { MembershipHero } from "@/components/pricing/membership-hero";
import { PricingFaq } from "@/components/pricing/pricing-faq";
import { SingleGifts } from "@/components/pricing/single-gifts";
import { initialPlan, pricingFaq, safeReturnPath, type FaqItem } from "@/components/pricing/offers";
import { pricingGifts, withCurrencyAnswer, withFreeAnswer } from "@/components/pricing/free-gifts";
import { PriceHead } from "@/components/pricing/price-head";
import { PricingChoice } from "@/components/pricing/pricing-choice";

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/pricing">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return pageMetadata({ locale, path: "/pricing", title: t("seo.pricingTitle"), description: t(subscriptionsEnabled() ? "membership.hero.sub" : "membership.hero.subPass") });
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Where a link to the hero came from (docs/MEMBERSHIP.md 6.4): the page brings the offer into view. */
const FROM = ["saved-dates", "packs", "account"];

/**
 * STRIPE_SUBSCRIPTIONS_ENABLED, except on a development server, where ?subscriptions=on|off shows
 * either state for screenshots and the e2e tests: the dev server at :3300 is shared and runs with
 * the switch off. NODE_ENV is inlined at build, so a production page never reads the query, and
 * checkout follows the real switch either way.
 */
function subscriptionsOn(query: Record<string, string | string[] | undefined>): boolean {
  if (process.env.NODE_ENV === "development") {
    const forced = one(query.subscriptions);
    if (forced === "on" || forced === "off") return forced === "on";
  }
  return subscriptionsEnabled();
}

export default async function PricingPage({ params, searchParams }: PageProps<"/[currency]/[locale]/pricing">) {
  const { currency: shown, locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("pricing");
  const lang = locale === "es" ? "es" : "en";
  const qCurrency = one(query.currency);
  // Only a currency checkout charges in: showing £ for a sale Stripe then takes in € would make the
  // price on the page something other than the price paid.
  const currency: Currency = CHARGED_CURRENCIES.find((c) => c === qCurrency) ?? chargedCurrency(shown);
  const giftCards = giftCardsOnSale();
  const subscriptions = subscriptionsOn(query);
  // A question about something not on sale (the gift card while it's off, the answer for the other
  // way Ethos for Two can be sold) isn't asked here.
  const manifests = listManifests();
  // Free and paid as the gallery has them (lib/gift/free-tier.ts): the free tier's answer, the table's
  // free column and every name on the page follow the same list, whichever way the free note is set.
  const gifts = pricingGifts(manifests);
  // The currency question is answered in the currency the page charges in: a US visitor reads dollars under dollar prices.
  const faq = withCurrencyAnswer(
    withFreeAnswer(pricingFaq(t.raw("faq") as FaqItem[], { giftCards, subscriptions }), gifts.note, t("faqFreeNote")),
    t("faqCurrency", { currency }),
  );
  // A slug that isn't a template would sit in the picker unseen, taking one of the three places.
  const qTemplate = one(query.template);
  const template = qTemplate && isTemplateSlug(qTemplate) ? qTemplate : undefined;
  const returnTo = one(query.return);
  const qPlan = one(query.plan);
  const renewAsked = one(query.renew) === "pass";

  // Someone who came for the membership: its band is scrolled to and marked, and the table opened.
  const highlight = renewAsked || FROM.includes(one(query.from) ?? "") || qPlan === "monthly" || qPlan === "yearly";

  // The page, top to foot (docs/marketing/growth-build/PLAN-pricing.md, 24 Nov 2026): a gift's price first, the
  // three ways to pay for gifts, Ethos for Two in its band, the questions with the table as their first closed row. The site's
  // paper and layout (SitePage's wrapper), the gift pages' parts.
  return (
    <>
      <JsonLd
        nodes={[
          faqNode(faq),
          breadcrumbNode([
            { name: SITE.name, url: localizedUrl(locale) },
            { name: t("eyebrow"), url: localizedUrl(locale, "/pricing") },
          ]),
        ]}
      />
      {/* SitePage's wrapper (components/marketing/spread/sections.tsx), written out: importing that module would bring the
          playing hero phone and its share of the messages, which this page does not draw. */}
      {/* data-note-share: the free-note setting this server builds with, so the e2e tests check the page against it, not against their own shell. */}
      <div data-page-theme="pricing" data-note-share={noteShare()} className="relative isolate -mt-[var(--header-h)] pt-[var(--header-h)]">
        <PricingChoice>
          <PriceHead currency={currency} manifests={manifests} template={template} subscriptions={subscriptions} />
          <SingleGifts
            currency={currency}
            manifests={manifests}
            paymentsEnabled={stripeReady()}
            giftCards={giftCards}
            preselect={template}
            openPick3={qPlan === "pick3" && Boolean(template)}
            returnTo={returnTo ? safeReturnPath(returnTo, "/dashboard") : undefined}
          />
        </PricingChoice>
        <MembershipHero
          currency={currency}
          paymentsEnabled={stripeReady()}
          subscriptions={subscriptions}
          initialPlan={initialPlan(qPlan, subscriptions)}
          highlight={highlight}
          renewAsked={renewAsked}
        />
        <PricingFaq
          faq={faq}
          before={
            <MembershipCompare
              currency={currency}
              subscriptions={subscriptions}
              freeTemplates={gifts.free.map((m) => m.name[lang])}
              templateCount={manifests.length}
              open={highlight}
            />
          }
        />
      </div>
    </>
  );
}
