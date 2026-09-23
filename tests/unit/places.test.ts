import { describe, expect, it } from "vitest";
import { parsePhoton } from "@/lib/places/photon";
import { searchCities } from "@/templates/_shared/places";

const feature = (name: unknown, kind: string, lng: unknown, lat: unknown, extra: Record<string, unknown> = {}) => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [lng, lat] },
  properties: { name, osm_key: "place", osm_value: kind, ...extra },
});

describe("place search results", () => {
  it("keeps a town with its region and country, rounded to a sensible precision", () => {
    const out = parsePhoton({ features: [feature("Ventspils", "city", 21.5635991, 57.3903918, { state: "Kurzeme", country: "Latvia" })] });
    expect(out).toEqual([{ name: "Ventspils", kind: "city", lat: 57.3904, lng: 21.5636, region: "Kurzeme", country: "Latvia" }]);
  });

  it("keeps villages and hamlets, which is most of where people actually live", () => {
    const out = parsePhoton({ features: [feature("Tiny", "village", 1, 1), feature("Tinier", "hamlet", 2, 2)] });
    expect(out.map((p) => p.name)).toEqual(["Tiny", "Tinier"]);
  });

  it("drops provinces, countries and anything that isn't a settlement", () => {
    const out = parsePhoton({ features: [feature("Cádiz", "province", -5.9, 36.5), feature("Spain", "country", -3, 40), feature("Andalucía", "state", -4.5, 37.5)] });
    expect(out).toEqual([]);
  });

  it("collapses the same town listed twice, but keeps a namesake elsewhere", () => {
    const out = parsePhoton({
      features: [
        feature("Cádiz", "city", -6.2929, 36.5297, { country: "España" }),
        feature("Cádiz", "municipality", -6.2931, 36.5301, { country: "España" }),
        feature("Cádiz", "hamlet", -83.4618, 10.2402, { country: "Costa Rica" }),
      ],
    });
    expect(out.map((p) => p.country)).toEqual(["España", "Costa Rica"]);
  });

  it("drops malformed results instead of trusting them", () => {
    const out = parsePhoton({
      features: [feature("", "city", 1, 1), feature("Nowhere", "city", 1, 200), feature("Bad", "city", "1", 1), { properties: { name: "No geometry", osm_value: "city" } }, null],
    });
    expect(out).toEqual([]);
  });

  it("returns nothing for a response that isn't one", () => {
    expect(parsePhoton(null)).toEqual([]);
    expect(parsePhoton({})).toEqual([]);
    expect(parsePhoton("oops")).toEqual([]);
  });

  it("stops at the limit", () => {
    const features = Array.from({ length: 20 }, (_, i) => feature(`Town ${i}`, "town", i, i));
    expect(parsePhoton({ features })).toHaveLength(8);
    expect(parsePhoton({ features }, 3)).toHaveLength(3);
  });

  it("puts cities ahead of villages with the same name, accents or not", () => {
    // Photon's real order for "Valparaiso", trimmed: the Chilean city came ninth and was cut off.
    const features = [
      feature("Valparaiso", "city", -87.06, 41.47, { state: "Indiana", extent: [-87.11, 41.51, -87.0, 41.44] }),
      feature("Valparaiso", "village", -96.83, 41.08, { state: "Nebraska", extent: [-96.84, 41.09, -96.82, 41.07] }),
      feature("Valparaiso", "village", -86.5, 30.5, { state: "Florida" }),
      feature("Valparaiso", "village", -104.19, 52.85, { state: "Saskatchewan" }),
      feature("Valparaíso", "municipality", -50.9, -21.2, { state: "São Paulo", extent: [-51.15, -20.94, -50.74, -21.44] }),
      feature("Valparaiso", "municipality", -42.1, -7.1, { state: "Piauí" }),
      feature("Valparaiso", "suburb", -42.8, -5.1, { state: "Piauí" }),
      feature("Valparaiso", "village", -67.2, -11.1, { state: "Pando" }),
      feature("Valparaíso", "city", -71.62, -33.05, { state: "Valparaiso Region", country: "Chile", extent: [-80.12, -26.27, -71.38, -33.21] }),
      feature("Valparaíso de Goiás", "municipality", -47.98, -16.07),
    ];
    const out = parsePhoton({ features }, 8, "Valparaiso");
    expect(out.slice(0, 2).map((p) => p.region)).toEqual(["Indiana", "Valparaiso Region"]);
    expect(out.slice(2, 4).map((p) => p.kind)).toEqual(["municipality", "municipality"]);
    // An exact name beats one that only starts with it, whatever the size.
    expect(out.map((p) => p.name)).not.toContain("Valparaíso de Goiás");
  });

  it("keeps Photon's order among places of the same kind", () => {
    // Cambridge in England is a point with no extent; only Photon's order says it comes first.
    const out = parsePhoton({ features: [feature("Cambridge", "city", 0.12, 52.2), feature("Cambridge", "city", -80.3, 43.4, { extent: [-80.4, 43.5, -80.2, 43.3] })] }, 8, "cambridge");
    expect(out.map((p) => p.lng)).toEqual([0.12, -80.3]);
  });
});

describe("built-in city search", () => {
  it("finds a city by the start of its name, whatever the accents or case", () => {
    expect(searchCities("bog")[0]).toMatchObject({ name: "Bogotá" });
    expect(searchCities("MALAGA")[0]).toMatchObject({ name: "Málaga" });
  });

  it("understands the Spanish names people type", () => {
    expect(searchCities("nueva york")[0]).toMatchObject({ name: "New York" });
    expect(searchCities("londres")[0]).toMatchObject({ name: "London" });
  });

  it("waits for two letters", () => {
    expect(searchCities("b")).toEqual([]);
    expect(searchCities("")).toEqual([]);
  });

  it("lists names that start with the query before names that only contain it", () => {
    const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const names = searchCities("an", 60).map((c) => fold(c.name));
    const firstContains = names.findIndex((n) => !n.startsWith("an"));
    expect(firstContains).toBeGreaterThan(0);
    expect(names.slice(firstContains).every((n) => !n.startsWith("an") && n.includes("an"))).toBe(true);
  });
});
