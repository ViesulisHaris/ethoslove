"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { useLocale } from "next-intl";
import { toYmd } from "@/lib/dates/calendar";
import { weekendAhead } from "@/lib/trips/flights";
import { stayDates, stayLink } from "@/lib/trips/stay";
import { PartnerLink } from "./partner-link";

type Props = { query: string; lat: number; lng: number; nightsBefore: number; nights: number; partnerId: string | null; trip: string; label?: string; className?: string; children: ReactNode };

const noop = () => () => {};
const localDay = () => toYmd(new Date());

/**
 * One stop's line in a trip's "Places to stay" row (under "Before you go"): a hotel search for that place and
 * its nights. The nights come from the visitor's own today, after hydration, exactly as the flight
 * search's weekend does (flight-finder.tsx): on the server and in the first render there is no day,
 * so the link has no dates and still works. The partner id was read on the server (stayPartnerId).
 */
export function StayLink({ query, lat, lng, nightsBefore, nights, partnerId, trip, label, className, children }: Props) {
  const locale = useLocale() === "es" ? "es" : "en";
  const today = useSyncExternalStore(noop, localDay, () => undefined);
  const depart = today ? weekendAhead(today)?.depart : undefined;
  const dates = depart ? stayDates(depart, nightsBefore, nights) : null;
  const link = stayLink({ query, lat, lng, locale, ...(dates ?? {}) }, partnerId);
  return (
    <PartnerLink partner="booking" placement="trip_stay" trip={trip} sponsored={link.sponsored} href={link.url} aria-label={label} data-testid="trip-stay" className={className}>
      {children}
    </PartnerLink>
  );
}
