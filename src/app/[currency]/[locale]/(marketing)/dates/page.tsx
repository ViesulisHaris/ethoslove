import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localizedUrl, pageMetadata, withSharePreview } from "@/lib/seo";
import { SITE } from "@/config/site";
import { isLatLng } from "@/lib/dates/geo";
import { firstParams, hasSharePreview, previewQuery, readSharedPlace, readSharePreview, shareCardPath, shareTitle } from "@/lib/share/links";
import { CITY_PAGES } from "@/lib/cities/cities";
import { DatesExplorer } from "@/components/dates/dates-explorer";
import { CityLinks } from "@/components/cities/city-links";

export async function generateMetadata({ params, searchParams }: PageProps<"/[currency]/[locale]/dates">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dates.meta" });
  const base = pageMetadata({ locale, path: "/dates", title: t("title"), description: t("description") });
  // A shared place's link carries its photograph and its name for the preview (lib/share/links.ts);
  // the page is the same page, and opens that place's sheet once the search finds it.
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

/**
 * Dates: where, when, ideas, a map. The page's body is the same for everybody (only its preview
 * tags read the query, above); everything that depends on who is looking (their town, the day,
 * the forecast) is worked out in the browser after it loads.
 */
export default async function DatesPage({ params }: PageProps<"/[currency]/[locale]/dates">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "cities" });
  return (
    // Pulled up under the floating header: on a wide screen the map runs the full height of the window behind it.
    <div className="-mt-[var(--header-h)] min-h-dvh bg-blush-paper pt-[var(--header-h)] lg:pt-0">
      <DatesExplorer />
      {/* Plain links in the page's HTML, so search engines find every city's page from here. */}
      <CityLinks cities={CITY_PAGES} locale={locale === "es" ? "es" : "en"} title={t("eyebrow")} className="border-t border-line px-5 pt-8 pb-32 sm:px-8 lg:px-6 lg:pb-10" />
    </div>
  );
}
