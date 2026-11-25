import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const counted = vi.hoisted(() => [] as unknown[][]);
vi.mock("@/lib/analytics/track", () => ({ track: (...args: unknown[]) => void counted.push(args) }));

import { ROOMS, roomOf } from "@/components/marketing/rooms";
import { PLACEMENT_ROOM } from "@/lib/trips/partners";
import { ROOMS_KEY, VISITED_ROOMS, dayOf, parseMarker, seeRoom, visitedRoom, type RoomsMarker, type VisitedRoom } from "@/lib/analytics/rooms-marker";

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

describe("in the browser", () => {
  const NOW = Date.parse("2026-11-25T12:00:00.000Z");
  const WINDOW = { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };

  function storage(refuse?: string) {
    const items = new Map<string, string>();
    return {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (key === refuse) throw new DOMException("QuotaExceededError");
        items.set(key, String(value));
      },
      removeItem: (key: string) => void items.delete(key),
      clear: () => items.clear(),
      items,
    };
  }
  let store: ReturnType<typeof storage>;

  /** A fresh page load: nothing in memory (consent is cached in its module), the same browser storage. */
  async function page() {
    vi.resetModules();
    const consent = await import("@/lib/analytics/consent");
    const marker = await import("@/lib/analytics/rooms-marker");
    return { ...consent, ...marker };
  }

  beforeEach(() => {
    counted.length = 0;
    store = storage();
    vi.stubGlobal("window", WINDOW);
    vi.stubGlobal("localStorage", store);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("without a yes nothing is kept and nothing is sent", async () => {
    for (const answer of [null, "denied"]) {
      store.clear();
      if (answer) store.setItem("ethos-consent", answer);
      const { noteRoomVisit } = await page();
      noteRoomVisit("/templates", NOW);
      noteRoomVisit("/dates", NOW);
      expect(store.items.size).toBe(answer ? 1 : 0);
      expect(store.getItem(ROOMS_KEY)).toBeNull();
    }
    expect(counted).toEqual([]);
  });

  it("with a yes the room and the day are kept, and nothing else", async () => {
    store.setItem("ethos-consent", "granted");
    const { noteRoomVisit } = await page();
    noteRoomVisit("/templates", NOW);
    const kept = JSON.parse(store.getItem(ROOMS_KEY)!);
    expect(kept).toStrictEqual({ seen: { gifts: dayOf(NOW) } });
    for (const key of Object.keys(kept)) expect(["seen", "sent"]).toContain(key);
    expect(counted).toEqual([]);
  });

  it("a second room sends the count once", async () => {
    store.setItem("ethos-consent", "granted");
    const { noteRoomVisit } = await page();
    noteRoomVisit("/templates", NOW);
    noteRoomVisit("/es/dates/lisbon", NOW);
    expect(counted).toEqual([["two_rooms_30d"]]);
    // Another page load, a third room: still one.
    (await page()).noteRoomVisit("/games", NOW + 60_000);
    expect(counted).toEqual([["two_rooms_30d"]]);
  });

  it("a later yes starts from that page; taking it back removes the entry", async () => {
    const { noteRoomVisit, setConsent } = await page();
    noteRoomVisit("/templates", NOW);
    expect(store.getItem(ROOMS_KEY)).toBeNull();
    setConsent("granted");
    noteRoomVisit("/templates", NOW);
    expect(parseMarker(store.getItem(ROOMS_KEY))).toStrictEqual({ seen: { gifts: dayOf(NOW) } });
    setConsent("denied");
    noteRoomVisit("/dates", NOW);
    expect(store.getItem(ROOMS_KEY)).toBeNull();
    expect(counted).toEqual([]);
  });

  // loop2-D1: a "no" takes the day the count was sent with it (keeping it would keep data without a
  // yes), so stopping cookies and allowing them again can count the same visitor twice. The KPI page
  // has to say so rather than promise "not again for 30 days" without the exception.
  it("a no and a fresh yes start afresh, and the KPI page says the count can come again", async () => {
    store.setItem("ethos-consent", "granted");
    const { noteRoomVisit, setConsent } = await page();
    noteRoomVisit("/templates", NOW);
    noteRoomVisit("/dates", NOW);
    expect(counted).toEqual([["two_rooms_30d"]]);
    setConsent("denied");
    noteRoomVisit("/dates", NOW);
    expect(store.getItem(ROOMS_KEY)).toBeNull();
    setConsent("granted");
    noteRoomVisit("/dates", NOW);
    noteRoomVisit("/trips", NOW);
    expect(counted).toEqual([["two_rooms_30d"], ["two_rooms_30d"]]);
    const kpi = readFileSync("docs/marketing/LOOP-KPI.md", "utf8").replace(/\s+/g, " ");
    expect(kpi).toContain("a visitor who stops cookies and allows them again starts afresh");
    expect(kpi).toContain("so does one who clears the browser");
  });

  // loop2-C4: a "no" given on the editor, a sign-in or an account page left the entry in place,
  // because only the marketing pages' marker removed it.
  it("a no given on any page removes the entry, through the code every page runs", async () => {
    store.setItem("ethos-consent", "granted");
    const { noteRoomVisit, setConsent, keepRooms } = await page();
    noteRoomVisit("/templates", NOW);
    keepRooms(NOW);
    expect(store.getItem(ROOMS_KEY)).not.toBeNull();
    setConsent("denied");
    keepRooms(NOW);
    expect(store.getItem(ROOMS_KEY)).toBeNull();
    // A no given on an earlier page load that never reached a marketing page: gone on the next load.
    store.setItem(ROOMS_KEY, JSON.stringify({ seen: { gifts: dayOf(NOW) } }));
    (await page()).keepRooms(NOW);
    expect(store.getItem(ROOMS_KEY)).toBeNull();
    expect(counted).toEqual([]);
    const capture = readFileSync("src/components/shared/ref-capture.tsx", "utf8");
    expect(capture.match(/keepRooms\(\)/g)).toHaveLength(2);
    expect(readFileSync("src/app/[currency]/[locale]/layout.tsx", "utf8")).toContain("<RefCapture");
  });

  // loop2-T3: an entry was pruned only when a room page was opened, so it could outlive "30 days".
  it("an entry with nothing in the last 30 days is removed on any page; one with something is kept as it was", async () => {
    store.setItem("ethos-consent", "granted");
    const today = dayOf(NOW);
    const cases: [RoomsMarker, boolean][] = [
      [{ seen: { gifts: today - 31 } }, false],
      [{ seen: { gifts: today - 40, dates: today - 31 }, sent: today - 31 }, false],
      [{ seen: { gifts: today - 30 } }, true],
      [{ seen: { gifts: today - 45 }, sent: today - 10 }, true],
      [{ seen: {} }, false],
    ];
    for (const [entry, kept] of cases) {
      store.setItem(ROOMS_KEY, JSON.stringify(entry));
      (await page()).keepRooms(NOW);
      expect(store.getItem(ROOMS_KEY), JSON.stringify(entry)).toBe(kept ? JSON.stringify(entry) : null);
    }
    store.setItem(ROOMS_KEY, "{broken");
    (await page()).keepRooms(NOW);
    expect(store.getItem(ROOMS_KEY)).toBeNull();
    expect(counted).toEqual([]);
  });

  it("a page between rooms changes nothing", async () => {
    store.setItem("ethos-consent", "granted");
    const { noteRoomVisit } = await page();
    for (const path of ["/pricing", "/", "/checkout/success"]) noteRoomVisit(path, NOW);
    expect(store.getItem(ROOMS_KEY)).toBeNull();
    expect(counted).toEqual([]);
  });

  it("the event has no property and the entry holds no id", async () => {
    store.setItem("ethos-consent", "granted");
    const { noteRoomVisit } = await page();
    noteRoomVisit("/templates", NOW);
    noteRoomVisit("/es/dates/lisbon", NOW);
    expect(counted).toHaveLength(1);
    expect(counted[0]).toHaveLength(1);
    expect(store.getItem(ROOMS_KEY)).toMatch(/^\{"seen":\{("(gifts|dates|trips|longDistance|games)":\d+,?)+\}(,"sent":\d+)?\}$/);
  });

  it("a browser that refuses to keep anything sends nothing and breaks nothing", async () => {
    store = storage(ROOMS_KEY);
    store.setItem("ethos-consent", "granted");
    vi.stubGlobal("localStorage", store);
    const refusing = await page();
    expect(() => {
      refusing.noteRoomVisit("/templates", NOW);
      refusing.noteRoomVisit("/dates", NOW);
    }).not.toThrow();
    expect(counted).toEqual([]);

    vi.stubGlobal("localStorage", undefined);
    const none = await page();
    expect(() => none.noteRoomVisit("/templates", NOW)).not.toThrow();
    expect(counted).toEqual([]);
  });

  it("nothing inside the iPhone app", async () => {
    vi.stubGlobal("window", { ...WINDOW, EthosNative: { version: 1, platform: "ios", locale: "en", signedIn: false, request: () => {} } });
    store.setItem("ethos-consent", "granted");
    const { noteRoomVisit } = await page();
    noteRoomVisit("/templates", NOW);
    noteRoomVisit("/dates", NOW);
    expect(store.getItem(ROOMS_KEY)).toBeNull();
    expect(counted).toEqual([]);
  });
});

describe("partner clicks per room", () => {
  // loop2-C7: the owner reads the room of each placement from the KPI page; it must match the code.
  it("the KPI page's table lists every placement under the room the code gives it", () => {
    const page = readFileSync("docs/marketing/LOOP-KPI.md", "utf8");
    const rows = Object.fromEntries(
      [...page.matchAll(/^\| (trips|dates|long distance|gifts) \| (.+) \|$/gm)].map(([, room, cells]) => [room, [...cells.matchAll(/`([a-z_]+)`/g)].map((m) => m[1]).sort()]),
    );
    const label: Record<string, string> = { trips: "trips", dates: "dates", longDistance: "long distance", gifts: "gifts" };
    const fromCode: Record<string, string[]> = {};
    for (const [placement, room] of Object.entries(PLACEMENT_ROOM)) (fromCode[label[room]] ??= []).push(placement);
    for (const list of Object.values(fromCode)) list.sort();
    expect(rows).toEqual(fromCode);
    expect(page).toContain("`two_rooms_30d`");
  });

  it("every partner button is in one room", () => {
    expect(Object.keys(PLACEMENT_ROOM).sort()).toEqual(["city", "gift_share", "meet_middle", "place_sheet", "plan", "trip_car", "trip_flights", "trip_stay", "trip_tickets", "trips_finder"]);
    for (const room of Object.values(PLACEMENT_ROOM)) expect(VISITED_ROOMS).toContain(room);
    for (const placement of ["trips_finder", "trip_flights", "trip_tickets", "trip_car", "trip_stay"] as const) expect(PLACEMENT_ROOM[placement]).toBe("trips");
  });

  it("the click still carries the partner and the placement, and nothing new", () => {
    expect(readFileSync("src/components/trips/partner-link.tsx", "utf8")).toContain('track("affiliate_click", { partner, placement, ...(trip ? { trip } : {}) })');
  });
});

describe("where the marker runs", () => {
  it("is mounted in the marketing layout and nowhere else: never on a gift, the editor or an account page", () => {
    const mounts: string[] = [];
    for (const dir of ["src/app", "src/components", "src/templates"])
      for (const file of readdirSync(dir, { recursive: true, encoding: "utf8" }))
        if (/\.tsx?$/.test(file) && readFileSync(join(dir, file), "utf8").includes("<RoomsSeen")) mounts.push(join(dir, file).replaceAll("\\", "/"));
    expect(mounts).toEqual(["src/app/[currency]/[locale]/(marketing)/layout.tsx"]);
  });
});
