import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SITE } from "@/config/site";
import { CHARGED_CURRENCIES, currencyFor, giftCardsOnSale, type Currency } from "@/lib/pricing/products";
import { breadcrumbNode, faqNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { stripeReady } from "@/lib/stripe/server";
import { isTemplateSlug, listManifests } from "@/templates/manifests";
import { JsonLd } from "@/components/shared/json-ld";
import { PageHeader } from "@/components/shared/page-header";
import { PricingOffers } from "@/components/pricing/pricing-offers";
import { FreeForever } from "@/components/pricing/for-two";
import { pricingFaq, safeReturnPath, type FaqItem } from "@/components/pricing/offers";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/pricing">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return pageMetadata({ locale, path: "/pricing", title: t("seo.pricingTitle"), description: t("pricing.subtitle") });
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function PricingPage({ params, searchParams }: PageProps<"/[locale]/pricing">) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("pricing");
  const qCurrency = one(query.currency);
  // Only a currency checkout charges in: showing £ for a sale Stripe then takes in € would make the
  // price on the page something other than the price paid.
  const currency: Currency = CHARGED_CURRENCIES.find((c) => c === qCurrency) ?? currencyFor(locale === "es" ? "ES" : "US");
  const giftCards = giftCardsOnSale();
  // A question about something not on sale (the gift card, while it's off) isn't asked here.
  const faq = pricingFaq(t.raw("faq") as FaqItem[], { giftCards });
  // A slug that isn't a template would sit in the picker unseen, taking one of the three places.
  const qTemplate = one(query.template);
  const template = qTemplate && isTemplateSlug(qTemplate) ? qTemplate : undefined;
  const returnTo = one(query.return);

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
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <section className="container-x pb-6">
        <PricingOffers
          currency={currency}
          manifests={listManifests()}
          paymentsEnabled={stripeReady()}
          giftCards={giftCards}
          preselect={template}
          openPick3={one(query.plan) === "pick3" && Boolean(template)}
          renewPass={one(query.renew) === "pass"}
          returnTo={returnTo ? safeReturnPath(returnTo, "/dashboard") : undefined}
        />
        <p className="mt-8 text-center text-sm text-muted-foreground">{t("freeNote")}</p>
      </section>
      <section className="container-x pt-10">
        <FreeForever />
      </section>
      <section className="container-narrow py-20">
        <h2 className="display-md mb-8">{t("faqTitle")}</h2>
        <Accordion type="single" collapsible className="divide-y divide-border border-y border-border">
          {faq.map((item, i) => (
            <AccordionItem key={i} value={`q${i}`} className="border-0">
              <AccordionTrigger className="py-5 text-left text-base font-medium hover:no-underline">{item.q}</AccordionTrigger>
              <AccordionContent className="pb-5 text-[15px] leading-relaxed text-ink-soft">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </>
  );
}
