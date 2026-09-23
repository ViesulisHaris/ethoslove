import { addDays, isYmd, weekdayOf } from "@/lib/dates/calendar";
import type { Airport } from "./airports";
import { aviasalesSearch, PARTNER_NAMES, type PartnerId } from "./partners";

/**
 * Flights, without selling any. We have no fares and want no API key: these are links that open
 * the search already filled in, in a new tab, and the prices are theirs. Aviasales comes first
 * because it is the one that pays us (see partners.ts); Google Flights, Skyscanner and Kayak are
 * the three people actually compare on, and they stay whether or not they ever pay. Everything
 * here is a pure function of the two airports and the dates, so the same trip always makes the
 * same links.
 */
export type FlightSite = "aviasales" | "google" | "skyscanner" | "kayak";
/** `partner` is set on a link that earns, which the page marks as sponsored and counts. */
export type FlightLink = { id: FlightSite; name: string; url: string; partner?: PartnerId };

export type FlightQuery = {
  from: Airport;
  to: Airport;
  /** "YYYY-MM-DD". Anything else is treated as no date at all. */
  depart?: string;
  back?: string;
  adults?: number;
  locale: "en" | "es";
};

export const MIN_ADULTS = 1;
export const MAX_ADULTS = 4;
/** Cruising speed, door to door on a map; the half hour covers taxiing, climbing and coming down. */
const CRUISE_KMH = 780;
const GROUND_MINUTES = 35;
/** Closer than this, a train from centre to centre usually beats the airport run. */
const TRAIN_KM = 600;
/** A search with no dates finds no fares, so every link starts on a long weekend this far out. */
const WEEKS_AHEAD = 3;
const FRIDAY = 5;
/** Friday to Monday. */
const WEEKEND_NIGHTS = 3;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const isoDay = (d?: string) => (d && ISO_DAY.test(d) ? d : undefined);
const yymmdd = (d: string) => d.slice(2).replaceAll("-", "");
const adultsOf = (n: number | undefined) => Math.min(MAX_ADULTS, Math.max(MIN_ADULTS, Math.round(n ?? 2)));
/** Where there is more than one airport worth searching, the code that means all of them. */
const cityCode = (a: Airport) => a.metro ?? a.iata;
/**
 * Skyscanner doesn't take IATA's city codes: its "every airport in London" is `lond`, not `lon`
 * (its own route pages use these, e.g. skyscanner.net/routes/lond/pari/). One for each metro
 * code in the airport table; an airport code on its own is the same on both.
 */
const SKYSCANNER_CITY: Record<string, string> = {
  LON: "lond",
  PAR: "pari",
  ROM: "rome",
  MIL: "mila",
  STO: "stoc",
  NYC: "nyca",
  CHI: "chia",
  WAS: "wasa",
  HOU: "houa",
  YTO: "ytoa",
  TYO: "tyoa",
  OSA: "osaa",
  SEL: "sela",
  BJS: "bjsa",
  BUE: "buea",
  SAO: "saoa",
  RIO: "rioa",
};
const skyscannerCode = (a: Airport) => (a.metro && SKYSCANNER_CITY[a.metro]) || a.iata.toLowerCase();

/**
 * Where a partner id for the three comparison sites would go once there is one; Aviasales already
 * has its own (partners.ts). Nothing is added today, and nothing needs to be configured for the
 * links to work. Skyscanner's programme runs through Impact, which gives a tracking link that
 * wraps the search URL (https://skyscanner.pxf.io/c/<id>/...?u=<url>); a Travelpayouts partner adds
 * `marker=<id>` to the links of the programmes it resells (Kayak is one). Google Flights has no
 * programme. When an id arrives, it is read here and nowhere else.
 */
export function withPartner(_site: Exclude<FlightSite, "aviasales">, url: string): string {
  return url;
}

function googleUrl({ from, to, depart, back, locale }: FlightQuery): string {
  // English words are understood whatever the interface language; `hl` sets the language of the page.
  const out = isoDay(depart);
  const home = out ? isoDay(back) : undefined;
  const q = [`Flights from ${from.city} to ${to.city}`, out ? `on ${out}` : "", home ? `through ${home}` : ""].filter(Boolean).join(" ");
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}&hl=${locale}`;
}

function skyscannerUrl({ from, to, depart, back, adults }: FlightQuery): string {
  const out = isoDay(depart);
  const home = out ? isoDay(back) : undefined;
  const dates = out ? `${yymmdd(out)}/${home ? `${yymmdd(home)}/` : ""}` : "";
  const params = new URLSearchParams({ adultsv2: String(adultsOf(adults)), cabinclass: "economy", rtn: home ? "1" : "0" });
  return `https://www.skyscanner.net/transport/flights/${skyscannerCode(from)}/${skyscannerCode(to)}/${dates}?${params}`;
}

function kayakUrl({ from, to, depart, back, adults }: FlightQuery): string {
  const out = isoDay(depart);
  const home = out ? isoDay(back) : undefined;
  const dates = out ? `${out}/${home ? `${home}/` : ""}` : "";
  return `https://www.kayak.com/flights/${cityCode(from)}-${cityCode(to)}/${dates}${adultsOf(adults)}adults`;
}

function aviasalesUrl({ from, to, depart, back, adults }: FlightQuery): string {
  return aviasalesSearch({ from: cityCode(from), to: cityCode(to), depart: isoDay(depart), back: isoDay(back), adults: adultsOf(adults) });
}

/** The same search on Aviasales, Google Flights, Skyscanner and Kayak, in that order. */
export function flightLinks(query: FlightQuery): FlightLink[] {
  return [
    { id: "aviasales", name: PARTNER_NAMES.aviasales, url: aviasalesUrl(query), partner: "aviasales" },
    { id: "google", name: "Google Flights", url: withPartner("google", googleUrl(query)) },
    { id: "skyscanner", name: "Skyscanner", url: withPartner("skyscanner", skyscannerUrl(query)) },
    { id: "kayak", name: "Kayak", url: withPartner("kayak", kayakUrl(query)) },
  ];
}

/** Roughly how long in the air, in minutes, to the nearest five. Always shown as "about". */
export function estimateFlight(km: number): number {
  const minutes = (Math.max(0, km) / CRUISE_KMH) * 60 + GROUND_MINUTES;
  return Math.max(GROUND_MINUTES, Math.round(minutes / 5) * 5);
}

/** "3 h 10 min", "45 min", "2 h": the same in both languages. */
export function formatFlightTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Near enough that a train might be the nicer way to go. */
export const trainHint = (km: number): boolean => km < TRAIN_KM;

/**
 * The dates every flight link starts with until they pick their own: the first Friday at least
 * three weeks after `today`, back on the Monday. `today` is the visitor's own "YYYY-MM-DD", so
 * this is only ever asked in the browser; a server's today can be a different day.
 */
export function weekendAhead(today: string): { depart: string; back: string } | null {
  if (!isYmd(today)) return null;
  const soonest = addDays(today, WEEKS_AHEAD * 7);
  const depart = addDays(soonest, (FRIDAY - weekdayOf(soonest) + 7) % 7);
  return { depart, back: addDays(depart, WEEKEND_NIGHTS) };
}

const DAY_MS = 86_400_000;

/**
 * The dates after they pick a new departure. With the return filled in from the start, a
 * departure past it is the usual case, not a mistake: the return moves with it and the trip keeps
 * its length, where dropping it would quietly turn every search one way.
 */
export function withDepart(dates: { depart: string; back: string }, depart: string): { depart: string; back: string } {
  if (!isYmd(depart) || !isYmd(dates.back) || dates.back >= depart) return { depart, back: dates.back };
  // "YYYY-MM-DD" parses as UTC midnight, so the difference is whole days whatever the clocks do.
  const nights = isYmd(dates.depart) && dates.back > dates.depart ? Math.round((Date.parse(dates.back) - Date.parse(dates.depart)) / DAY_MS) : 0;
  return { depart, back: nights > 0 ? addDays(depart, nights) : "" };
}
