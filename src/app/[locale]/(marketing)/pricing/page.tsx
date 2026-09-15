import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { currencyFor, type Currency } from "@/lib/pricing/products";
import { stripeReady } from "@/lib/stripe/server";
import { listManifests } from "@/templates/registry";
import { PageHeader } from "@/components/shared/page-header";
import { PricingCards } from "@/components/pricing/pricing-cards";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/pricing">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function PricingPage({ params, searchParams }: PageProps<"/[locale]/pricing">) {
  const { locale } = await params;
  const { template, return: returnTo, currency: qCurrency } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("pricing");
  const currency: Currency = qCurrency === "eur" || qCurrency === "gbp" || qCurrency === "usd" ? qCurrency : currencyFor(locale === "es" ? "ES" : "US");
  const faq = t.raw("faq") as { q: string; a: string }[];

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <section className="container-x pb-6">
        <PricingCards
          currency={currency}
          manifests={listManifests()}
          authed={false}
          paymentsEnabled={stripeReady()}
          preselect={typeof template === "string" ? template : undefined}
          returnTo={typeof returnTo === "string" ? returnTo : undefined}
        />
        <p className="mt-8 text-center text-sm text-muted-foreground">{t("freeNote")}</p>
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
