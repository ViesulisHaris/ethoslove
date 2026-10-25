import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SITE } from "@/config/site";
import { CHARGED_CURRENCIES, chargedCurrency, giftCardsOnSale, subscriptionsEnabled, type Currency } from "@/lib/pricing/products";
import { breadcrumbNode, faqNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { stripeReady } from "@/lib/stripe/server";
import { isTemplateSlug, listManifests } from "@/templates/manifests";
import { JsonLd } from "@/components/shared/json-ld";
import { MembershipCompare } from "@/components/pricing/membership-compare";
import { MembershipHero } from "@/components/pricing/membership-hero";
import { PricingFaq } from "@/components/pricing/pricing-faq";
import { SingleGifts } from "@/components/pricing/single-gifts";
import { initialPlan, pricingFaq, safeReturnPath, type FaqItem } from "@/components/pricing/offers";

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
  const faq = pricingFaq(t.raw("faq") as FaqItem[], { giftCards, subscriptions });
  // A slug that isn't a template would sit in the picker unseen, taking one of the three places.
  const qTemplate = one(query.template);
  const template = qTemplate && isTemplateSlug(qTemplate) ? qTemplate : undefined;
  const returnTo = one(query.return);
  const qPlan = one(query.plan);
  const renewAsked = one(query.renew) === "pass";
  const manifests = listManifests();

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
      <MembershipHero
        currency={currency}
        paymentsEnabled={stripeReady()}
        subscriptions={subscriptions}
        initialPlan={initialPlan(qPlan, subscriptions)}
        highlight={renewAsked || FROM.includes(one(query.from) ?? "") || qPlan === "monthly" || qPlan === "yearly"}
        renewAsked={renewAsked}
      />
      <MembershipCompare
        currency={currency}
        subscriptions={subscriptions}
        freeTemplates={manifests.filter((m) => m.tier === "free").map((m) => m.name[lang])}
        templateCount={manifests.length}
      />
      <SingleGifts
        currency={currency}
        manifests={manifests}
        paymentsEnabled={stripeReady()}
        giftCards={giftCards}
        preselect={template}
        openPick3={qPlan === "pick3" && Boolean(template)}
        returnTo={returnTo ? safeReturnPath(returnTo, "/dashboard") : undefined}
      />
      <PricingFaq faq={faq} currency={currency} subscriptions={subscriptions} />
    </>
  );
}
