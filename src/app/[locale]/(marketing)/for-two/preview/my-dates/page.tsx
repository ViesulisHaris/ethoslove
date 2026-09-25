import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ClientMessages } from "@/i18n/client-messages";
import { currencyFor } from "@/lib/pricing/products";
import { MyDatesGrid } from "@/components/saved-dates/my-dates-grid";
import { isMyDatesPreviewState, previewSavedDates } from "@/components/saved-dates/preview-fixtures";
import { tripCovers } from "@/components/saved-dates/trip-covers";

export const metadata: Metadata = { robots: { index: false } };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Development only: My dates in each of its states (?state=empty|free|free-full|member|ended,
 * ?subscriptions=on for the monthly price in the upsell), for screenshots and the e2e tests, which
 * may never sign in (the dev server's database is production). What the grid then asks
 * /api/saved-dates for, a test answers itself. NODE_ENV is inlined at build: in production this
 * page is a 404.
 */
export default async function MyDatesPreviewPage({ params, searchParams }: PageProps<"/[locale]/for-two/preview/my-dates">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const state = one(query.state);
  if (!isMyDatesPreviewState(state)) notFound();
  const l = locale === "es" ? "es" : "en";
  return (
    <ClientMessages scope="(marketing)/for-two/preview/my-dates/page" locale={locale}>
      <div className="pt-16">
        <MyDatesGrid initial={previewSavedDates(state)} monthly={one(query.subscriptions) === "on"} currency={currencyFor(l === "es" ? "ES" : "US")} trips={tripCovers(l)} />
      </div>
    </ClientMessages>
  );
}
