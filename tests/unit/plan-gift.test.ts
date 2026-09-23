import { describe, expect, it } from "vitest";
import type { Plan, PlanStop } from "@/lib/dates/plan";
import { planUnwrap } from "@/lib/dates/plan-gift";
import { giftUnwrapSchema } from "@/lib/gift/schema";
import { getTrip, TRIPS } from "@/lib/trips/presets";
import { tripUnwrap } from "@/lib/trips/trip-gift";
import type { Airport } from "@/lib/trips/airports";

const stop = (name: string, time?: string, extra: Partial<PlanStop> = {}): PlanStop => ({ id: `node/${name}`, name, kind: "cafe", lat: 38.712345678, lng: -9.14, ...(time ? { time } : {}), ...extra });
const plan = (stops: PlanStop[], extra: Partial<Plan> = {}): Plan => ({ v: 1, stops, ...extra });
const PHOTO = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Cafe.jpg/160px-Cafe.jpg";

describe("a date plan wrapped inside a gift", () => {
  it("carries the day, the town and every stop in order, with its time, kind and place", () => {
    const unwrap = planUnwrap(plan([stop("Café da Esquina", "18:00"), stop("Museu do Fado", "19:30", { kind: "museum" }), stop("Bar do Rio")], { date: "2026-10-17", where: "Lisbon" }), "en");
    expect(unwrap).toMatchObject({ kind: "date", title: "Lisbon", date: "2026-10-17", city: "Lisbon" });
    expect(unwrap.stops).toEqual([
      { name: "Café da Esquina", time: "18:00", kind: "cafe", lat: 38.71235, lng: -9.14 },
      { name: "Museu do Fado", time: "19:30", kind: "museum", lat: 38.71235, lng: -9.14 },
      { name: "Bar do Rio", kind: "cafe", lat: 38.71235, lng: -9.14 },
    ]);
    expect(giftUnwrapSchema.parse(unwrap)).toEqual(unwrap);
  });

  it("puts each stop's photograph on it, and only from the allow-list", () => {
    const stops = [stop("A cafe"), stop("B cafe"), stop("C cafe")];
    const unwrap = planUnwrap(plan(stops), "en", { photos: { "node/A cafe": PHOTO, "node/B cafe": "https://tracker.example/b.jpg", "node/C cafe": null } });
    expect(unwrap.stops.map((s) => s.image)).toEqual([PHOTO, undefined, undefined]);
  });

  it("links to the plan itself, and nowhere else", () => {
    expect(planUnwrap(plan([stop("A")]), "en", { link: "/plan#p=abc" }).link).toBe("/plan#p=abc");
    expect(planUnwrap(plan([stop("A")]), "es", { link: "/es/plan#p=abc" }).link).toBe("/es/plan#p=abc");
    expect(planUnwrap(plan([stop("A")]), "en", { link: "https://elsewhere.example/plan#p=abc" })).not.toHaveProperty("link");
  });

  it("calls a place with no name by its kind, in the gift's language", () => {
    const view = stop("Viewpoint", undefined, { kind: "viewpoint", named: false });
    expect(planUnwrap(plan([view]), "es").stops[0].name).toBe("Mirador");
  });

  it("is named after the idea, the town, or simply our date", () => {
    expect(planUnwrap(plan([stop("A")]), "en", { title: "Museum, then wine" }).title).toBe("Museum, then wine");
    expect(planUnwrap(plan([stop("A")], { where: "Porto" }), "en").title).toBe("Porto");
    expect(planUnwrap(plan([stop("A")]), "en").title).toBe("Our date");
    expect(planUnwrap(plan([stop("A")]), "es").title).toBe("Nuestra cita");
  });

  it("leaves a day nobody has picked for the gift to promise", () => {
    expect(planUnwrap(plan([stop("A")]), "en")).not.toHaveProperty("date");
  });

  it("always fits the schema, whatever the plan", () => {
    const long = "A very long name for a place that somebody typed out in full, and then some more words to go past it";
    for (const locale of ["en", "es"] as const) {
      for (let n = 0; n <= 8; n++) {
        const stops = Array.from({ length: n }, (_, i) => stop(i === 0 ? long : `Stop ${i}`, i % 2 ? "20:15" : undefined, { note: i === 1 ? "x".repeat(140) : undefined }));
        const unwrap = planUnwrap(plan(stops, { where: "W".repeat(80), date: "2026-12-31" }), locale, { title: "T".repeat(120) });
        expect(giftUnwrapSchema.safeParse(unwrap).success).toBe(true);
        expect(unwrap.stops).toHaveLength(n);
      }
    }
  });
});

describe("a preset trip wrapped inside a gift", () => {
  it("fits the schema for every trip, in both languages", () => {
    for (const trip of TRIPS) {
      for (const locale of ["en", "es"] as const) {
        const unwrap = tripUnwrap(trip, locale);
        const parsed = giftUnwrapSchema.safeParse(unwrap);
        expect(parsed.success, `${trip.id} ${locale}`).toBe(true);
        expect(unwrap.link).toBe(`${locale === "es" ? "/es" : ""}/trips/${trip.id}`);
        if (trip.image) expect(unwrap.image).toBe(trip.image.replace(/\.webp$/, "-sm.webp"));
      }
    }
  });

  it("flies to the airport's city, from where they last flew", () => {
    const lisbon = getTrip("lisbon-slow-weekend")!;
    const from: Airport = { iata: "MAD", city: "Madrid", country: "ES", lat: 40.47, lng: -3.56 };
    const unwrap = tripUnwrap(lisbon, "en", { from });
    expect(unwrap.kind).toBe("trip");
    expect(unwrap.trip).toMatchObject({ mode: "flight", from: "Madrid", to: "Lisbon" });
    expect(unwrap.trip?.nights).toBe(lisbon.days - 1);
    expect(unwrap.title).toBe(lisbon.title.en);
    expect(tripUnwrap(lisbon, "es").trip?.to).toBe("Lisboa");
    expect(tripUnwrap(lisbon, "en").trip).not.toHaveProperty("from");
  });

  it("drives a road trip from where the road starts to where it ends", () => {
    const road = getTrip("amalfi-coast")!;
    expect(road.kind).toBe("road");
    const unwrap = tripUnwrap(road, "en");
    expect(unwrap.trip?.mode).toBe("road");
    expect(unwrap.trip?.from).toBe(road.stops[0].name);
    expect(unwrap.trip?.to).toBe(road.stops[road.stops.length - 1].name);
  });

  it("takes the towns' photographs only from the allow-list", () => {
    const amalfi = getTrip("amalfi-coast")!;
    const first = amalfi.stops[0].name;
    const second = amalfi.stops[1].name;
    const unwrap = tripUnwrap(amalfi, "en", { photos: { [first]: PHOTO, [second]: "https://tracker.example/x.jpg" } });
    expect(unwrap.stops[0].image).toBe(PHOTO);
    expect(unwrap.stops[1]).not.toHaveProperty("image");
  });
});
