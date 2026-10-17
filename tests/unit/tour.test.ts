import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { routing } from "@/i18n/routing";
import { TRIP_GIFT_SLUG } from "@/lib/trips/trip-gift";
import { roomForPath, TOUR_ROOMS } from "@/lib/tour/room";
import { canShow, playableSteps, stepAfter, TOURS, TRIP_GIFT_LINK, type TourStep } from "@/lib/tour/steps";
import { isCovered } from "@/lib/tour/dom";
import { cardWidth, EDGE, GAP, glide, placeCard, scrollBand, scrollNeeded, spotlight, spotRadius, SPOT_PAD, type Box } from "@/lib/tour/geometry";

describe("roomForPath", () => {
  it("finds each room, in every locale, on its own pages and below them", () => {
    const cases: [string, string][] = [
      ["/dates", "dates"],
      ["/create/bloom", "editor"],
      ["/games", "games"],
      ["/games/deck", "games"],
      ["/trips", "trips"],
      ["/trips/lisbon-long-weekend", "trips"],
    ];
    for (const [path, room] of cases) {
      expect(roomForPath(path), path).toBe(room);
      for (const locale of routing.locales) expect(roomForPath(`/${locale}${path}`), `/${locale}${path}`).toBe(room);
    }
  });

  it("never lands on a gift, a demo or a page without a tour", () => {
    // `/dates/<city>` is a static page for search engines, not the explorer the Dates tour walks through.
    for (const path of ["/", "/g/abc123", "/g", "/demo/bloom", "/demo", "/pricing", "/templates", "/plan", "/datesx", "/dates/lisbon", "/es/dates/lisbon", "/long-distance", "/es", "/es/g/abc123", "/en/demo/bloom"]) {
      expect(roomForPath(path), path).toBeNull();
    }
  });
});

describe("the tours", () => {
  const catalogues = { en, es } as const;

  it("say every step in both languages", () => {
    for (const room of TOUR_ROOMS) {
      for (const step of TOURS[room].steps) {
        for (const [locale, messages] of Object.entries(catalogues)) {
          const words = (messages.tour as Record<string, unknown>)[room] as Record<string, { title?: string; body?: string }> | undefined;
          expect(words?.[step.id]?.title, `${locale} tour.${room}.${step.id}.title`).toBeTruthy();
          expect(words?.[step.id]?.body, `${locale} tour.${room}.${step.id}.body`).toBeTruthy();
        }
      }
    }
  });

  it("give every step a unique id and something to point at", () => {
    for (const room of TOUR_ROOMS) {
      const { steps, ready } = TOURS[room];
      expect(new Set(steps.map((s) => s.id)).size, room).toBe(steps.length);
      expect(ready.length, room).toBeGreaterThan(0);
      for (const step of steps) expect(step.targets.length, `${room}.${step.id}`).toBeGreaterThan(0);
    }
  });

  it("never mention a country or city the site keeps out of its copy", () => {
    const text = JSON.stringify([en.tour, es.tour]);
    expect(text).not.toMatch(/spain|españa|madrid|barcelona|sevilla|valencia/i);
  });

  it("point at the trips page's own gift button", () => {
    expect(TRIP_GIFT_LINK).toContain(`/templates/${TRIP_GIFT_SLUG}"`);
  });
});

describe("step filtering", () => {
  const steps: TourStep[] = [
    { id: "a", targets: ["#a"] },
    { id: "b", targets: ["#b"] },
    { id: "c", targets: ["#c"] },
    { id: "d", targets: ["#d"], fallback: "center" },
  ];
  const present = (ids: string[]) => (step: TourStep) => ids.includes(step.id);

  it("keeps the steps with a target on screen, in order", () => {
    expect(playableSteps(steps, present(["a", "c"])).map((s) => s.id)).toEqual(["a", "c", "d"]);
  });

  it("keeps a step that can stand in the middle of the screen even with nothing to point at", () => {
    expect(canShow(steps[3], present([]))).toBe(true);
    expect(playableSteps(steps, present([])).map((s) => s.id)).toEqual(["d"]);
  });

  it("passes over a step whose target has gone since the tour began, both ways", () => {
    expect(stepAfter(steps, 0, 1, present(["a", "c"]))).toBe(2);
    expect(stepAfter(steps, 2, -1, present(["a", "c"]))).toBe(0);
    expect(stepAfter(steps, 2, 1, present(["a", "c"]))).toBe(-1);
    expect(stepAfter(steps, 0, -1, present(["a", "b", "c", "d"]))).toBe(-1);
  });
});

describe("remembering the tour was shown", () => {
  beforeEach(() => {
    // The in-memory half lives in the module, so each test gets a fresh one.
    vi.resetModules();
  });

  const memoryStore = () => {
    const data = new Map<string, string>();
    return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), data };
  };

  it("is per room, and survives a new page load through storage", async () => {
    const store = memoryStore();
    const first = await import("@/lib/tour/seen");
    expect(first.hasSeenTour("dates", store)).toBe(false);
    first.markTourSeen("dates", store);
    expect(store.data.get(first.tourKey("dates"))).toBe("1");
    expect(first.hasSeenTour("games", store)).toBe(false);

    vi.resetModules();
    const reloaded = await import("@/lib/tour/seen");
    expect(reloaded.hasSeenTour("dates", store)).toBe(true);
  });

  it("still shows only once per visit when storage throws or is missing", async () => {
    const broken = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    const seen = await import("@/lib/tour/seen");
    expect(seen.hasSeenTour("trips", broken)).toBe(false);
    expect(() => seen.markTourSeen("trips", broken)).not.toThrow();
    expect(seen.hasSeenTour("trips", broken)).toBe(true);
    expect(seen.hasSeenTour("editor", null)).toBe(false);
    seen.markTourSeen("editor", null);
    expect(seen.hasSeenTour("editor", null)).toBe(true);
  });

  it("does nothing worse than forget when there is no window at all", async () => {
    const seen = await import("@/lib/tour/seen");
    expect(seen.hasSeenTour("games")).toBe(false);
    expect(() => seen.markTourSeen("games")).not.toThrow();
  });
});

describe("placing the spotlight and the card", () => {
  const phone = { width: 360, height: 740 };
  const laptop = { width: 1280, height: 800 };
  const box = (top: number, left: number, width: number, height: number): Box => ({ top, left, width, height });

  it("lights a little round the target, and never past the screen", () => {
    expect(spotlight(box(100, 50, 200, 40), laptop)).toEqual(box(92, 42, 216, 56));
    const tall = spotlight(box(-300, 0, 360, 2000), phone);
    expect(tall.top).toBeGreaterThanOrEqual(0);
    expect(tall.top + tall.height).toBeLessThanOrEqual(phone.height);
    expect(tall.left + tall.width).toBeLessThanOrEqual(phone.width);
  });

  it("docks the card to the bottom of a phone, full width, when the target is higher up", () => {
    const spot = placeCard(box(120, 20, 320, 48), 220, phone);
    expect(spot.dock).toBe("bottom");
    expect(spot.width).toBe(phone.width - 2 * EDGE);
    expect(spot.top + 220).toBe(phone.height - EDGE);
  });

  it("docks it to the top when the target is down where the card would go, so it never covers it", () => {
    const target = box(660, 100, 160, 48);
    const spot = placeCard(target, 220, phone);
    expect(spot.dock).toBe("top");
    expect(spot.top + 220 + GAP).toBeLessThanOrEqual(target.top);
  });

  it("keeps clear of the home indicator", () => {
    const spot = placeCard(box(120, 20, 320, 48), 220, phone, { top: 47, bottom: 34 });
    expect(spot.top + 220).toBe(phone.height - 34 - EDGE);
  });

  it("floats beside the target on a wide screen: below, then above, then to a side", () => {
    const below = placeCard(box(200, 100, 300, 50), 200, laptop);
    expect(below).toMatchObject({ dock: "float", top: 200 + 50 + GAP });
    const above = placeCard(box(620, 100, 300, 50), 200, laptop);
    expect(above).toMatchObject({ dock: "float", top: 620 - GAP - 200 });
    const tall = box(90, 700, 500, 700);
    const beside = placeCard(tall, 200, laptop);
    expect(beside.dock).toBe("float");
    expect(beside.left + beside.width).toBeLessThanOrEqual(tall.left);
  });

  it("never lets the card run off the side of the screen", () => {
    const spot = placeCard(box(200, 1240, 30, 30), 200, laptop);
    expect(spot.left).toBeGreaterThanOrEqual(EDGE);
    expect(spot.left + spot.width).toBeLessThanOrEqual(laptop.width - EDGE);
  });

  it("centres the card when there is nothing to point at", () => {
    expect(placeCard(null, 200, laptop)).toMatchObject({ dock: "center", top: 300, left: (laptop.width - cardWidth(laptop)) / 2 });
    expect(placeCard(null, 200, phone).dock).toBe("bottom");
  });

  it("scrolls only as far as it has to", () => {
    const band = { top: 92, bottom: 500 };
    expect(scrollNeeded(box(200, 0, 100, 40), band)).toBe(0);
    // Below the band: its middle goes to the band's middle.
    expect(scrollNeeded(box(900, 0, 100, 40), band)).toBe(920 - 296);
    // Under the header: back up the same way.
    expect(scrollNeeded(box(10, 0, 100, 40), band)).toBe(30 - 296);
    // Taller than the band: its top meets the band's top.
    expect(scrollNeeded(box(700, 0, 100, 600), band)).toBe(700 - 92);
  });

  it("leaves room for the docked card when working out where a target should land on a phone", () => {
    const band = scrollBand(phone, 76, 220);
    expect(band.top).toBe(76 + EDGE);
    expect(band.bottom).toBe(phone.height - EDGE - 220 - GAP);
    expect(scrollBand(laptop, 76, 220).bottom).toBe(laptop.height - EDGE);
  });

  it("rounds the lit area like its target: a pill as a pill, a square thing gently", () => {
    expect(spotRadius(9999, 64)).toBe(32);
    expect(spotRadius(22, 200)).toBe(22 + SPOT_PAD);
    expect(spotRadius(0, 200)).toBeGreaterThan(SPOT_PAD);
    expect(spotRadius(0, 0)).toBe(0);
  });

  it("glides towards the goal, and lands on it", () => {
    const from = box(0, 0, 100, 100);
    const to = box(100, 100, 200, 200);
    const half = glide(from, to, 0.5);
    expect(half).toEqual(box(50, 50, 150, 150));
    expect(glide(from, to, 1)).toEqual(to);
    expect(glide(box(99.8, 100, 200, 200), to, 0.1).top).toBe(100);
  });
});

describe("telling whether something is drawn over the first target", () => {
  type Rect = { top: number; left: number; width: number; height: number };
  type Fake = { parent: Fake | null; ui: boolean; getBoundingClientRect: () => DOMRect; contains: (other: Fake) => boolean; closest: (selector: string) => Fake | null };
  const make = (rect: Rect, parent: Fake | null = null, ui = false): Fake => {
    const el: Fake = {
      parent,
      ui,
      getBoundingClientRect: () => ({ ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height, x: rect.left, y: rect.top, toJSON: () => rect }),
      contains: (other) => {
        for (let node: Fake | null = other; node; node = node.parent) if (node === el) return true;
        return false;
      },
      closest: () => {
        for (let node: Fake | null = el; node; node = node.parent) if (node.ui) return node;
        return null;
      },
    };
    return el;
  };
  const page = make({ top: 0, left: 0, width: 360, height: 3000 });
  const whereBox = make({ top: 200, left: 20, width: 320, height: 48 }, page);
  const input = make({ top: 204, left: 60, width: 240, height: 40 }, whereBox);
  let hit: Fake | null = null;
  const elementFromPoint = vi.fn(() => hit);

  beforeEach(() => {
    elementFromPoint.mockClear();
    vi.stubGlobal("window", { innerHeight: 740 });
    vi.stubGlobal("document", { documentElement: { clientWidth: 360 }, elementFromPoint });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  const covered = (el: Fake | null) => isCovered(el as unknown as Element);

  it("sees a full-screen layer over it, like the Dates map opened on a phone", () => {
    hit = make({ top: 0, left: 0, width: 360, height: 740 });
    expect(covered(whereBox)).toBe(true);
    expect(elementFromPoint).toHaveBeenCalledWith(180, 224);
  });

  it("is clear when what answers is the target, something in it, or the page around it", () => {
    for (const answer of [whereBox, input, page]) {
      hit = answer;
      expect(covered(whereBox)).toBe(false);
    }
  });

  it("doesn't count the tour's own button as covering anything", () => {
    hit = make({ top: 200, left: 250, width: 110, height: 36 }, null, true);
    expect(covered(whereBox)).toBe(false);
  });

  it("says nothing about a target off screen, or none at all, and doesn't ask the page", () => {
    hit = make({ top: 0, left: 0, width: 360, height: 740 });
    expect(covered(make({ top: 1200, left: 20, width: 320, height: 90 }, page))).toBe(false);
    expect(covered(null)).toBe(false);
    expect(elementFromPoint).not.toHaveBeenCalled();
  });

  it("asks about the part that shows when the target runs off the screen", () => {
    hit = whereBox;
    covered(make({ top: 600, left: 20, width: 320, height: 400 }, page));
    expect(elementFromPoint).toHaveBeenCalledWith(180, 670);
  });
});
