import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { CITY_PAGES } from "@/lib/cities/cities";
import { DatesExplorer } from "@/components/dates/dates-explorer";
import { CityLinks } from "@/components/cities/city-links";
import { KindLinks } from "@/components/dates/page/kind-links";
import { DATE_KIND_UI } from "@/content/date-kinds";
import { FOR_VENUES, FOR_VENUES_PATH } from "@/content/for-venues";
import { Link } from "@/i18n/navigation";

/**
 * The page's own tags read nothing but its locale, so they are in the <head> of the HTML every
 * reader gets, a crawler that runs no JavaScript included (reports/seoaudit-audit.md, M2): when they
 * awaited the query, Next streamed them into the body, after the page. A link that carries a shared
 * place's preview (`?c=…&t=…`) is served by ./shared/page.tsx instead (src/proxy.ts), the same page
 * with that preview's tags.
 */
export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/dates">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dates.meta" });
  return pageMetadata({ locale, path: "/dates", title: t("title"), description: t("description") });
}

/**
 * Dates: where, when, ideas, a map. The page's body is the same for everybody (only a shared
 * link's preview tags read the query, in ./shared); everything that depends on who is looking (their town, the day,
 * the forecast) is worked out in the browser after it loads.
 */
export default async function DatesPage({ params }: Pick<PageProps<"/[currency]/[locale]/dates">, "params">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "cities" });
  return (
    // Pulled up under the floating header: on a wide screen the map runs the full height of the window behind it.
    <div className="-mt-[var(--header-h)] min-h-dvh bg-blush-paper pt-[var(--header-h)] lg:pt-0">
      <DatesExplorer />
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
