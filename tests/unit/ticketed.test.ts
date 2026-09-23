import { describe, expect, it } from "vitest";
import { KIND_IDS, KINDS, type PlaceKind } from "@/lib/dates/kinds";
import { sellsTickets, TICKETED_KINDS, ticketQuery } from "@/lib/dates/ticketed";

describe("which places get a Tickets button", () => {
  it("are the kinds you pay at the door of, plus famous galleries and landmarks", () => {
    expect([...TICKETED_KINDS].sort()).toEqual(["gallery", "landmark", "museum", "planetarium", "themepark", "zoo"]);
  });

  it("only lists kinds that exist", () => {
    for (const kind of TICKETED_KINDS) expect(KIND_IDS, kind).toContain(kind);
  });

  it("never puts one on food, drink, the outdoors or a night in", () => {
    const never: PlaceKind[] = ["restaurant", "bar", "cafe", "dessert", "viewpoint", "park", "beach", "picnic", "cinema", "theatre", "bookshop", "karaoke", "spa"];
    for (const kind of never) expect(sellsTickets({ kind, named: true, notable: true }), kind).toBe(false);
  });

  it("puts one on a museum, zoo, planetarium or theme park, famous or not", () => {
    for (const kind of ["museum", "zoo", "planetarium", "themepark"] as const) {
      expect(sellsTickets({ kind, named: true, notable: false }), kind).toBe(true);
      expect(sellsTickets({ kind }), kind).toBe(true);
    }
  });

  it("puts one on a gallery or landmark only when it has an encyclopedia entry", () => {
    for (const kind of ["gallery", "landmark"] as const) {
      expect(sellsTickets({ kind, named: true, notable: true }), kind).toBe(true);
      expect(sellsTickets({ kind, named: true, notable: false }), kind).toBe(false);
      // A stop in a saved plan doesn't know whether it is famous.
      expect(sellsTickets({ kind }), kind).toBe(false);
    }
  });

  it("never on a place with no name of its own, since there is nothing to search for", () => {
    expect(sellsTickets({ kind: "museum", named: false, notable: true })).toBe(false);
  });

  it("agrees with the kinds the map calls free: every always-ticketed kind costs something", () => {
    for (const kind of TICKETED_KINDS.filter((k) => sellsTickets({ kind: k }))) expect(KINDS[kind].free, kind).toBe(false);
  });
});

describe("what Tiqets is asked for", () => {
  it("is the place and its town", () => {
    expect(ticketQuery("Rijksmuseum", "Amsterdam")).toBe("Rijksmuseum Amsterdam");
    expect(ticketQuery("  Science Museum ", " London ")).toBe("Science Museum London");
  });

  it("leaves the town off when the name already says it, or when there is no town", () => {
    expect(ticketQuery("Museum of London", "London")).toBe("Museum of London");
    expect(ticketQuery("Tivoli Gardens", "")).toBe("Tivoli Gardens");
    expect(ticketQuery("Tivoli Gardens")).toBe("Tivoli Gardens");
  });

  it("stays short enough to be a search", () => {
    expect(ticketQuery("x".repeat(140), "Riga").length).toBeLessThanOrEqual(100);
  });
});
