import { describe, expect, it } from "vitest";
import { ROOMS, roomOf } from "@/components/marketing/rooms";
import { VISITED_ROOMS, parseMarker, seeRoom, visitedRoom, type RoomsMarker, type VisitedRoom } from "@/lib/analytics/rooms-marker";

/**
 * Visitors who use two or more rooms within 30 days (audit X3): which pages are in which room, and
 * the rule that decides when the one count is sent. The rule is pure; the browser half is below.
 */

const ROOM_PAGES: Record<VisitedRoom, string[]> = {
  gifts: ["/templates", "/templates/bouquet", "/es/templates/bouquet", "/occasions", "/occasions/birthday", "/gifts", "/gifts/finder", "/gifts/for-mom"],
  dates: ["/dates", "/dates/lisbon", "/dates/ideas", "/plan", "/es/plan"],
  trips: ["/trips", "/trips/lisbon-slow-weekend"],
  longDistance: ["/long-distance", "/es/long-distance"],
  games: ["/games", "/games/rather", "/games/today"],
};

/** Each visit in turn, from a cleared browser: what each said about sending. */
function visits(steps: [VisitedRoom, number][], start: RoomsMarker | null = null): { marker: RoomsMarker; sends: boolean[] } {
  let marker = start;
  const sends: boolean[] = [];
  for (const [room, day] of steps) {
    const next = seeRoom(marker, room, day);
    marker = next.marker;
    sends.push(next.send);
  }
  return { marker: marker!, sends };
}

describe("which pages are in which room", () => {
  it("which pages are in which room", () => {
    for (const [room, pages] of Object.entries(ROOM_PAGES)) for (const page of pages) expect(visitedRoom(page), page).toBe(room);
  });

  it("never a gift, the editor, checkout or an account page, nor a page between rooms", () => {
    const outside = ["/", "/es", "/g/abc123", "/es/g/abc123", "/demo/bloom", "/create/bouquet", "/checkout/success", "/dashboard", "/dashboard/gift/x", "/account", "/login", "/c/tok", "/pricing", "/blog/x", "/made-with-ethos", "/digital-cards", "/tools/halfway-between-two-cities", "/templatesx", "/giftsy", "/gamesroom"];
    for (const page of outside) expect(visitedRoom(page), page).toBeNull();
  });

  it("agrees with the navbar's rooms, except the editor, the demos and Pricing", () => {
    for (const pages of Object.values(ROOM_PAGES)) for (const page of pages.filter((p) => !p.startsWith("/es"))) expect(visitedRoom(page), page).toBe(roomOf(page));
    expect(roomOf("/create/x")).toBe("gifts");
    expect(visitedRoom("/create/x")).toBeNull();
    expect([...VISITED_ROOMS]).toEqual(ROOMS.map((r) => r.key).filter((k) => k !== "pricing"));
  });
});

describe("the rule", () => {
  it("a cleared browser: the first room is written down, nothing is sent", () => {
    expect(seeRoom(null, "gifts", 100)).toStrictEqual({ marker: { seen: { gifts: 100 } }, send: false });
  });

  it("the same room twice is one room", () => {
    const { marker, sends } = visits([["gifts", 100], ["gifts", 101]]);
    expect(sends).toEqual([false, false]);
    expect(marker.seen).toStrictEqual({ gifts: 101 });
  });

  it("a second room the same day sends, once", () => {
    const first = visits([["gifts", 100], ["dates", 100]]);
    expect(first.sends).toEqual([false, true]);
    expect(first.marker).toStrictEqual({ seen: { gifts: 100, dates: 100 }, sent: 100 });
    const later = visits([["gifts", 101], ["trips", 102]], first.marker);
    expect(later.sends).toEqual([false, false]);
  });

  it("the 30th day pairs, the 31st does not", () => {
    expect(visits([["gifts", 100], ["dates", 130]]).sends).toEqual([false, true]);
    const late = visits([["gifts", 100], ["dates", 131]]);
    expect(late.sends).toEqual([false, false]);
    expect(late.marker.seen).toStrictEqual({ dates: 131 });
  });

  it("three rooms count once in 30 days, and again after", () => {
    const { marker, sends } = visits([["gifts", 100], ["dates", 105], ["trips", 110], ["games", 135], ["games", 136]]);
    expect(sends).toEqual([false, true, false, false, true]);
    expect(marker.sent).toBe(136);
  });

  it("a clock set back never counts twice", () => {
    expect(seeRoom({ seen: { gifts: 200 }, sent: 200 }, "dates", 150)).toStrictEqual({ marker: { seen: { dates: 150 }, sent: 150 }, send: false });
    const back = seeRoom({ seen: { gifts: 140 }, sent: 200 }, "dates", 150);
    expect(back.send).toBe(false);
    expect(back.marker.sent).toBe(150);
    expect(seeRoom({ seen: { gifts: 200 } }, "dates", 150).send).toBe(false);
  });

  it("does not change what it was given", () => {
    const prev: RoomsMarker = { seen: Object.freeze({ gifts: 100 }), sent: 50 };
    Object.freeze(prev);
    expect(() => seeRoom(prev, "dates", 110)).not.toThrow();
    expect(prev).toStrictEqual({ seen: { gifts: 100 }, sent: 50 });
  });

  it("reads back only rooms and whole days", () => {
    expect(parseMarker('{"seen":{"gifts":100,"dates":"x","id":"abc","trips":-1,"games":1.5},"sent":"y","who":"me"}')).toStrictEqual({ seen: { gifts: 100 } });
    expect(parseMarker('{"seen":{"gifts":100},"sent":101}')).toStrictEqual({ seen: { gifts: 100 }, sent: 101 });
  });

  it("a broken entry is no entry", () => {
    for (const raw of [null, "", "{not json", "[]", "null", '{"sent":3}']) expect(parseMarker(raw), String(raw)).toBeNull();
  });
});
