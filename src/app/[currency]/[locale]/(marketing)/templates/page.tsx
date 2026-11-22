import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isOccasion } from "@/config/occasions";
import { SITE } from "@/config/site";
import { FINDER_PATH } from "@/content/finder";
import { Link, redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { breadcrumbNode, localizedUrl, pageMetadata, templateListNode } from "@/lib/seo";
import { TEMPLATE_SLUGS, listManifests } from "@/templates/manifests";
import { JsonLd } from "@/components/shared/json-ld";
import { TemplateGallery } from "@/components/templates/template-gallery";
import { parseTier } from "@/components/templates/gallery-tier";
import { parseSort } from "@/components/templates/gallery-sort";
import { GalleryArt } from "@/components/templates/gallery-art";

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

export default async function TemplatesPage({ params, searchParams }: PageProps<"/[currency]/[locale]/templates">) {
  const { locale } = await params;
  const { occasion, tier, sort } = await searchParams;
  // An occasion has its own page; send the old query-param form there rather than serving the
  // same list under two URLs, which would have them compete with each other in search.
  if (typeof occasion === "string" && isOccasion(occasion)) redirect({ href: `/occasions/${occasion}`, locale });
  setRequestLocale(locale);
  const t = await getTranslations();
  const manifests = listManifests();
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
       * The page's head as the owner drew it (22 Nov 2026): the paper with light in it and a spray of
       * lilies, running up under the floating header and down behind the row of occasions and the
       * first cards. -mt/pt: the ground starts at the top of the screen, as a gift's page does.
       */}
      <div className="relative isolate -mt-[var(--header-h)] pt-[var(--header-h)]">
        <GalleryArt />
        <header className="container-x pt-12 pb-9 sm:pt-16 sm:pb-11">
          <p className="text-eyebrow mb-5 text-ink-soft">{t("templates.title")}</p>
          <h1 className="display-xl max-w-3xl">{t("seo.templatesTitle")}</h1>
          <p className="mt-5 max-w-xl font-display text-xl leading-snug text-ink-soft italic sm:text-2xl">{t("templates.subtitle")}</p>
          {/* For someone facing every template at once: the finder narrows them to three (/gifts/finder). */}
          <p className="mt-5 -mb-2.5 text-[15px] text-ink-soft">
            {t("templates.finder.ask")}{" "}
            <Link href={FINDER_PATH} className="group inline-flex min-h-11 items-center gap-1.5 font-medium text-ink underline decoration-ink/25 underline-offset-4 transition-colors hover:decoration-ink">
              {t("templates.finder.link")}
              <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </p>
        </header>
        <TemplateGallery manifests={manifests} initialTier={parseTier(typeof tier === "string" ? tier : null)} initialSort={parseSort(typeof sort === "string" ? sort : null)} added={TEMPLATE_SLUGS} />
      </div>
    </>
  );
}
