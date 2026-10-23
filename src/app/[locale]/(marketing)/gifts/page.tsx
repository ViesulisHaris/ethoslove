import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { ClientMessages } from "@/i18n/client-messages";
import type { GiftLocale } from "@/lib/gift/schema";
import { appNode, organizationNode, pageMetadata } from "@/lib/seo";
import { listManifests } from "@/templates/manifests";
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
import { TornEdge } from "@/components/marketing/home/cutouts";
import { proofNumbers, shownReactions } from "@/lib/proof/proof";

/** The proof in the reactions section is read from the database: the page is drawn again hourly to keep it current. */
export const revalidate = 3600;

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/gifts">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({ locale, path: "/gifts", title: t("giftsTitle"), description: t("giftsDescription"), absoluteTitle: true });
}

/** Gifts: what was the whole site's front page before Dates arrived, kept as it was. */
export default async function GiftsPage({ params }: PageProps<"/[locale]/gifts">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  // Real reactions in this page's language replace the samples only when there are enough for the row
  // (three); fewer stay unseen, and another language's are never borrowed.
  const [numbers, reactions] = await Promise.all([proofNumbers(), shownReactions(3, locale === "es" ? "es" : "en")]);
  const plans = {
    free: t("common.free"),
    single: t("pricing.plans.single.name"),
    pick3: t("pricing.plans.pick3.name"),
    everything: t("pricing.plans.everything.name"),
  };
  return (
    <ClientMessages scope="(marketing)/gifts/page" locale={locale}>
      <JsonLd nodes={[organizationNode(), appNode(locale as Locale, t("meta.description"), plans)]} />
      <Hero />
      <TornEdge from="var(--brand-forest)" to="var(--brand-paper)" />
      <TemplateStrip manifests={listManifests()} />
      <Openings locale={locale as GiftLocale} />
      <Reactions real={reactions.length >= 3 ? reactions : null} numbers={numbers} />
      <HowItWorks />
      <OccasionsIndex />
      <PricingTeaser locale={locale} />
      <Faq />
      <TornEdge from="var(--brand-paper)" to="var(--brand-forest)" fibre="#4d2139" />
      <FinalCta />
    </ClientMessages>
  );
}
