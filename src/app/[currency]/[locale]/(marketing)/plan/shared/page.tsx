import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { localizedUrl, pageMetadata, withSharePreview } from "@/lib/seo";
import { SITE } from "@/config/site";
import { hasSharePreview, previewQuery, readSharePreview, shareCardPath } from "@/lib/share/links";
import PlanPage from "../page";

/**
 * /plan as a shared plan's link opens it: the proxy sends a /plan request whose query carries a
 * preview here (src/proxy.ts). The plan itself never leaves the `#`; the query holds only what the
 * preview shows: the first stop's photograph, a title and the day (lib/share/links.ts).
 */
export async function generateMetadata({ params, searchParams }: PageProps<"/[currency]/[locale]/plan/shared">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "plan.meta" });
  const base: Metadata = { ...pageMetadata({ locale, path: "/plan", title: t("title"), description: t("description") }), robots: { index: false, follow: true } };
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

export default function SharedPlanPage({ params }: PageProps<"/[currency]/[locale]/plan/shared">) {
  return <PlanPage params={params} />;
}
