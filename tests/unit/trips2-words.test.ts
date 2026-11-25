import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { cityName } from "@/lib/cities/cities";
import { formatFlightTime } from "@/lib/trips/flights";
import { BUDGET_KEY, budgetValues } from "@/lib/trips/day-costs";
import { ideaTrips, TRIP_IDEA_KINDS } from "@/lib/trips/idea-kinds";
import { monthRanges } from "@/lib/trips/months";
import { originCards, TRIP_ORIGINS, type OriginTrip } from "@/lib/trips/origins";
import { tripCarHire, tripTickets } from "@/lib/trips/partners";
import { getTrip, stopName, TRIPS, type Trip } from "@/lib/trips/presets";
import { tripStopCities } from "@/lib/trips/cities";
import { tripLead } from "@/lib/trips/trip-lead";
import { fill, TRIP_ORIGIN_COPY, TRIP_ORIGIN_UI } from "@/content/trip-origins";
import { TRIP_IDEA_COPY, TRIP_IDEAS_UI } from "@/content/trip-ideas";

/**
 * "The word count of every page named here" (BRIEF-trips2.md, Done means), worked out from the data
 * and the messages, so a longer trip or a longer line fails before a browser is opened. The pages
 * are counted in a browser too (tests/e2e/trips2.spec.ts, E16 to E20); this is the model of what
 * each shows without opening anything, as built.
 */
const LANGS = ["en", "es"] as const;
const M = { en, es };
const count = (...parts: string[]) => parts.join(" ").split(/\s+/).filter(Boolean).length;
/** An ICU plural with `#`, `=0`, `one` and `other`, as next-intl fills it. */
function plural(message: string, n: number): string {
  const pick = (key: string) => message.match(new RegExp(`${key} \\{([^}]*)\\}`))?.[1];
  return (pick(`=${n}`) ?? (n === 1 ? pick("one") : undefined) ?? pick("other") ?? "").replace("#", String(n));
}

/** A trip's page with every row closed and the first day open. The map's own words (its pins, MapLibre's line) are left for the browser. */
function tripPageWords(trip: Trip, l: "en" | "es"): number {
  const t = M[l].trips;
  const a = M[l].affiliate;
  const d = t.detail;
  const cities = tripStopCities(trip);
  const v = budgetValues(trip.budget, "eur", l);
  const hero = [
    d.back,
    t.kind[trip.kind],
    trip.title[l],
    tripLead(trip.blurb[l]).lead,
    d.facts.days,
    plural(t.days, trip.days),
    d.facts.best,
    monthRanges(trip.bestMonths, l),
    d.facts.budget,
    t.budget.short[BUDGET_KEY[trip.budget]].replace("{amount}", v.amount).replace("{range}", v.range),
    d.surprise.cta,
    M[l].savedDates.save.trip.cta,
    d.share.cta,
  ];
  const route = [d.route.eyebrow, d.route.title, ...trip.stops.flatMap((s, i) => [stopName(s, l), plural(d.route.nights, s.nights), cities[i] ? d.route.cityDates.replace("{city}", cityName(cities[i]!, l)) : d.route.datesHere])];
  const more = tripLead(trip.blurb[l]).rest ? [d.about] : [];
  const [first, ...others] = trip.plan;
  const plan = [d.plan.eyebrow, d.plan.title, d.plan.day.replace("{n}", "1"), first.title[l], ...first.items[l], ...others.flatMap((day) => [d.plan.day.replace("{n}", String(day.day)), day.title[l]])];
  const book = [d.flights.eyebrow, d.book.title, d.flights.title.replace("{city}", "City"), ...(tripTickets(trip.id).length ? [a.tickets.title] : []), ...(tripCarHire(trip) ? [a.car.title] : [])];
  const band = [d.surprise.title, d.surprise.cta, d.surprise.anyGift];
  return count(...hero, ...route, ...more, ...plan, ...book, ...band);
}

function originPageWords(slug: string, l: "en" | "es"): number {
  const o = TRIP_ORIGINS.find((x) => x.slug === slug)!;
  const ui = TRIP_ORIGIN_UI[l];
  const t = M[l].trips;
  const city = o.name[l];
  const hero = getTrip(TRIP_ORIGIN_COPY[slug].hero)!;
  const label = (r: OriginTrip) => (r.home ? ui.home : r.train ? ui.train : fill(ui.air, { time: formatFlightTime(r.airMinutes ?? 0) }));
  const cards = originCards(o).flatMap((r) => {
    const trip = getTrip(r.id)!;
    return [label(r), trip.title[l], t.best.replace("{months}", monthRanges(trip.bestMonths, l))];
  });
  const foot = [ui.footLabel, ui.footHeading, ...TRIP_ORIGINS.filter((x) => x !== o).map((x) => x.name[l]), ...TRIP_IDEA_KINDS.map((k) => TRIP_IDEA_COPY[k].nav[l]), fill(ui.dates, { city }), fill(ui.all, { count: TRIPS.length }), ui.hoursSummary];
  return count(t.detail.back, t.eyebrow, fill(ui.heading, { count: TRIPS.length, city }), TRIP_ORIGIN_COPY[slug].line[l], TRIP_ORIGIN_COPY[slug].sentence[l], ui.button, hero.title[l], ui.listLabel, ui.listHeading, ui.listLine, ...cards, fill(ui.rest, { rest: 6 }), ...foot);
}

function kindPageWords(kind: (typeof TRIP_IDEA_KINDS)[number], l: "en" | "es"): number {
  const c = TRIP_IDEA_COPY[kind];
  const ui = TRIP_IDEAS_UI[l];
  const t = M[l].trips;
  const trips = ideaTrips(kind);
  const cards = trips.flatMap((trip) => [t.best.replace("{months}", monthRanges(trip.bestMonths, l)), trip.title[l], c.fits[trip.id][l]]);
  const foot = [ui.footLabel, ui.footHeading, ...TRIP_IDEA_KINDS.filter((k) => k !== kind).map((k) => TRIP_IDEA_COPY[k].nav[l]), fill(ui.all, { count: TRIPS.length }), ui.from, ...TRIP_ORIGINS.map((o) => o.name[l]), c.whySummary[l]];
  return count(t.detail.back, t.eyebrow, c.heading[l], c.line[l], c.sentence[l], TRIP_ORIGIN_UI[l].button, getTrip(c.hero)!.title[l], c.listLabel[l], fill(c.listHeading[l], { count: trips.length }), ui.listLine, ...cards, ...foot);
}

describe("the words on every page of the trips room", () => {
  it("W1 a trip's page, folded, is within 285 words for every trip in both languages", () => {
    for (const trip of TRIPS) for (const l of LANGS) expect(tripPageWords(trip, l), `${trip.id} ${l}`).toBeLessThanOrEqual(285);
  });

  it("W2 only the first day is counted whole", () => {
    for (const trip of TRIPS) for (const l of LANGS) expect(count(trip.plan[0].title[l], ...trip.plan[0].items[l]), `${trip.id} ${l}`).toBeLessThanOrEqual(100);
  });

  it("W3 an origin page's words are within 250", () => {
    for (const o of TRIP_ORIGINS) for (const l of LANGS) expect(originPageWords(o.slug, l), `${o.slug} ${l}`).toBeLessThanOrEqual(250);
  });

  it("W4 a kind page's words are within 230", () => {
    for (const k of TRIP_IDEA_KINDS) for (const l of LANGS) expect(kindPageWords(k, l), `${k} ${l}`).toBeLessThanOrEqual(230);
  });

  it("W5 the lines a section's left column says are 14 words at most", () => {
    for (const l of LANGS) {
      expect(count(TRIP_ORIGIN_UI[l].listLine), l).toBeLessThanOrEqual(14);
      expect(count(TRIP_IDEAS_UI[l].listLine), l).toBeLessThanOrEqual(14);
      expect(count(M[l].trips.match.line), l).toBeLessThanOrEqual(14);
    }
  });

  it("W6 the new lines of the old pages are one line", () => {
    for (const l of LANGS) {
      expect(count(M[l].trips.sub), l).toBeLessThanOrEqual(14);
      expect(count(M[l].ldr.sub), l).toBeLessThanOrEqual(14);
    }
    // A flight search, never flights: the site sells no travel (docs/MONETIZATION.md).
    expect(M.en.trips.sub).toContain("a flight search");
    expect(M.es.trips.sub).toContain("un buscador de vuelos");
  });

  it("W8 a trip's hero line is about the trip, never about this site", () => {
    for (const trip of TRIPS) {
      for (const l of LANGS) {
        const { lead } = tripLead(trip.blurb[l]);
        expect(lead, `${trip.id} ${l}`).not.toMatch(/this site|esta web|ethos/i);
        expect(count(lead), `${trip.id} ${l}`).toBeGreaterThanOrEqual(7);
      }
    }
    const baltic = TRIPS.find((t) => t.id === "baltic-coast")!;
    for (const l of LANGS) {
      const { lead } = tripLead(baltic.blurb[l]);
      expect(count(lead), l).toBeLessThanOrEqual(24);
      for (const place of ["Riga", "Gauja", "Tallin"]) expect(lead, `${l} ${place}`).toContain(place);
    }
  });

  it("W7 a card's name is a name", () => {
    for (const trip of TRIPS) for (const l of LANGS) expect(count(trip.title[l]), `${trip.id} ${l}`).toBeLessThanOrEqual(9);
  });
});
