import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { giftDataBaseSchema, giftUnwrapSchema, type GiftData, type GiftUnwrap } from "@/lib/gift/schema";
import { isUnwrapDay, isUnwrapImage, isUnwrapLink } from "@/lib/gift/unwrap-rules";
import { decidePublish, liveEditNeedsUnlock, premiumExtras } from "@/lib/gift/publish";
import { saveGiftSeed, seedUnwrap, takeGiftSeed } from "@/lib/editor/gift-seed";
import { kindLabel, stopArt, tripDates, tripNights, unwrapDay, unwrapIcs } from "@/templates/_shared/unwrap";
import { manifest as letter } from "@/templates/the-letter/manifest";
import { manifest as vinyl } from "@/templates/vinyl/manifest";

const minimal = { templateSlug: "the-letter", recipientName: "Ana", senderName: "Marco" };
const COMMONS = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Torre_de_Bel%C3%A9m_(Lisboa).jpg/160px-Torre_de_Bel%C3%A9m_(Lisboa).jpg";

const date: GiftUnwrap = {
  kind: "date",
  title: "Museum, then wine",
  date: "2026-10-17",
  city: "Lisbon",
  stops: [
    { name: "Museu do Oriente", time: "18:00", kind: "museum", lat: 38.7036, lng: -9.1733, image: COMMONS },
    { name: "Taberna, Boa; Noite", time: "20:30", kind: "restaurant", lat: 38.71, lng: -9.14, note: "Ask for the table by the window" },
  ],
  link: "/plan#p=abc_DEF-123",
};

const trip: GiftUnwrap = {
  kind: "trip",
  title: "The Amalfi Coast",
  city: "Naples",
  image: "/trips/amalfi-coast-sm.webp",
  stops: [{ name: "Positano", lat: 40.628, lng: 14.485 }],
  link: "/trips/amalfi-coast",
  trip: { to: "Naples", nights: 5, mode: "flight" },
};

describe("a surprise inside, as the gift schema reads it", () => {
  it("is optional: a gift made before it existed parses as it always did", () => {
    const parsed = giftDataBaseSchema.parse(minimal);
    expect(parsed.unwrap).toBeUndefined();
  });

  it("takes a date and a trip", () => {
    expect(giftDataBaseSchema.parse({ ...minimal, unwrap: date }).unwrap).toEqual(date);
    expect(giftDataBaseSchema.parse({ ...minimal, unwrap: trip }).unwrap).toEqual(trip);
    expect(giftUnwrapSchema.parse({ kind: "date", title: "Soon" }).stops).toEqual([]);
  });

  it("holds every part to its limits", () => {
    const bad = (patch: Record<string, unknown>) => giftUnwrapSchema.safeParse({ ...date, ...patch }).success;
    expect(bad({ title: "x".repeat(81) })).toBe(false);
    expect(bad({ title: "   " })).toBe(false);
    expect(bad({ when: "x".repeat(41) })).toBe(false);
    expect(bad({ city: "x".repeat(61) })).toBe(false);
    expect(bad({ date: "2026-02-30" })).toBe(false);
    expect(bad({ date: "17/10/2026" })).toBe(false);
    expect(bad({ kind: "cruise" })).toBe(false);
    expect(bad({ stops: Array.from({ length: 9 }, (_, i) => ({ name: `Stop ${i}` })) })).toBe(false);
    expect(bad({ stops: [{ name: "A", time: "24:00" }] })).toBe(false);
    expect(bad({ stops: [{ name: "A", lat: 91 }] })).toBe(false);
    expect(bad({ stops: [{ name: "A", note: "x".repeat(141) }] })).toBe(false);
    expect(bad({ stops: [{ name: "x".repeat(81) }] })).toBe(false);
    expect(bad({ trip: { to: "Naples", mode: "boat" } })).toBe(false);
    expect(bad({ trip: { to: "Naples", mode: "flight", nights: 0 } })).toBe(false);
    expect(bad({ trip: { to: "Naples", mode: "flight", nights: 61 } })).toBe(false);
    expect(bad({ trip: { to: "", mode: "flight" } })).toBe(false);
    expect(bad({ trip: { to: "Naples", mode: "road", depart: "2026-13-01" } })).toBe(false);
  });

  it("fails a gift whose surprise points anywhere the allow-list doesn't name", () => {
    expect(giftDataBaseSchema.safeParse({ ...minimal, unwrap: { ...date, image: "https://tracker.example/pixel.gif" } }).success).toBe(false);
    expect(giftDataBaseSchema.safeParse({ ...minimal, unwrap: { ...date, stops: [{ name: "A", image: "https://tracker.example/a.jpg" }] } }).success).toBe(false);
    expect(giftDataBaseSchema.safeParse({ ...minimal, unwrap: { ...date, link: "https://phishing.example/plan" } }).success).toBe(false);
  });
});

describe("the picture allow-list", () => {
  it("lets in Wikimedia's two image hosts and this site's own pictures", () => {
    for (const ok of [COMMONS, "https://thumb.wikimedia.org/x/y.jpg", "/dates/kinds/cafe.webp", "/dates/ideas/museum-then-wine.webp", "/trips/amalfi-coast-sm.webp", "/templates/the-letter/poster.jpg"]) {
      expect(isUnwrapImage(ok), ok).toBe(true);
    }
  });

  it("keeps everything else out", () => {
    for (const bad of [
      "https://tracker.example/pixel.gif",
      "http://upload.wikimedia.org/a.jpg",
      "https://upload.wikimedia.org.evil.example/a.jpg",
      "https://commons.wikimedia.org/wiki/File:A.jpg",
      "//upload.wikimedia.org/a.jpg",
      "//evil.example/dates/a.jpg",
      "/api/dates/photo?name=x",
      "/dates/../api/track",
      "/dates/%2e%2e/api/track",
      "/dates/a.webp?track=1",
      "/uploads/a.jpg",
      "dates/a.webp",
      "javascript:alert(1)",
      "data:image/svg+xml;base64,PHN2Zz4=",
      'https://upload.wikimedia.org/a.jpg" onerror="x',
      "https://upload.wikimedia.org/a b.jpg",
      `https://upload.wikimedia.org/${"a".repeat(600)}.jpg`,
      "",
      42,
      null,
    ]) {
      expect(isUnwrapImage(bad), String(bad)).toBe(false);
    }
  });

  it("links only to a plan or a preset trip on this site", () => {
    for (const ok of ["/plan#p=abc_DEF-123", "/es/plan#p=x", "/trips/amalfi-coast", "/es/trips/lisbon-slow-weekend"]) expect(isUnwrapLink(ok), ok).toBe(true);
    for (const bad of ["https://tryethos.io/plan#p=abc", "//evil.example/plan#p=a", "/plan", "/plan#p=", "/plan#p=a b", "/plan?p=abc", "/trips/../api", "/trips/Amalfi", "/templates", "/fr/plan#p=a", "javascript:alert(1)", undefined]) {
      expect(isUnwrapLink(bad), String(bad)).toBe(false);
    }
  });

  it("knows a real calendar day", () => {
    expect(isUnwrapDay("2028-02-29")).toBe(true);
    expect(isUnwrapDay("2026-02-29")).toBe(false);
    expect(isUnwrapDay("2026-1-5")).toBe(false);
  });
});

describe("what the surprise costs", () => {
  const photos = [1, 2, 3].map((n) => ({ id: `p${n}`, url: `gifts/g1/${n}.webp`, width: 10, height: 10 }));
  const base: GiftData = { ...giftDataBaseSchema.parse(minimal), message: "Hi", photos, fields: {} };
  const none = { removeWatermark: false, schedule: false, password: false };

  it("is a paid extra on a free template, made special once", () => {
    expect(premiumExtras({ ...base, unwrap: date })).toEqual(["unwrap"]);
    expect(decidePublish(letter, base, { unlocked: false }, none)).toMatchObject({ ok: true, watermark: true });
    expect(decidePublish(letter, { ...base, unwrap: date }, { unlocked: false }, none)).toEqual({ ok: false, reason: "payment_required" });
    expect(decidePublish(letter, { ...base, unwrap: date }, { unlocked: true }, none)).toMatchObject({ ok: true });
    expect(liveEditNeedsUnlock(letter, { ...base, unwrap: trip }, { hasSchedule: false, hasPassword: false, watermark: true })).toBe(true);
    expect(liveEditNeedsUnlock(letter, base, { hasSchedule: false, hasPassword: false, watermark: true })).toBe(false);
  });

  it("comes with a premium template's unlock", () => {
    expect(vinyl.tier).toBe("premium");
    const withTrip = { ...base, templateSlug: "vinyl", unwrap: trip };
    expect(decidePublish(vinyl, withTrip, { unlocked: true }, none)).toEqual(decidePublish(vinyl, { ...withTrip, unwrap: undefined }, { unlocked: true }, none));
    expect(decidePublish(vinyl, withTrip, { unlocked: true }, none)).toMatchObject({ ok: true, isPremium: true });
  });
});

describe("the words around it", () => {
  it("says the day in the gift's language, or the sender's own words, or nothing", () => {
    expect(unwrapDay({ date: "2026-10-17" }, "en")).toBe("Saturday 17 October");
    expect(unwrapDay({ date: "2026-10-17" }, "es")).toBe("sábado, 17 de octubre");
    expect(unwrapDay({ when: " This spring " }, "en")).toBe("This spring");
    expect(unwrapDay({}, "en")).toBeNull();
  });

  it("names a kind of place in either language, and draws the ones it knows", () => {
    expect(kindLabel("museum", "es")).toBe("Museo");
    expect(kindLabel("rooftop pool", "en")).toBe("rooftop pool");
    expect(kindLabel(undefined, "en")).toBeNull();
    expect(stopArt({ name: "Museu do Oriente", kind: "museum" })?.src).toMatch(/^\/dates\//);
    expect(stopArt({ name: "Somewhere", kind: "rooftop pool" })).toBeNull();
  });

  it("counts the nights between the two days when there are both", () => {
    expect(tripNights({ to: "Naples", mode: "flight", depart: "2026-10-12", back: "2026-10-17", nights: 3 })).toBe(5);
    expect(tripNights({ to: "Naples", mode: "flight", nights: 3 })).toBe(3);
    expect(tripNights({ to: "Naples", mode: "flight" })).toBeNull();
    expect(tripDates({ to: "Naples", mode: "flight", depart: "2026-10-12", back: "2026-10-17" }, "en")).toBe("12 Oct – 17 Oct");
    expect(tripDates({ to: "Naples", mode: "flight" }, "en")).toBeNull();
  });
});

describe("add to calendar", () => {
  const NOW = new Date(Date.UTC(2026, 8, 23, 10, 0, 0));
  const lines = (ics: string) => ics.split("\r\n");

  it("books each timed stop until the next one starts, the last for an hour and a half", () => {
    const ics = unwrapIcs(date, "en", NOW)!;
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("DTSTART:20261017T180000\r\nDTEND:20261017T203000");
    expect(ics).toContain("DTSTART:20261017T203000\r\nDTEND:20261017T220000");
    expect(ics).toContain("DTSTAMP:20260923T100000Z");
    // Commas and semicolons are escaped, as RFC 5545 asks.
    expect(ics).toContain("SUMMARY:Taberna\\, Boa\\; Noite");
    expect(ics).toContain("GEO:38.7036;-9.1733");
    // Every line fits in 75 octets.
    for (const line of lines(ics)) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it("runs past midnight into the next day", () => {
    const late = { ...date, stops: [{ name: "Bar", time: "23:30" }, { name: "Late snack", time: "00:30" }] };
    const ics = unwrapIcs(late, "en", NOW)!;
    expect(ics).toContain("DTSTART:20261017T233000\r\nDTEND:20261018T003000");
    expect(ics).toContain("DTSTART:20261018T003000\r\nDTEND:20261018T020000");
  });

  it("is one evening when any stop has no time, with the stops written into it", () => {
    const loose = { ...date, stops: [{ name: "Park" }, { name: "Cinema", time: "21:00" }] };
    const ics = unwrapIcs(loose, "es", NOW)!;
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    // The park comes first and has no time, so the evening starts at seven, not at the film.
    expect(ics).toContain("DTSTART:20261017T190000\r\nDTEND:20261017T230000");
    const timedFirst = unwrapIcs({ ...date, stops: [{ name: "Cinema", time: "21:00" }, { name: "Park" }, { name: "Bar", time: "22:00" }] }, "en", NOW)!;
    expect(timedFirst).toContain("DTSTART:20261017T210000\r\nDTEND:20261017T233000");
    expect(ics.replace(/\r\n /g, "")).toContain("DESCRIPTION:1. Park\\n2. Cinema a las 21:00");
    const bare = unwrapIcs({ ...date, stops: [] }, "en", NOW)!;
    expect(bare).toContain("DTSTART:20261017T190000\r\nDTEND:20261017T230000");
  });

  it("folds a long line without splitting a character", () => {
    const long = { ...date, stops: [{ name: "Ñ".repeat(80), time: "19:00" }] };
    const ics = unwrapIcs(long, "en", NOW)!;
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain(`SUMMARY:${"Ñ".repeat(80)}`);
    for (const line of lines(ics)) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it("has nothing to book without a day, or for a trip", () => {
    expect(unwrapIcs({ ...date, date: undefined }, "en", NOW)).toBeNull();
    expect(unwrapIcs(trip, "en", NOW)).toBeNull();
  });
});

describe("a surprise handed to the editor", () => {
  function memoryStorage(): Storage {
    const map = new Map<string, string>();
    return {
      get length() {
        return map.size;
      },
      clear: () => map.clear(),
      getItem: (k) => map.get(k) ?? null,
      key: (i) => [...map.keys()][i] ?? null,
      removeItem: (k) => void map.delete(k),
      setItem: (k, v) => void map.set(k, String(v)),
    };
  }
  beforeEach(() => vi.stubGlobal("window", { sessionStorage: memoryStorage() }));
  afterEach(() => vi.unstubAllGlobals());

  it("rides along with the seed, next to the fields", () => {
    saveGiftSeed({ slug: "the-letter", fields: {}, unwrap: date });
    const seed = takeGiftSeed("the-letter");
    expect(seed).toEqual({ slug: "the-letter", fields: {}, unwrap: date });
    expect(seedUnwrap(giftUnwrapSchema, seed?.unwrap)).toEqual(date);
  });

  it("is left out whole when any part of it fails the schema", () => {
    expect(seedUnwrap(giftUnwrapSchema, { ...date, stops: [{ name: "A", image: "https://tracker.example/a.jpg" }] })).toBeNull();
    expect(seedUnwrap(giftUnwrapSchema, ["not", "a", "surprise"])).toBeNull();
    expect(seedUnwrap(giftUnwrapSchema, undefined)).toBeNull();
    window.sessionStorage.setItem("ethos:gift-seed", JSON.stringify({ slug: "the-letter", fields: {}, unwrap: "nope", savedAt: Date.now() }));
    expect(takeGiftSeed("the-letter")).toEqual({ slug: "the-letter", fields: {} });
  });
});
