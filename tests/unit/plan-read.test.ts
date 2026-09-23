import { describe, expect, it } from "vitest";
import { MAX_STOPS, readPlan } from "@/lib/dates/plan";

const stop = { id: "node/1", name: "Café Luna", kind: "cafe", lat: 51.5, lng: -0.12 };

describe("reading a plan without zod", () => {
  it("trims text, keeps what is there and adds nothing that isn't", () => {
    expect(readPlan({ v: 1, where: "  Soho ", stops: [{ ...stop, name: " Café Luna ", time: "18:30" }] })).toEqual({ v: 1, where: "Soho", stops: [{ ...stop, time: "18:30" }] });
    const plain = readPlan({ v: 1, stops: [stop] });
    expect(plain && Object.keys(plain)).toEqual(["v", "stops"]);
    expect(plain && Object.keys(plain.stops[0])).toEqual(["id", "name", "kind", "lat", "lng"]);
  });

  it("drops fields a plan doesn't have", () => {
    expect(readPlan({ v: 1, evil: "<script>", stops: [{ ...stop, extra: 1 }] })).toEqual({ v: 1, stops: [stop] });
  });

  it("measures text after trimming it", () => {
    expect(readPlan({ v: 1, to: `  ${"a".repeat(40)}  `, stops: [] })).toEqual({ v: 1, to: "a".repeat(40), stops: [] });
    expect(readPlan({ v: 1, to: "a".repeat(41), stops: [] })).toBeNull();
    expect(readPlan({ v: 1, stops: [{ ...stop, name: "   " }] })).toBeNull();
  });

  it("fails the whole plan on anything of the wrong kind", () => {
    expect(readPlan(null)).toBeNull();
    expect(readPlan([])).toBeNull();
    expect(readPlan({ v: 1 })).toBeNull();
    expect(readPlan({ v: 1, note: null, stops: [] })).toBeNull();
    expect(readPlan({ v: 1, date: "2026-13-01", stops: [] })).toBeNull();
    expect(readPlan({ v: 1, stops: [{ ...stop, time: "25:00" }] })).toBeNull();
    expect(readPlan({ v: 1, stops: [{ ...stop, lng: 181 }] })).toBeNull();
    expect(readPlan({ v: 1, stops: [{ ...stop, lat: "51.5" }] })).toBeNull();
    expect(readPlan({ v: 1, stops: [{ ...stop, id: undefined }] })).toBeNull();
    expect(readPlan({ v: 1, stops: Array.from({ length: MAX_STOPS + 1 }, (_, i) => ({ ...stop, id: `node/${i}` })) })).toBeNull();
  });

  it("keeps a stop with no name of its own as one, and nothing else in that field", () => {
    const unnamed = { ...stop, name: "Viewpoint", kind: "viewpoint", named: false };
    expect(readPlan({ v: 1, stops: [unnamed] })).toEqual({ v: 1, stops: [unnamed] });
    // Plans made before the field existed are named, as they always were.
    expect(readPlan({ v: 1, stops: [stop] })?.stops[0]).not.toHaveProperty("named");
    expect(readPlan({ v: 1, stops: [{ ...stop, named: true }] })).toBeNull();
    expect(readPlan({ v: 1, stops: [{ ...stop, named: "no" }] })).toBeNull();
  });

  it("accepts a real date", () => {
    expect(readPlan({ v: 1, date: "2026-09-26", stops: [] })).toEqual({ v: 1, date: "2026-09-26", stops: [] });
  });
});
