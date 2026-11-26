import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localizedUrl, pageMetadata, withSharePreview } from "@/lib/seo";
import { SITE } from "@/config/site";
import { isLatLng } from "@/lib/dates/geo";
import { firstParams, hasSharePreview, previewQuery, readSharedPlace, readSharePreview, shareCardPath, shareTitle } from "@/lib/share/links";
import { CITY_PAGES } from "@/lib/cities/cities";
import { DatesExplorer } from "@/components/dates/dates-explorer";
import { CityLinks } from "@/components/cities/city-links";
import { KindLinks } from "@/components/dates/page/kind-links";
import { DATE_KIND_UI } from "@/content/date-kinds";
import { FOR_VENUES, FOR_VENUES_PATH } from "@/content/for-venues";
import { Link } from "@/i18n/navigation";
import { LetterSlot } from "@/components/date-letter/letter-slot";

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
      <LetterSlot locale={locale} where="dates" />
      {/* Plain links in the page's HTML, so search engines find every city's page from here. On the
          page's grid, as on a city's page and the footer (walk-rooms-9). */}
      <div className="border-t border-line">
        <div className="container-x pt-8 pb-32 lg:pb-10">
          <KindLinks locale={locale === "es" ? "es" : "en"} title={DATE_KIND_UI[locale === "es" ? "es" : "en"].byKind} />
          <CityLinks cities={CITY_PAGES} locale={locale === "es" ? "es" : "en"} title={t("eyebrow")} className="pt-6" />
          {/* The one way to the page for venues: quiet, at the very foot (BRIEF-dates2.md 5). Remove this line to unlink it. */}
          <p className="-mx-1.5 pt-4">
            <Link href={FOR_VENUES_PATH} className="inline-flex min-h-11 items-center px-1.5 text-[14px] font-medium text-forest/75 underline-offset-4 hover:text-rose-deep hover:underline">
              {FOR_VENUES[locale === "es" ? "es" : "en"].label}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
