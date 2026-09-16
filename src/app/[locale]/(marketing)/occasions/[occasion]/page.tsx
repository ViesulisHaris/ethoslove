import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OCCASIONS, isOccasion } from "@/config/occasions";
import { SITE } from "@/config/site";
import type { Locale } from "@/i18n/routing";
import { breadcrumbNode, localizedUrl, pageMetadata, templateListNode } from "@/lib/seo";
import { listManifests } from "@/templates/registry";
import { JsonLd } from "@/components/shared/json-ld";
import { PageHeader } from "@/components/shared/page-header";
import { TemplateGallery } from "@/components/templates/template-gallery";

export function generateStaticParams() {
  return OCCASIONS.map((occasion) => ({ occasion }));
}

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/occasions/[occasion]">, "searchParams">): Promise<Metadata> {
  const { locale, occasion } = await params;
  if (!isOccasion(occasion)) return {};
  const t = await getTranslations({ locale, namespace: "seo" });
  return pageMetadata({
    locale,
    path: `/occasions/${occasion}`,
    title: t(`occasion.${occasion}.title`),
    description: t(`occasion.${occasion}.description`),
  });
}

export default async function OccasionPage({ params }: PageProps<"/[locale]/occasions/[occasion]">) {
  const { locale, occasion } = await params;
  if (!isOccasion(occasion)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();
  const title = t(`seo.occasion.${occasion}.title`);
  const templates = listManifests({ occasion });
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
        ]}
      />
      <PageHeader eyebrow={t("occasions.title")} title={title} subtitle={t(`seo.occasion.${occasion}.intro`)} />
      <TemplateGallery manifests={templates} occasion={occasion} />
    </>
  );
}
