import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isConfigured } from "@/lib/env";
import { currencyFor, FREE_SAVED_DATES, subscriptionsEnabled } from "@/lib/pricing/products";
import { CoupleUnavailable } from "@/lib/saved-dates/couple";
import { listSavedDates, SavedStoreError, savedDatesSession } from "@/lib/saved-dates/server";
import type { SavedDatesList } from "@/lib/saved-dates/types";
import { cityName, findAirport } from "@/lib/trips/airports";
import { TRIPS, tripImageSm, tripSrcSet } from "@/lib/trips/presets";
import { NotConnected } from "@/components/app/not-connected";
import { MyDatesGrid } from "@/components/saved-dates/my-dates-grid";
import type { TripCover } from "@/components/saved-dates/saved-date-card";

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/my-dates">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "savedDates.meta" });
  return { title: t("title"), robots: { index: false } };
}

/** What a trip's card shows, in the reader's language. Every trip, not only the saved ones: a list reloaded in the browser may hold one saved since. */
function tripCovers(locale: "en" | "es"): Record<string, TripCover> {
  return Object.fromEntries(
    TRIPS.map((trip) => {
      const airport = findAirport(trip.flyTo);
      const image = trip.image ?? "";
      return [trip.id, { title: trip.title[locale], where: airport ? cityName(airport, locale) : null, days: trip.days, src: image ? tripImageSm(image) : "", srcSet: image ? tripSrcSet(image) : "", from: trip.art.from, to: trip.art.to }];
    }),
  );
}

const EMPTY: SavedDatesList = { items: [], quota: { used: 0, limit: FREE_SAVED_DATES }, member: false, partner: null };

/**
 * My dates: the dates and trips saved to this account, and the partner's while they share Ethos for
 * Two. The (app) layout has already sent anyone signed out to sign in. The first page is drawn here
 * from the same rules as GET /api/saved-dates; the grid takes over in the browser.
 */
export default async function MyDatesPage({ params }: PageProps<"/[locale]/my-dates">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = locale === "es" ? "es" : "en";
  if (!isConfigured.supabase) return <NotConnected />;

  let initial: SavedDatesList | null = null;
  const session = await savedDatesSession();
  if ("deps" in session) {
    try {
      initial = await listSavedDates(session.deps);
    } catch (error) {
      if (!(error instanceof SavedStoreError || error instanceof CoupleUnavailable)) throw error;
      // Said on the page, with a way to try again, rather than shown as "nothing saved".
      console.error(`[my-dates] ${error.message}`);
    }
  }

  return <MyDatesGrid initial={initial ?? EMPTY} failed={initial === null} monthly={subscriptionsEnabled()} currency={currencyFor(l === "es" ? "ES" : "US")} trips={tripCovers(l)} />;
}
