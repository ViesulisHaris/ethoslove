import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowDown } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OCCASIONS, isOccasion } from "@/config/occasions";
import { SITE } from "@/config/site";
import type { Locale } from "@/i18n/routing";
import { breadcrumbNode, faqNode, localizedUrl, pageMetadata, templateListNode } from "@/lib/seo";
import { forCards, listManifests } from "@/templates/manifests";
import { OCCASION_GUIDES } from "@/content/occasions";
import { occasionTemplates } from "@/content/occasion-templates";
import { JsonLd } from "@/components/shared/json-ld";
import { OccasionGuide, OccasionIdeas } from "@/components/marketing/occasion-guide";
import { SitePage } from "@/components/marketing/spread/sections";
import { GalleryHead } from "@/components/templates/gallery-head";
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
    // The page's heading names the day; the search result can say what's on the page ("12 ideas"), counted from its list.
    title: t.has(`occasion.${occasion}.metaTitle`) ? t(`occasion.${occasion}.metaTitle`, { ideas: OCCASION_GUIDES[occasion][locale === "es" ? "es" : "en"].ideas?.items.length ?? 0 }) : t(`occasion.${occasion}.title`),
    description: t(`occasion.${occasion}.description`),
  });
}

/**
 * The row of occasions over the cards leads with what is in season (gallery-occasions.ts), by the
 * day the page is rendered with, and must be in the same order here as on /templates. The page is
 * static, so it is rendered again every hour, as the finder is: the season turns without a deploy.
 */
export const revalidate = 3600;

export default async function OccasionPage({ params }: PageProps<"/[currency]/[locale]/occasions/[occasion]">) {
  const { locale, occasion } = await params;
  if (!isOccasion(occasion)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();
  const title = t(`seo.occasion.${occasion}.title`);
  const guide = OCCASION_GUIDES[occasion][locale as Locale];
  // The cards: the gifts made for this occasion, and every gift the page's own ideas name (content/occasion-templates.ts).
  const templates = occasionTemplates(occasion, locale as Locale);
  // What "Free" shows when nothing on this page can be sent free.
  const alsoFree = listManifests({ tier: "free" }).filter((m) => sendsFree(m) && !templates.some((x) => x.slug === m.slug));
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
      {/*
       * The gallery's own head (components/templates/gallery-head.tsx), so the row of occasions stands
       * at the same height here as on /templates and on every other occasion's page. Beside the italic
       * line, one quiet link to the ideas: they are what the page's search result promises ("12
       * ideas"), and they lie under the whole gallery (the test of 23 Nov 2026). The occasion's own
       * paragraph, which stood here in four lines, opens the part under the cards.
       */}
      <GalleryHead
        eyebrow={t("occasions.title")}
        title={title}
        line={t("templates.subtitle")}
        aside={
          guide.ideas ? (
            <a
              href={`#ideas-${occasion}`}
              data-testid="to-ideas"
              className="-my-2.5 inline-flex min-h-11 items-center gap-2 rounded-md text-[0.9375rem] font-medium text-ink underline decoration-ink/25 underline-offset-4 transition-colors hover:decoration-ink active:text-rose-deep"
            >
              {guide.ideas.title}
              <ArrowDown aria-hidden="true" className="size-4" />
            </a>
          ) : undefined
        }
      >
        <TemplateGallery manifests={forCards(templates)} occasion={occasion} alsoFree={forCards(alsoFree)} today={new Date().toISOString().slice(0, 10)} />
      </GalleryHead>
      <div className="container-x pb-4">
        <p data-occasion-intro className="max-w-2xl border-t border-line pt-10 text-lg leading-relaxed text-ink-soft">
          {t(`seo.occasion.${occasion}.intro`)}
        </p>
      </div>
      {/* Below the gallery the page is laid out as a gift's own page is: the ideas as picture cards, then the guide and the questions as closed rows. */}
      <SitePage name={`occasion-${occasion}`} under={false}>
        <OccasionIdeas occasion={occasion} locale={locale as Locale} />
        <OccasionGuide occasion={occasion} locale={locale as Locale} />
      </SitePage>
    </>
  );
}
