import { describe, expect, it } from "vitest";
import { emailKey, signToken, verifyToken } from "@/lib/lifecycle/links";
import { departDate, tripLinks } from "@/lib/lifecycle/trip-links";

const SECRET = "test-secret";
const ID = "5f0c6f7e-3a55-4d2b-9a57-0e8a3f1b2c4d";

describe("signed email links", () => {
  it("round-trips a reminder id", async () => {
    const token = await signToken("reminder-remove", ID, SECRET);
    expect(token.startsWith(`${ID}.`)).toBe(true);
    expect(await verifyToken("reminder-remove", token, SECRET)).toBe(ID);
  });

  it("refuses a token signed with another secret, for another purpose, or edited", async () => {
    const token = await signToken("reminder-remove", ID, SECRET);
    expect(await verifyToken("reminder-remove", token, "another-secret")).toBeNull();
    const other = "5f0c6f7e-3a55-4d2b-9a57-0e8a3f1b2c4e";
    expect(await verifyToken("reminder-remove", `${other}.${token.split(".")[1]}`, SECRET)).toBeNull();
    const key = await emailKey("ana@example.com");
    const optout = await signToken("email-optout", key, SECRET);
    // Same secret, same shape of value, different purpose: still no.
    expect(await verifyToken("reminder-remove", optout, SECRET)).toBeNull();
    expect(await verifyToken("email-optout", optout, SECRET)).toBe(key);
  });

  it("refuses rubbish without throwing", async () => {
    for (const bad of [null, undefined, "", ".", "abc", `${ID}.`, `${ID}.!!!`, "x".repeat(500)]) expect(await verifyToken("reminder-remove", bad, SECRET)).toBeNull();
    await expect(signToken("reminder-remove", "not-an-id", SECRET)).rejects.toThrow();
  });

  it("keys an address by a hash, whatever its case or spaces", async () => {
    const key = await emailKey(" Ana@Example.com ");
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(await emailKey("ana@example.com")).toBe(key);
    expect(key).not.toContain("ana");
  });
});

describe("book the trip", () => {
  const now = new Date("2026-09-23T10:00:00Z");
  const gift = (fields: Record<string, unknown>, countdown?: { targetAt: string; timezone: string }) => ({ templateSlug: "pack-your-bags", fields, countdown });

  it("searches flights between the two airports, on the countdown's day, for the nights", () => {
    const trip = tripLinks(gift({ trip: "flight", fromCity: "Riga", toCity: "Lisbon", nights: 3 }, { targetAt: "2026-10-09T22:30:00+00:00", timezone: "Europe/Riga" }), "en", now);
    expect(trip?.city).toBe("Lisbon");
    expect(trip?.links.map((l) => l.partner)).toEqual(["aviasales", "tiqets"]);
    // 22:30 UTC on the 9th is already the 10th in Riga.
    expect(decodeURIComponent(trip!.links[0].href)).toContain("aviasales.com/search/RIX1010LIS13102");
  });

  it("uses the metro code where a city has several airports", () => {
    const trip = tripLinks(gift({ trip: "flight", fromCity: "London", toCity: "Paris" }), "en", now);
    expect(decodeURIComponent(trip!.links[0].href)).toContain("https://www.aviasales.com/");
    const dated = tripLinks(gift({ trip: "flight", fromCity: "London", toCity: "Paris", nights: 2 }, { targetAt: "2026-11-01T09:00:00+00:00", timezone: "UTC" }), "en", now);
    expect(decodeURIComponent(dated!.links[0].href)).toContain("/search/LON0111PAR03112");
  });

  it("offers no flight it can't place, car hire for road trips, and nothing for other gifts", () => {
    const unknown = tripLinks(gift({ trip: "flight", fromCity: "Nowhereville", toCity: "Lisbon" }), "en", now);
    expect(unknown?.links.map((l) => l.partner)).toEqual(["tiqets"]);
    const road = tripLinks(gift({ trip: "road", fromCity: "Riga", toCity: "Tallinn" }), "es", now);
    expect(road?.links.map((l) => l.partner)).toEqual(["tiqets", "autoeurope"]);
    expect(decodeURIComponent(road!.links[0].href)).toContain("tiqets.com/es/search?q=Tallinn");
    expect(tripLinks({ templateSlug: "the-letter", fields: {}, countdown: undefined }, "en", now)).toBeNull();
    expect(tripLinks(gift({ trip: "flight", toCity: "  " }), "en", now)).toBeNull();
  });

  it("drops a departure date that has passed", () => {
    expect(departDate({ targetAt: "2026-09-01T10:00:00+00:00", timezone: "UTC" }, now)).toBeNull();
    expect(departDate({ targetAt: "2026-12-24T10:00:00+00:00", timezone: "Bad/Zone" }, now)).toBe("2026-12-24");
    expect(departDate(undefined, now)).toBeNull();
  });
});
