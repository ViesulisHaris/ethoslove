import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight } from "lucide-react";
import { OCCASIONS } from "@/config/occasions";
import { SITE } from "@/config/site";
import { breadcrumbNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/shared/json-ld";
import { PageHeader } from "@/components/shared/page-header";

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/occasions">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  return pageMetadata({ locale, path: "/occasions", title: t("occasionsTitle"), description: t("occasionsDescription") });
}

export default async function OccasionsIndexPage({ params }: PageProps<"/[locale]/occasions">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <>
      <JsonLd
        nodes={[
          breadcrumbNode([
            { name: SITE.name, url: localizedUrl(locale) },
            { name: t("occasions.title"), url: localizedUrl(locale, "/occasions") },
          ]),
        ]}
      />
      <PageHeader eyebrow={t("occasions.title")} title={t("seo.occasionsTitle")} subtitle={t("seo.occasionsDescription")} />
      <ol className="container-x grid border-t border-line pb-24 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3">
        {OCCASIONS.map((o, i) => (
          <li key={o} className="border-b border-line">
            <Link href={`/occasions/${o}`} className="group flex items-baseline gap-4 py-5 transition-colors hover:text-coral">
              <span className="text-mono-meta w-7 text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-display text-[1.75rem] leading-none">{t(`occasions.${o}`)}</span>
              <ArrowUpRight className="ml-auto size-4 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}
