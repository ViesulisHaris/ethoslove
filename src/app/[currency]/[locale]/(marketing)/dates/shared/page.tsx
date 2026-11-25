import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { localizedUrl, pageMetadata, withSharePreview } from "@/lib/seo";
import { SITE } from "@/config/site";
import { isLatLng } from "@/lib/dates/geo";
import { firstParams, hasSharePreview, previewQuery, readSharedPlace, readSharePreview, shareCardPath, shareTitle } from "@/lib/share/links";
import DatesPage from "../page";

/**
 * /dates as a shared place's link opens it (`/dates?lat=…&lng=…&place=…&c=<cover>&t=<name>`): the proxy
 * sends a /dates request whose query carries a preview here (src/proxy.ts), so the canonical page's
 * tags never wait for a query. The page is the same page; only the preview tags differ, and this
 * address is never one to index (its canonical is /dates).
 */
export async function generateMetadata({ params, searchParams }: PageProps<"/[currency]/[locale]/dates/shared">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dates.meta" });
  const base: Metadata = { ...pageMetadata({ locale, path: "/dates", title: t("title"), description: t("description") }), robots: { index: false, follow: true } };
  // A shared place's link carries its photograph and its name for the preview (lib/share/links.ts);
  // the page opens that place's sheet once the search finds it.
  const at = firstParams(await searchParams);
  const preview = readSharePreview(at);
  if (!hasSharePreview(preview)) return base;
  const lat = Number(at.get("lat"));
  const lng = Number(at.get("lng"));
  const where: [string, string | null][] = at.get("lat") && at.get("lng") && isLatLng(lat, lng) ? [["lat", String(lat)], ["lng", String(lng)], ["q", shareTitle(at.get("q"))], ["place", readSharedPlace(at)]] : [];
  const title = preview.title ?? t("title");
  return withSharePreview(base, {
    url: `${localizedUrl(locale, "/dates")}${previewQuery({ ...preview, date: null }, where)}`,
    title,
    description: t("shared"),
    image: `${SITE.url}${shareCardPath({ kind: "place", locale: locale === "es" ? "es" : "en", cover: preview.cover, title: preview.title })}`,
    alt: title,
  });
}

export default function SharedDatesPage({ params }: PageProps<"/[currency]/[locale]/dates/shared">) {
  return <DatesPage params={params} />;
}
