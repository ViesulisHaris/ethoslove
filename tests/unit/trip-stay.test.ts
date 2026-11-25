import { describe, expect, it } from "vitest";
import { getTrip, TRIPS } from "@/lib/trips/presets";
import { weekendAhead } from "@/lib/trips/flights";
import { stayDates, stayLink, stayPartnerId, tripNights, tripStays, TRIP_STAYS } from "@/lib/trips/stay";

// The same as tests/unit/trips.test.ts.
const SPAIN = /\b(spain|españa|espana|spanish|madrid|barcelona|sevilla|seville|valencia|málaga|malaga|bilbao|mallorca|ibiza|canarias|canary)\b/i;
const ALFAMA = { query: "Alfama, Lisbon", lat: 38.7118, lng: -9.1284, locale: "en" as const };

describe("a place to stay at a trip's stop", () => {
  it("S1 without an id it is Booking's own search, for two, unpaid", () => {
    expect(stayLink(ALFAMA, null)).toEqual({ url: "https://www.booking.com/searchresults.html?ss=Alfama%2C+Lisbon&group_adults=2&no_rooms=1&lang=en-us", sponsored: false });
  });

  it("S2 it carries the nights when it has the days", () => {
    expect(stayLink({ ...ALFAMA, checkin: "2026-12-18", checkout: "2026-12-20" }, null).url).toMatch(/&checkin=2026-12-18&checkout=2026-12-20$/);
    for (const q of [{ checkin: "2026-12-18" }, { checkout: "2026-12-20" }, { checkin: "18/12/2026", checkout: "2026-12-20" }]) {
      const url = stayLink({ ...ALFAMA, ...q }, null).url;
      expect(url).not.toContain("checkin");
      expect(url).not.toContain("checkout");
    }
  });

  it("S3 with an id it is Stay22's link to the same search, and says it earns", () => {
    const link = stayLink(ALFAMA, "ethos22");
    const url = new URL(link.url);
    expect(url.host).toBe("www.stay22.com");
    expect(url.pathname).toBe("/allez/booking");
    expect(Object.fromEntries(url.searchParams)).toEqual({ aid: "ethos22", address: "Alfama, Lisbon", lat: "38.7118", lng: "-9.1284", adults: "2", campaign: "trip_stay", lang: "en" });
    expect(link.sponsored).toBe(true);
  });

  it("S4 in Spanish it asks in Spanish", () => {
    expect(new URL(stayLink({ ...ALFAMA, locale: "es" }, null).url).searchParams.get("lang")).toBe("es");
    expect(new URL(stayLink({ ...ALFAMA, locale: "es" }, "ethos22").url).searchParams.get("lang")).toBe("es");
  });

  it("S5 the id comes from one variable and nothing else, and a bad one is no id", () => {
    expect(stayPartnerId({})).toBeNull();
    for (const bad of ["", "   ", "a b", "x", "a".repeat(65)]) expect(stayPartnerId({ STAY22_AID: bad }), JSON.stringify(bad)).toBeNull();
    expect(stayPartnerId({ STAY22_AID: " ethos22 " })).toBe("ethos22");
    expect(stayPartnerId({ STAY22_ID: "ethos22", NEXT_PUBLIC_STAY22_AID: "ethos22" })).toBeNull();
  });

  it("S6 every stop a trip sleeps in has its search, and no other stop has one", () => {
    let all = 0;
    for (const trip of TRIPS) {
      const sleeps = trip.stops.filter((s) => s.nights > 0).map((s) => s.name);
      expect(Object.keys(TRIP_STAYS[trip.id] ?? {}).sort(), trip.id).toEqual([...sleeps].sort());
      all += sleeps.length;
    }
    expect(all).toBe(34);
    expect(Object.keys(TRIP_STAYS).sort()).toEqual(TRIPS.map((t) => t.id).sort());
  });

  it("S7 the nights fall where the plan puts them", () => {
    const baltic = getTrip("baltic-coast")!;
    expect(tripStays(baltic).map((s) => [s.stop, s.nightsBefore, s.nights])).toEqual([
      ["Riga", 0, 2],
      ["Sigulda", 2, 1],
      ["Cēsis", 3, 1],
      ["Pärnu", 4, 1],
      ["Tallinn", 5, 1],
    ]);
    expect(stayDates("2026-12-18", 2, 1)).toEqual({ checkin: "2026-12-20", checkout: "2026-12-21" });
    expect(stayDates("soon", 0, 1)).toBeNull();
    for (const trip of TRIPS) {
      const stays = tripStays(trip);
      const last = stays[stays.length - 1];
      expect(last.nightsBefore + last.nights, trip.id).toBe(trip.days - 1);
    }
  });

  it("S8 no search names Spain", () => {
    for (const stops of Object.values(TRIP_STAYS)) for (const q of Object.values(stops)) expect(q).not.toMatch(SPAIN);
  });
  it("S9 every place to stay falls between the trip page's two flights", () => {
    for (const today of ["2026-11-25", "2027-02-26", "2027-06-30"]) {
      for (const trip of TRIPS) {
        const nights = tripNights(trip);
        expect(nights, trip.id).toBe(trip.days - 1);
        const flights = weekendAhead(today, nights)!;
        for (const stay of tripStays(trip)) {
          const d = stayDates(flights.depart, stay.nightsBefore, stay.nights)!;
          expect(d.checkin >= flights.depart, `${trip.id} ${stay.stop}`).toBe(true);
          expect(d.checkout <= flights.back, `${trip.id} ${stay.stop} ${d.checkout} after ${flights.back}`).toBe(true);
        }
        expect(stayDates(flights.depart, 0, nights)!.checkout, trip.id).toBe(flights.back);
      }
    }
    // Elsewhere the search is still a long weekend.
    expect(weekendAhead("2026-09-23")).toEqual({ depart: "2026-10-16", back: "2026-10-19" });
    expect(weekendAhead("2026-09-23", 0)).toEqual({ depart: "2026-10-16", back: "2026-10-19" });
  });
});
