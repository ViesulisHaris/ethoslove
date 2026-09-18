import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isOccasion } from "@/config/occasions";
import { SITE } from "@/config/site";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { breadcrumbNode, localizedUrl, pageMetadata, templateListNode } from "@/lib/seo";
import { listManifests } from "@/templates/manifests";
import { JsonLd } from "@/components/shared/json-ld";
import { PageHeader } from "@/components/shared/page-header";
import { TemplateGallery } from "@/components/templates/template-gallery";

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/templates">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  return pageMetadata({
    locale,
    path: "/templates",
    title: t("templatesTitle"),
    description: t("templatesDescription", { count: listManifests().length }),
  });
}

export default async function TemplatesPage({ params, searchParams }: PageProps<"/[locale]/templates">) {
  const { locale } = await params;
  const { occasion } = await searchParams;
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
      <PageHeader eyebrow={t("templates.title")} title={t("seo.templatesTitle")} subtitle={t("templates.subtitle")} />
      <TemplateGallery manifests={manifests} />
    </>
  );
}
