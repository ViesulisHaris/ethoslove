import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import type { GiftLocale } from "@/lib/gift/schema";
import { appNode, organizationNode, pageMetadata, websiteNode } from "@/lib/seo";
import { listManifests } from "@/templates/registry";
import { JsonLd } from "@/components/shared/json-ld";
import { Hero } from "@/components/marketing/home/hero";
import { TemplateStrip } from "@/components/marketing/home/template-strip";
import { Openings } from "@/components/marketing/home/openings";
import { Reactions } from "@/components/marketing/home/reactions";
import { HowItWorks } from "@/components/marketing/home/how-it-works";
import { OccasionsIndex } from "@/components/marketing/home/occasions-index";
import { PricingTeaser } from "@/components/marketing/home/pricing-teaser";
import { Faq } from "@/components/marketing/home/faq";
import { FinalCta } from "@/components/marketing/home/final-cta";

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({ locale, path: "/", title: t("defaultTitle"), description: t("description"), absoluteTitle: true });
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const plans = {
    free: t("common.free"),
    single: t("pricing.plans.single.name"),
    pick3: t("pricing.plans.pick3.name"),
    everything: t("pricing.plans.everything.name"),
  };
  return (
    <>
      <JsonLd nodes={[organizationNode(), websiteNode(), appNode(locale as Locale, t("meta.description"), plans)]} />
      <Hero />
      <TemplateStrip manifests={listManifests()} />
      <Openings locale={locale as GiftLocale} />
      <Reactions />
      <HowItWorks />
      <OccasionsIndex />
      <PricingTeaser locale={locale} />
      <Faq />
      <FinalCta />
    </>
  );
}
