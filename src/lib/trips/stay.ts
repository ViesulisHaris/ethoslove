import { addDays, isYmd } from "@/lib/dates/calendar";
import type { Trip } from "./presets";

/**
 * "Find a place to stay" under each stop a trip sleeps in: a hotel search for that place and its
 * nights. One function builds the link. Without a partner id it is Booking.com's own search,
 * unpaid and not marked sponsored; with `STAY22_AID` set it becomes Stay22's link to the same
 * search, which earns, is marked sponsored and carries the disclosure (docs/TRIPS.md, Partners).
 * Pure: safe in the browser, reads no window. The id is read on the server and handed down.
 */

/** Where the click lands, for the `affiliate_click` event. Not a `PartnerId`: those are Travelpayouts short links. */
export type StayPartner = "booking";
/** The one optional variable. Read on the server only; the page hands the id to the browser. */
export const STAY_ENV = "STAY22_AID";
export type StayQuery = { query: string; lat: number; lng: number; checkin?: string; checkout?: string; locale: "en" | "es" };
export type StayLink = { url: string; sponsored: boolean };

const ID = /^[A-Za-z0-9_-]{3,64}$/;

/** The partner id, or null when the variable is unset, empty or not an id (letters, digits, "-" and "_", 3 to 64). */
export function stayPartnerId(env: Record<string, string | undefined> = process.env): string | null {
  const id = env[STAY_ENV]?.trim();
  return id && ID.test(id) ? id : null;
}

/** The nights, only when both ends are days. */
function nights(q: StayQuery): [string, string][] {
  return isYmd(q.checkin) && isYmd(q.checkout) ? [["checkin", q.checkin], ["checkout", q.checkout]] : [];
}

/** One function builds the link. No id: Booking.com's own search. With one: Stay22's link to the same search, which earns. */
export function stayLink(q: StayQuery, partnerId: string | null): StayLink {
  if (!partnerId) {
    const params = new URLSearchParams([["ss", q.query], ["group_adults", "2"], ["no_rooms", "1"], ["lang", q.locale === "es" ? "es" : "en-us"], ...nights(q)]);
    return { url: `https://www.booking.com/searchresults.html?${params}`, sponsored: false };
  }
  // campaign names the placement, never a trip, a person or a gift (MONETIZATION M9).
  const params = new URLSearchParams([
    ["aid", partnerId],
    ["address", q.query],
    ["lat", q.lat.toFixed(4)],
    ["lng", q.lng.toFixed(4)],
    ["adults", "2"],
    ["campaign", "trip_stay"],
    ["lang", q.locale],
    ...nights(q),
  ]);
  return { url: `https://www.stay22.com/allez/booking?${params}`, sponsored: true };
}

/** The nights at one stop, counted from the trip's first day. Null when `depart` is not a day. */
export function stayDates(depart: string, nightsBefore: number, nights: number): { checkin: string; checkout: string } | null {
  if (!isYmd(depart)) return null;
  const checkin = addDays(depart, nightsBefore);
  return { checkin, checkout: addDays(checkin, nights) };
}

/**
 * What Booking is asked for each stop a trip sleeps in: `TRIP_STAYS[trip.id][stop.name]`. A town's
 * name alone finds the wrong Lagos and the wrong Glencoe, so each says where it is.
 */
export const TRIP_STAYS: Record<string, Record<string, string>> = {
  "lisbon-slow-weekend": { Alfama: "Alfama, Lisbon" },
  "amalfi-coast": { Naples: "Naples, Italy", Sorrento: "Sorrento, Italy", Positano: "Positano, Italy", Amalfi: "Amalfi, Italy" },
  "tuscany-hill-towns": { Florence: "Florence, Italy", "Greve in Chianti": "Greve in Chianti, Italy", Siena: "Siena, Italy", Montepulciano: "Montepulciano, Italy" },
  "paris-without-cliches": { "Canal Saint-Martin": "Canal Saint-Martin, Paris" },
  "scottish-highlands": { Edinburgh: "Edinburgh, Scotland", Pitlochry: "Pitlochry, Scotland", Glencoe: "Glencoe, Scotland", Portree: "Portree, Isle of Skye" },
  "iceland-south-coast": { "Reykjavík": "Reykjavik, Iceland", Seljalandsfoss: "Seljalandsfoss, Iceland", "Vík": "Vik i Myrdal, Iceland", "Jökulsárlón": "Jokulsarlon, Iceland" },
  "baltic-coast": { Riga: "Riga, Latvia", Sigulda: "Sigulda, Latvia", "Cēsis": "Cesis, Latvia", "Pärnu": "Parnu, Estonia", Tallinn: "Tallinn, Estonia" },
  "prague-krumlov-vienna": { Prague: "Prague, Czechia", "Český Krumlov": "Cesky Krumlov, Czechia", Vienna: "Vienna, Austria" },
  "santorini-naxos": { Oia: "Oia, Santorini", "Naxos Town": "Naxos Town, Naxos" },
  "copenhagen-hygge": { Christianshavn: "Christianshavn, Copenhagen" },
  "algarve-coast": { Tavira: "Tavira, Portugal", Benagil: "Benagil, Portugal", Lagos: "Lagos, Portugal", Sagres: "Sagres, Portugal" },
  "amsterdam-by-bike": { Jordaan: "Jordaan, Amsterdam" },
};

/** A trip's overnight stops, in route order, each with its query and where its nights fall. */
export function tripStays(trip: Pick<Trip, "id" | "stops">): { stop: string; query: string; lat: number; lng: number; nightsBefore: number; nights: number }[] {
  const queries = TRIP_STAYS[trip.id] ?? {};
  const out: { stop: string; query: string; lat: number; lng: number; nightsBefore: number; nights: number }[] = [];
  let before = 0;
  for (const s of trip.stops) {
    const query = queries[s.name];
    if (s.nights > 0 && query) out.push({ stop: s.name, query, lat: s.lat, lng: s.lng, nightsBefore: before, nights: s.nights });
    before += s.nights;
  }
  return out;
}
