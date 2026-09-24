import { isYmd } from "@/lib/dates/calendar";
import { distanceKm } from "@/lib/dates/geo";
import { findAirport, type Airport } from "@/lib/trips/airports";
import { estimateFlight, flightLinks, formatFlightTime, MAX_ADULTS, MIN_ADULTS, trainHint, type FlightLink } from "@/lib/trips/flights";

/**
 * GET /api/app/flights: the Trips flight finder's answer for two airports (IATA codes, metro codes
 * or city names, as findAirport reads them), worked out with the same pure functions the website's
 * finder uses, so the links and the "about 3 h 10 min" match to the letter. The dates are the
 * phone's own (its today is not the server's). Contract: Ethos app docs/ARCHITECTURE.md §2.6.4.
 */
export type AppFlights = { from: Airport; to: Airport; km: number; minutes: number; duration: string; trainHint: boolean; links: FlightLink[] };

export type AppFlightsError = "unknown_airport" | "same_airport";

export function appFlights(query: { from: string | null; to: string | null; depart?: string | null; back?: string | null; adults?: string | null; locale: "en" | "es" }): AppFlights | { error: AppFlightsError } {
  const from = findAirport((query.from ?? "").slice(0, 80));
  const to = findAirport((query.to ?? "").slice(0, 80));
  if (!from || !to) return { error: "unknown_airport" };
  if (from.iata === to.iata) return { error: "same_airport" };
  const depart = isYmd(query.depart) ? query.depart : undefined;
  // A return only goes with a departure, and never before it.
  const back = depart && isYmd(query.back) && query.back >= depart ? query.back : undefined;
  const asked = Number(query.adults ?? 2);
  const adults = Number.isFinite(asked) ? Math.min(MAX_ADULTS, Math.max(MIN_ADULTS, Math.round(asked))) : 2;
  const exact = distanceKm(from, to);
  const minutes = estimateFlight(exact);
  return {
    from,
    to,
    km: Math.round(exact),
    minutes,
    duration: formatFlightTime(minutes),
    trainHint: trainHint(exact),
    links: flightLinks({ from, to, depart, back, adults, locale: query.locale }),
  };
}
