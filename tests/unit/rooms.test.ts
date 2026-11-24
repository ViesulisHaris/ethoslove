import { describe, expect, it } from "vitest";
import { ROOMS, roomOf } from "@/components/marketing/rooms";

describe("the rooms in the header and the menu", () => {
  it("lists Gifts first, then Dates, Trips, Long distance and Games, with Pricing last", () => {
    expect(ROOMS.map((room) => room.key)).toEqual(["gifts", "dates", "trips", "longDistance", "games", "pricing"]);
  });

  it("only Pricing waits for a wide screen", () => {
    expect(ROOMS.filter((room) => room.wide).map((room) => room.key)).toEqual(["pricing"]);
  });

  it("puts the finder, the gallery, the occasions and the editor in Gifts", () => {
    for (const path of ["/gifts", "/gifts/finder", "/gifts/for-mom", "/templates", "/templates/bouquet", "/occasions/birthday", "/create/bouquet"]) {
      expect(roomOf(path), path).toBe("gifts");
    }
    expect(roomOf("/")).toBeNull();
    expect(roomOf("/dates/lisbon")).toBe("dates");
  });
});
