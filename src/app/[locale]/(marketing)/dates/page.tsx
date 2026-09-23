import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { CITY_PAGES } from "@/lib/cities/cities";
import { DatesExplorer } from "@/components/dates/dates-explorer";
import { CityLinks } from "@/components/cities/city-links";

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/dates">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dates.meta" });
  return pageMetadata({ locale, path: "/dates", title: t("title"), description: t("description") });
}

/**
 * Dates: where, when, ideas, a map. The page itself is static; everything that depends on who is
 * looking (their town, the day, the forecast) is worked out in the browser after it loads.
 */
export default async function DatesPage({ params }: PageProps<"/[locale]/dates">) {
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
