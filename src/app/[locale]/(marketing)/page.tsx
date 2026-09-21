import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { organizationNode, pageMetadata, websiteNode } from "@/lib/seo";
import { listManifests } from "@/templates/manifests";
import { JsonLd } from "@/components/shared/json-ld";
import { TemplateStrip } from "@/components/marketing/home/template-strip";
import { TornEdge } from "@/components/marketing/home/cutouts";
import { GamesBand, LongDistanceBand, PlatformClosing } from "@/components/marketing/platform/bands";
import { Doors } from "@/components/marketing/platform/doors";
import { IdeasTeaser } from "@/components/marketing/platform/ideas-teaser";
import { PlatformHero } from "@/components/marketing/platform/platform-hero";

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "platform.meta" });
  return pageMetadata({ locale, path: "/", title: t("title"), description: t("description"), absoluteTitle: true });
}

/**
 * The front door: dates on a map, gifts that open like a story, a corner for long distance and
 * the games to come. The gifts' own front page, which used to live here, is at /gifts unchanged.
 */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <JsonLd nodes={[organizationNode(), websiteNode()]} />
      <PlatformHero />
      <TornEdge from="#FFE9EC" to="var(--brand-paper)" />
      <Doors />
      <IdeasTeaser />
      <TemplateStrip manifests={listManifests()} />
      <TornEdge from="var(--brand-paper)" to="var(--brand-forest)" fibre="#4d2139" />
      <LongDistanceBand />
      <TornEdge from="var(--brand-forest)" to="var(--brand-paper)" fibre="#4d2139" />
      <GamesBand />
      <TornEdge from="var(--brand-paper)" to="var(--brand-forest)" fibre="#4d2139" />
      <PlatformClosing />
    </>
  );
}
