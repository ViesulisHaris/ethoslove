import { describe, expect, it } from "vitest";
import { STARTER_CITIES, starterName } from "@/lib/dates/cities";
import { findTown, suggestPlaces } from "@/lib/dates/where";
import { parsePhoton, type PlaceResult } from "@/lib/places/photon";

const feature = (name: string, kind: string, lng: number, lat: number, extra: Record<string, unknown> = {}) => ({ type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: { name, osm_key: "place", osm_value: kind, ...extra } });
const town = (name: string, lat: number, lng: number, over: Partial<PlaceResult> = {}): PlaceResult => ({ name, kind: "village", lat, lng, ...over });

describe("the geocoder's answer", () => {
  it("keeps a city mapped only as the region it governs, which Photon still calls a city", () => {
    const out = parsePhoton({ features: [feature("Tokyo", "province", 139.76, 35.68, { type: "city", country: "Japan", countrycode: "JP" }), feature("Tokyo International Airport", "island", 139.78, 35.55, { type: "other" })] });
    expect(out.map((p) => p.name)).toEqual(["Tokyo", "Tokyo International Airport"]);
    expect(out[0]).toMatchObject({ kind: "province", countryCode: "JP" });
    // A real province is still not somewhere two people live.
    expect(parsePhoton({ features: [feature("Cádiz", "province", -5.9, 36.5, { type: "county" }), feature("Texas", "state", -99, 31, { type: "state" })] })).toEqual([]);
    expect(parsePhoton({ features: [feature("X", "city", 1, 1, { countrycode: "not a code" })] })[0].countryCode).toBeUndefined();
  });
});

describe("what the where box offers", () => {
  it("puts the big city first for the start of its name, where the geocoder has a village", () => {
    const lond = suggestPlaces("Lond", [town("Londa", 43.86, 11.57, { country: "Italy" })], "en");
    expect(lond.map((p) => p.name)).toEqual(["London", "Londa"]);
    expect(lond[0]).toMatchObject({ lead: true, country: "United Kingdom" });
    expect(suggestPlaces("Toky", [town("Toky", 49.6, 25.8), town("Toky", 12.1, 15.0)], "en")[0].name).toBe("Tokyo");
  });

  it("says it in the page's language, and knows the Spanish names", () => {
    expect(suggestPlaces("Tokio", [], "es")[0]).toMatchObject({ name: "Tokio", country: "Japón" });
    expect(suggestPlaces("Florencia", [], "es")[0]).toMatchObject({ name: "Florencia" });
    expect(suggestPlaces("Londres", [], "en")[0]).toMatchObject({ name: "London" });
  });

  it("does not list the same city twice, by either name or as the region it governs", () => {
    const tokyo = suggestPlaces("Tokio", [town("東京都", 35.68, 139.76, { kind: "province" }), town("Tokyo International Airport", 35.55, 139.78, { kind: "island" })], "es");
    expect(tokyo.map((p) => p.name)).toEqual(["Tokio", "Tokyo International Airport"]);
    const london = suggestPlaces("London", [town("London", 51.5, -0.12, { kind: "city" }), town("London", 42.98, -81.25, { kind: "city", country: "Canada" })], "es");
    expect(london.map((p) => [p.name, p.country])).toEqual([["Londres", "Reino Unido"], ["London", "Canada"]]);
  });

  it("leaves a name only inside a big city's name to the geocoder: York is not New York", () => {
    const york = suggestPlaces("York", [town("York", 53.96, -1.08, { kind: "city" })], "en");
    expect(york.map((p) => p.name)).toEqual(["York", "New York"]);
    expect(york[1].lead).toBe(false);
  });

  it("finds the Spanish cities too, since this answers what was typed: Madrid before Madré", () => {
    const madr = suggestPlaces("Madr", [town("Madré", 48.5, -0.4, { country: "France" }), town("Madrid", 40.42, -3.7, { kind: "city" })], "es");
    expect(madr.map((p) => p.name)).toEqual(["Madrid", "Madré"]);
    expect(madr[0]).toMatchObject({ lead: true, country: "España" });
  });

  it("still has the big cities when the geocoder could not be asked", () => {
    expect(suggestPlaces("Par", [], "en").map((p) => p.name)).toContain("Paris");
    expect(suggestPlaces("x", [], "en")).toEqual([]);
  });
});

describe("the starter cities", () => {
  it("are named as a Spanish speaker names them on a Spanish page", () => {
    const byName = (name: string) => STARTER_CITIES.find((c) => c.name === name)!;
    expect(starterName(byName("Mexico City"), "es")).toBe("Ciudad de México");
    expect(starterName(byName("New York"), "es")).toBe("Nueva York");
    expect(starterName(byName("Riga"), "es")).toBe("Riga");
    expect(starterName(byName("Mexico City"), "en")).toBe("Mexico City");
  });
});

describe("a town named in a link", () => {
  const answering = (results: unknown, status = 200) => async () => new Response(JSON.stringify({ results }), { status });

  it("is found without asking anybody when it is one of the site's cities", async () => {
    const never = async (): Promise<Response> => {
      throw new Error("asked");
    };
    // At the starter city's centre, where its evenings are, like the Lisbon chip.
    expect(await findTown("Lisboa", "es", never)).toMatchObject({ name: "Lisboa", lat: 38.7139, lng: -9.1394 });
  });

  it("is otherwise the geocoder's first answer, or nothing, or unknown when it could not be asked", async () => {
    expect(await findTown("Salzburg", "en", answering([{ name: "Salzburg", kind: "city", lat: 47.8, lng: 13.04, country: "Austria" }]))).toEqual({ name: "Salzburg", lat: 47.8, lng: 13.04 });
    expect(await findTown("zzzz", "en", answering([]))).toBeNull();
    expect(await findTown("zzzz", "en", answering([], 504))).toBeUndefined();
    expect(await findTown("z", "en", answering([]))).toBeNull();
  });
});
