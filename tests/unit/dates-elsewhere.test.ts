import { describe, expect, it } from "vitest";
import { googleRating, linksFor, samePlace, tripadvisorRating } from "@/lib/dates/elsewhere";
import type { Place } from "@/lib/dates/places";

const place = { id: "node/1", name: "Café da Esquina", named: true, kind: "cafe", group: "sweet", lat: 38.7139, lng: -9.1394, distanceKm: 0.2, address: "Rua Augusta 10, Lisboa", cuisine: [], outdoorSeating: false, vegetarian: false, stepFree: false, notable: false, score: 50 } as unknown as Place;

/** A fake fetch that answers each URL it is asked for from a table, and records what it was asked. */
function fakeFetch(table: Record<string, unknown>) {
  const asked: { url: string; init?: RequestInit }[] = [];
  const f = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    asked.push({ url, init });
    const key = Object.keys(table).find((k) => url.includes(k));
    if (!key) return new Response("not found", { status: 404 });
    return new Response(JSON.stringify(table[key]), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return { f, asked };
}

describe("ratings from other sites", () => {
  it("links out to every site for any named place, needing no key", () => {
    const links = linksFor(place);
    expect(links.map((l) => l.source)).toEqual(["tripadvisor", "google", "yelp"]);
    expect(links[0].url).toContain("tripadvisor.com/Search?q=Caf%C3%A9%20da%20Esquina");
    expect(links[2].url).toContain("find_loc=38.7139,-9.1394");
  });

  it("searches Google by name and address, with no empty place id", () => {
    const google = linksFor(place).find((l) => l.source === "google")!.url;
    expect(google).toBe("https://www.google.com/maps/search/?api=1&query=Caf%C3%A9%20da%20Esquina%20Rua%20Augusta%2010%2C%20Lisboa");
    expect(google).not.toContain("query_place_id");
  });

  it("links a place from the list, which has no address, by its name alone or with the town it is given", () => {
    const bare = { ...place, address: undefined } as Place;
    expect(linksFor(bare)[0].url).toBe("https://www.tripadvisor.com/Search?q=Caf%C3%A9%20da%20Esquina");
    // The sheet passes the address it shows, or the town before that has arrived.
    expect(linksFor({ ...bare, address: "Lisboa" })[1].url).toBe("https://www.google.com/maps/search/?api=1&query=Caf%C3%A9%20da%20Esquina%20Lisboa");
  });

  it("only takes a score for the same place: close by, and the same name", () => {
    expect(samePlace(place, { name: "Cafe da Esquina", lat: 38.714, lng: -9.1393 })).toBe(true);
    expect(samePlace(place, { name: "CAFÉ DA ESQUINA - Lisboa", lat: 38.7139, lng: -9.1394 })).toBe(true);
    expect(samePlace(place, { name: "Café da Esquina", lat: 38.73, lng: -9.1394 })).toBe(false);
    expect(samePlace(place, { name: "Pastelaria Nova", lat: 38.7139, lng: -9.1394 })).toBe(false);
  });

  it("reads Tripadvisor's score in two calls, with its link", async () => {
    const { f, asked } = fakeFetch({
      "location/search": { data: [{ location_id: "123", name: "Café da Esquina" }] },
      "location/123/details": { rating: "4.5", num_reviews: "312", web_url: "https://www.tripadvisor.com/Restaurant_Review-123", name: "Café da Esquina", latitude: "38.7139", longitude: "-9.1394" },
    });
    expect(await tripadvisorRating(place, "KEY", f)).toEqual({ source: "tripadvisor", stars: 4.5, reviews: 312, url: "https://www.tripadvisor.com/Restaurant_Review-123" });
    expect(asked[0].url).toContain("key=KEY");
    expect(asked[0].url).toContain("latLong=38.7139%2C-9.1394");
  });

  it("refuses a Tripadvisor answer that is somewhere else, or has no score or no link", async () => {
    const elsewhere = fakeFetch({
      "location/search": { data: [{ location_id: "9", name: "Café da Esquina" }] },
      "location/9/details": { rating: "4.9", num_reviews: "10", web_url: "https://x", name: "Café da Esquina", latitude: "40.4", longitude: "-3.7" },
    });
    expect(await tripadvisorRating(place, "KEY", elsewhere.f)).toBeNull();
    const unscored = fakeFetch({ "location/search": { data: [{ location_id: "9", name: "Café da Esquina" }] }, "location/9/details": { web_url: "https://x" } });
    expect(await tripadvisorRating(place, "KEY", unscored.f)).toBeNull();
    const nothing = fakeFetch({ "location/search": { data: [] } });
    expect(await tripadvisorRating(place, "KEY", nothing.f)).toBeNull();
  });

  it("asks Google for only the billed fields it shows, and takes the matching place", async () => {
    const { f, asked } = fakeFetch({
      "places:searchText": {
        places: [
          { displayName: { text: "Another Café" }, rating: 4.9, userRatingCount: 50, googleMapsUri: "https://maps.google.com/?cid=1", location: { latitude: 38.7139, longitude: -9.1394 } },
          { displayName: { text: "Café da Esquina" }, rating: 4.3, userRatingCount: 1204, googleMapsUri: "https://maps.google.com/?cid=2", location: { latitude: 38.714, longitude: -9.1395 } },
        ],
      },
    });
    expect(await googleRating(place, "KEY", f)).toEqual({ source: "google", stars: 4.3, reviews: 1204, url: "https://maps.google.com/?cid=2" });
    const headers = asked[0].init?.headers as Record<string, string>;
    expect(headers["X-Goog-Api-Key"]).toBe("KEY");
    expect(headers["X-Goog-FieldMask"]).toBe("places.displayName,places.rating,places.userRatingCount,places.googleMapsUri,places.location");
  });

  it("gives nothing, rather than a wrong score, when a site says no", async () => {
    const { f } = fakeFetch({});
    expect(await googleRating(place, "KEY", f)).toBeNull();
    expect(await tripadvisorRating(place, "KEY", f)).toBeNull();
  });
});
