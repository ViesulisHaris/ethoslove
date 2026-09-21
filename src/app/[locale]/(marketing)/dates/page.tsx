import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { DatesExplorer } from "@/components/dates/dates-explorer";

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
  return (
    // Pulled up under the floating header: on a wide screen the map runs the full height of the window behind it.
    <div className="-mt-[var(--header-h)] min-h-dvh bg-[#FBF1EC] pt-[var(--header-h)] lg:pt-0">
      <DatesExplorer />
    </div>
  );
}
