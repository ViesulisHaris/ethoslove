import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { addDays, weekdayOf } from "@/lib/dates/calendar";
import { findAirport, type Airport } from "@/lib/trips/airports";
import { flightLinks, weekendAhead, withDepart } from "@/lib/trips/flights";
import { autoEuropeHire, aviasalesSearch, tiqetsSearch, tripCarHire, tripTickets, viaPartner } from "@/lib/trips/partners";
import { TRIPS } from "@/lib/trips/presets";

const airport = (code: string): Airport => {
  const a = findAirport(code);
  if (!a) throw new Error(`no airport ${code}`);
  return a;
};
/** The page a partner link lands on, out of our short link. */
const target = (url: string) => new URL(url).searchParams.get("u") ?? "";
const strings = (v: unknown): string[] => (typeof v === "string" ? [v] : v && typeof v === "object" ? Object.values(v).flatMap(strings) : []);
const SPAIN = /\b(spain|españa|espana|spanish|madrid|barcelona|sevilla|seville|valencia|málaga|malaga|bilbao|mallorca|ibiza|canarias|canary)\b/i;

describe("the weekend every flight link starts with", () => {
  it("is the first Friday at least three weeks away, back on the Monday", () => {
    // Wednesday 23 September 2026.
    expect(weekendAhead("2026-09-23")).toEqual({ depart: "2026-10-16", back: "2026-10-19" });
    // A Friday: exactly three weeks on.
    expect(weekendAhead("2026-09-25")).toEqual({ depart: "2026-10-16", back: "2026-10-19" });
    // A Saturday: that Friday is only twenty days away, so the one after.
    expect(weekendAhead("2026-09-26")).toEqual({ depart: "2026-10-23", back: "2026-10-26" });
  });

  it("crosses months, years and the clocks going forward", () => {
    expect(weekendAhead("2026-10-09")).toEqual({ depart: "2026-10-30", back: "2026-11-02" });
    expect(weekendAhead("2026-12-10")).toEqual({ depart: "2027-01-01", back: "2027-01-04" });
    // Europe's clocks go forward on 28 March 2027, between the Friday and the Monday.
    expect(weekendAhead("2027-03-05")).toEqual({ depart: "2027-03-26", back: "2027-03-29" });
    expect(weekendAhead("2028-02-05")).toEqual({ depart: "2028-03-03", back: "2028-03-06" });
  });

  it("is always a Friday 21 to 27 days out and a Monday three nights later, every day of a year", () => {
    for (let i = 0; i < 366; i++) {
      const today = addDays("2026-01-01", i);
      const w = weekendAhead(today)!;
      expect(weekdayOf(w.depart), today).toBe(5);
      expect(weekdayOf(w.back), today).toBe(1);
      expect(addDays(w.depart, 3)).toBe(w.back);
      const days = Math.round((Date.parse(w.depart) - Date.parse(today)) / 86_400_000);
      expect(days, today).toBeGreaterThanOrEqual(21);
      expect(days, today).toBeLessThanOrEqual(27);
    }
  });

  it("moves with a later departure instead of turning the search one way", () => {
    const weekend = { depart: "2026-10-16", back: "2026-10-19" };
    // Past the Monday: same three nights from the new Friday, across the clocks going back.
    expect(withDepart(weekend, "2026-10-23")).toEqual({ depart: "2026-10-23", back: "2026-10-26" });
    expect(withDepart(weekend, "2027-03-26")).toEqual({ depart: "2027-03-26", back: "2027-03-29" });
    // Still before the return, or on it: the return stays where it is.
    expect(withDepart(weekend, "2026-10-17")).toEqual({ depart: "2026-10-17", back: "2026-10-19" });
    expect(withDepart(weekend, "2026-10-19")).toEqual({ depart: "2026-10-19", back: "2026-10-19" });
    // Clearing the departure keeps the return; with no return it stays one way.
    expect(withDepart(weekend, "")).toEqual({ depart: "", back: "2026-10-19" });
    expect(withDepart({ depart: "2026-10-16", back: "" }, "2026-11-01")).toEqual({ depart: "2026-11-01", back: "" });
    // A return with no departure to measure from can't keep a length, so it goes.
    expect(withDepart({ depart: "", back: "2026-10-19" }, "2026-11-01")).toEqual({ depart: "2026-11-01", back: "" });
  });

  it("is nothing for a day that isn't one", () => {
    expect(weekendAhead("")).toBeNull();
    expect(weekendAhead("23/09/2026")).toBeNull();
    expect(weekendAhead("2026-02-30")).toBeNull();
  });
});

describe("Aviasales", () => {
  it("is the first flight link, a search already run through our short link", () => {
    const [first] = flightLinks({ from: airport("RIX"), to: airport("LIS"), depart: "2026-10-16", back: "2026-10-19", locale: "en" });
    expect(first).toMatchObject({ id: "aviasales", partner: "aviasales" });
    expect(first.url.startsWith("https://aviasales.tpm.lv/DHecFLiz?u=")).toBe(true);
    expect(target(first.url)).toBe("https://www.aviasales.com/search/RIX1610LIS19102");
  });

  it("searches every airport in a city that has more than one", () => {
    const [first] = flightLinks({ from: airport("London"), to: airport("Paris"), depart: "2026-10-16", locale: "en" });
    expect(target(first.url)).toBe("https://www.aviasales.com/search/LON1610PAR2");
  });

  it("takes the same number of travellers as the finder, one to four", () => {
    expect(target(flightLinks({ from: airport("RIX"), to: airport("LIS"), depart: "2026-10-16", adults: 1, locale: "en" })[0].url)).toMatch(/1610LIS1$/);
    expect(target(flightLinks({ from: airport("RIX"), to: airport("LIS"), depart: "2026-10-16", adults: 9, locale: "en" })[0].url)).toMatch(/1610LIS4$/);
  });

  it("opens its home page, with our id, when there is no date to search", () => {
    expect(target(flightLinks({ from: airport("RIX"), to: airport("LIS"), locale: "en" })[0].url)).toBe("https://www.aviasales.com/");
    expect(target(aviasalesSearch({ from: "RIX", to: "LIS", back: "2026-10-19" }))).toBe("https://www.aviasales.com/");
  });
});

describe("partner links", () => {
  it("wrap the partner's own page in our short link", () => {
    expect(viaPartner("tiqets", "https://www.tiqets.com/en/")).toBe("https://tiqets.tpm.lv/6ik2vRS7?u=https%3A%2F%2Fwww.tiqets.com%2Fen%2F");
  });

  it("search Tiqets in the visitor's language", () => {
    expect(target(tiqetsSearch("Prague Castle", "en"))).toBe("https://www.tiqets.com/en/search?q=Prague%20Castle");
    expect(target(tiqetsSearch("Prague Castle", "es"))).toBe("https://www.tiqets.com/es/search?q=Prague%20Castle");
  });

  it("send car hire to a country's page only where Auto Europe has one", () => {
    expect(target(autoEuropeHire("car-rental-italy"))).toBe("https://www.autoeurope.eu/car-rental-italy/");
    expect(target(autoEuropeHire())).toBe("https://www.autoeurope.eu/");
    expect(target(autoEuropeHire("../admin"))).toBe("https://www.autoeurope.eu/");
  });
});

describe("tickets on a trip's page", () => {
  it("are one to four for every trip", () => {
    // One is honest for Santorini and Naxos: Tiqets sells nothing else that plan goes to.
    for (const trip of TRIPS) {
      const tickets = tripTickets(trip.id);
      expect(tickets.length, trip.id).toBeGreaterThanOrEqual(1);
      expect(tickets.length, trip.id).toBeLessThanOrEqual(4);
    }
  });

  it("ask Tiqets for the names its search knows, not ones it answers with an empty page", () => {
    // Each of these found nothing, or the wrong place (St Peter's in Melaka), on 2026-09-23.
    const gone = /Turaida|Kadriorg|Rufolo|Westerkerk|St\. Peter's Church Riga|Český Krumlov Castle|wine tasting|Nyhavn|Urquhart/;
    for (const trip of TRIPS) for (const t of tripTickets(trip.id)) expect(t.query, trip.id).not.toMatch(gone);
    const landsOn = (id: string) => tripTickets(id).map((t) => target(tiqetsSearch(t.query, "es")));
    expect(landsOn("tuscany-hill-towns")).toContain("https://www.tiqets.com/es/search?q=Uffizi%20Gallery");
    expect(landsOn("baltic-coast")).toContain("https://www.tiqets.com/es/search?q=House%20of%20the%20Black%20Heads");
  });

  it("belong to one of the trip's own stops when they name one, and are named in both languages", () => {
    for (const trip of TRIPS) {
      for (const ticket of tripTickets(trip.id)) {
        if (ticket.stop) expect(trip.stops.map((s) => s.name), `${trip.id}: ${ticket.query}`).toContain(ticket.stop);
        expect(ticket.name.en.trim(), ticket.query).not.toBe("");
        expect(ticket.name.es.trim(), ticket.query).not.toBe("");
        expect(ticket.query.length, ticket.query).toBeLessThanOrEqual(100);
      }
      const queries = tripTickets(trip.id).map((t) => t.query);
      expect(new Set(queries).size, trip.id).toBe(queries.length);
    }
  });

  it("are none for a trip we don't know", () => {
    expect(tripTickets("nowhere")).toEqual([]);
  });

  it("never mention Spain", () => {
    for (const trip of TRIPS) for (const t of tripTickets(trip.id)) for (const text of [t.name.en, t.name.es, t.query]) expect(text).not.toMatch(SPAIN);
  });
});

describe("car hire on a trip's page", () => {
  it("is offered on every road trip and nowhere else", () => {
    for (const trip of TRIPS) {
      const link = tripCarHire(trip);
      if (trip.kind === "road") expect(link, trip.id).toMatch(/^https:\/\/autoeurope\.tpm\.lv\/6xALsrap\?u=/);
      else expect(link, trip.id).toBeNull();
    }
  });

  it("opens the country's page for Italy and Portugal, and the home page elsewhere", () => {
    const hire = (id: string) => target(tripCarHire(TRIPS.find((t) => t.id === id)!)!);
    expect(hire("amalfi-coast")).toBe("https://www.autoeurope.eu/car-rental-italy/");
    expect(hire("tuscany-hill-towns")).toBe("https://www.autoeurope.eu/car-rental-italy/");
    expect(hire("algarve-coast")).toBe("https://www.autoeurope.eu/car-rental-portugal/");
    expect(hire("scottish-highlands")).toBe("https://www.autoeurope.eu/");
    expect(hire("iceland-south-coast")).toBe("https://www.autoeurope.eu/");
    expect(hire("baltic-coast")).toBe("https://www.autoeurope.eu/");
  });
});

describe("what the partner buttons say", () => {
  it("say, in both languages, that we may earn and that it costs nothing extra", () => {
    expect(en.affiliate.disclosure).toBe("We may earn a commission if you book through some of these links. It costs you nothing extra.");
    expect(en.trips.flights.smallPrint).toContain("We may earn a commission if you book through some of these links. It costs you nothing extra.");
    for (const text of [es.affiliate.disclosure, es.affiliate.disclosureBoth, es.trips.flights.smallPrint]) {
      expect(text).toMatch(/comisión/);
      expect(text).toMatch(/no (te|os) cuesta nada más/);
    }
  });

  it("never claim we don't sell flights any more", () => {
    expect(en.trips.flights.smallPrint).not.toMatch(/don't sell/i);
    expect(es.trips.flights.smallPrint).not.toMatch(/no vendemos/i);
  });

  it("never mention Spain", () => {
    for (const text of [...strings(en.affiliate), ...strings(es.affiliate)]) expect(text).not.toMatch(SPAIN);
  });
});
