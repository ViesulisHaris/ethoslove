import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClientMessages } from "@/i18n/client-messages";
import { homeHeroFor } from "@/lib/attribution/landing";
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
 * a table of games. The gifts' own front page, which used to live here, is at /gifts unchanged.
 *
 * Someone who came from a gift on social media, or from a gift's badge, gets the gift hero and the
 * gallery straight after it: that is who buys. Reading `ref` here makes the page render per
 * request, which is the price of choosing the hero in the HTML rather than swapping it after load.
 */
export default async function HomePage({ params, searchParams }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const hero = homeHeroFor((await searchParams).ref);
  const strip = <TemplateStrip manifests={listManifests()} />;
  return (
    <ClientMessages scope="(marketing)/page" locale={locale}>
      <JsonLd nodes={[organizationNode(), websiteNode()]} />
      <PlatformHero variant={hero} />
      <TornEdge from="#FFE9EC" to="var(--brand-paper)" />
      {hero === "gift" ? strip : null}
      <Doors />
      <IdeasTeaser />
      {hero === "dates" ? strip : null}
      {/* The tear starts in the colour of whatever sits above it: the blush of the ideas when the gallery moved up. */}
      <TornEdge from={hero === "gift" ? "#FFF5F2" : "var(--brand-paper)"} to="var(--brand-forest)" fibre="#4d2139" />
      <LongDistanceBand />
      <TornEdge from="var(--brand-forest)" to="var(--brand-paper)" fibre="#4d2139" />
      <GamesBand />
      <TornEdge from="var(--brand-paper)" to="var(--brand-forest)" fibre="#4d2139" />
      <PlatformClosing />
    </ClientMessages>
  );
}
