import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localizedUrl, pageMetadata, withSharePreview } from "@/lib/seo";
import { SITE } from "@/config/site";
import { hasSharePreview, previewQuery, readSharePreview, shareCardPath } from "@/lib/share/links";
import { currencyFor, subscriptionsEnabled } from "@/lib/pricing/products";
import { PlanView } from "@/components/dates/plan-view";

export async function generateMetadata({ params, searchParams }: PageProps<"/[locale]/plan">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "plan.meta" });
  // One address for everybody's plan, and whatever is in it lives after the `#`: nothing here to index.
  const base: Metadata = { ...pageMetadata({ locale, path: "/plan", title: t("title"), description: t("description") }), robots: { index: false, follow: true } };
  // A shared plan's link also carries what its preview shows: the first stop's photograph, a title
  // and the day (lib/share/links.ts). Read for the preview only; the plan never leaves the `#`.
  const preview = readSharePreview(await searchParams);
  if (!hasSharePreview(preview)) return base;
  const l = locale === "es" ? "es" : "en";
  const title = preview.title ?? t("title");
  return withSharePreview(base, {
    url: `${localizedUrl(locale, "/plan")}${previewQuery(preview)}`,
    title,
    description: t("shared"),
    image: `${SITE.url}${shareCardPath({ kind: "plan", locale: l, cover: preview.cover, title: preview.title, date: preview.date })}`,
    alt: title,
  });
}

export default async function PlanPage({ params }: PageProps<"/[locale]/plan">) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Read at build time (the page is static): the Ethos for Two sheet shows the monthly price only while it is sold.
  return (
    <div className="-mt-[var(--header-h)] min-h-dvh bg-blush-paper pt-[var(--header-h)]">
      <PlanView monthly={subscriptionsEnabled()} currency={currencyFor(locale === "es" ? "ES" : "US")} />
    </div>
  );
}
