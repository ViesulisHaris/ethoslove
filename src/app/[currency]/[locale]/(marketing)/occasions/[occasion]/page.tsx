import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowDown } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OCCASIONS, isOccasion } from "@/config/occasions";
import { SITE } from "@/config/site";
import type { Locale } from "@/i18n/routing";
import { breadcrumbNode, faqNode, localizedUrl, pageMetadata, templateListNode } from "@/lib/seo";
import { listManifests } from "@/templates/manifests";
import { OCCASION_GUIDES } from "@/content/occasions";
import { JsonLd } from "@/components/shared/json-ld";
import { OccasionGuide, OccasionIdeas } from "@/components/marketing/occasion-guide";
import { SitePage } from "@/components/marketing/spread/sections";
import { PageHeader } from "@/components/shared/page-header";
import { TemplateGallery } from "@/components/templates/template-gallery";
import { sendsFree } from "@/lib/gift/free-tier";

export function generateStaticParams() {
  return OCCASIONS.map((occasion) => ({ occasion }));
}

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/occasions/[occasion]">, "searchParams">): Promise<Metadata> {
  const { locale, occasion } = await params;
  if (!isOccasion(occasion)) return {};
  const t = await getTranslations({ locale, namespace: "seo" });
  return pageMetadata({
    locale,
    path: `/occasions/${occasion}`,
    // The page's heading names the day; the search result can say what's on the page (12 ideas).
    title: t.has(`occasion.${occasion}.metaTitle`) ? t(`occasion.${occasion}.metaTitle`) : t(`occasion.${occasion}.title`),
    description: t(`occasion.${occasion}.description`),
  });
}

export default async function OccasionPage({ params }: PageProps<"/[currency]/[locale]/occasions/[occasion]">) {
  const { locale, occasion } = await params;
  if (!isOccasion(occasion)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();
  const title = t(`seo.occasion.${occasion}.title`);
  const templates = listManifests({ occasion });
  // What "Free" shows when this occasion has no free template of its own.
  const alsoFree = listManifests({ tier: "free" }).filter((m) => sendsFree(m) && !m.occasions.includes(occasion));
  const guide = OCCASION_GUIDES[occasion][locale as Locale];
  return (
    <>
      <JsonLd
        nodes={[
          templateListNode(templates, locale as Locale, title),
          breadcrumbNode([
            { name: SITE.name, url: localizedUrl(locale) },
            { name: t("occasions.title"), url: localizedUrl(locale, "/occasions") },
            { name: title, url: localizedUrl(locale, `/occasions/${occasion}`) },
          ]),
          faqNode(guide.faq),
        ]}
      />
      <PageHeader eyebrow={t("occasions.title")} title={title} subtitle={t(`seo.occasion.${occasion}.intro`)}>
        {/* The ideas are what the page's search result promises ("12 ideas"), and they lie under the whole gallery: seven
            screens down on a phone for Christmas, far more for an anniversary (the test of 23 Nov 2026). One quiet link
            from the top says they are there and goes to them. Whether the gallery and the ideas stay two grids is the
            owner's to decide; this is not that decision. */}
        {guide.ideas ? (
          <a
            href={`#ideas-${occasion}`}
            data-testid="to-ideas"
            className="inline-flex min-h-11 items-center gap-2 rounded-md text-[0.9375rem] font-medium text-ink underline decoration-ink/25 underline-offset-4 transition-colors hover:decoration-ink active:text-rose-deep"
          >
            {guide.ideas.title}
            <ArrowDown aria-hidden="true" className="size-4" />
          </a>
        ) : null}
      </PageHeader>
      <TemplateGallery manifests={templates} occasion={occasion} alsoFree={alsoFree} />
      {/* Below the gallery the page is laid out as a gift's own page is: the ideas as picture cards, then the guide and the questions as closed rows. */}
      <SitePage name={`occasion-${occasion}`} under={false}>
        <OccasionIdeas occasion={occasion} locale={locale as Locale} />
        <OccasionGuide occasion={occasion} locale={locale as Locale} />
      </SitePage>
    </>
  );
}
