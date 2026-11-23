import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SITE } from "@/config/site";
import { FINDER_PATH } from "@/content/finder";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { breadcrumbNode, localizedUrl, pageMetadata, templateListNode } from "@/lib/seo";
import { TEMPLATE_SLUGS, forCards, listManifests } from "@/templates/manifests";
import { JsonLd } from "@/components/shared/json-ld";
import { TemplateGallery } from "@/components/templates/template-gallery";
import { GalleryHead } from "@/components/templates/gallery-head";

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/templates">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  return pageMetadata({
    locale,
    path: "/templates",
    title: t("templatesTitle"),
    description: t("templatesDescription", { count: listManifests().length }),
  });
}

/**
 * Built ahead and served as it is, refreshed every hour, like an occasion's page: the gallery is the
 * room the header's "Gifts" opens, and a page rendered per request could not be fetched ahead of the
 * press, so every visit to it from another room waited for the server and the whole gallery to
 * arrive (5.6 s on a slow phone). It no longer reads its query: the price filter and the order are
 * read from the address in the browser (template-gallery.tsx), and the old `?occasion=` form is sent
 * to the occasion's own page by next.config.ts.
 */
export const revalidate = 3600;

export default async function TemplatesPage({ params }: PageProps<"/[currency]/[locale]/templates">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const manifests = listManifests();
  // The row of occasions leads with what is in season: the day the page was last built, at most an hour old.
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <JsonLd
        nodes={[
          templateListNode(manifests, locale as Locale, t("seo.templatesTitle")),
          breadcrumbNode([
            { name: SITE.name, url: localizedUrl(locale) },
            { name: t("templates.title"), url: localizedUrl(locale, "/templates") },
          ]),
        ]}
      />
      {/*
       * The page's head as the owner drew it (22 Nov 2026), shared with every occasion's page
       * (components/templates/gallery-head.tsx). Beside the italic line on a desk, the way to the
       * finder, for someone facing every template at once (/gifts/finder narrows them to three). It
       * had a row of its own, which was one of the things that kept the gifts under the first screen
       * (the user walk of 23 Nov 2026).
       */}
      <GalleryHead
        eyebrow={t("templates.title")}
        title={t("seo.templatesTitle")}
        line={t("templates.subtitle")}
        aside={
          <p className="-my-2.5 text-[15px] text-ink-soft">
            {t("templates.finder.ask")}{" "}
            <Link href={FINDER_PATH} className="group inline-flex min-h-11 items-center gap-1.5 font-medium text-ink underline decoration-ink/25 underline-offset-4 transition-colors hover:decoration-ink">
              {t("templates.finder.link")}
              <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </p>
        }
      >
        <TemplateGallery manifests={forCards(manifests)} added={TEMPLATE_SLUGS} today={today} />
      </GalleryHead>
    </>
  );
}
