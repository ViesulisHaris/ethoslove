import { afterEach, describe, expect, it, vi } from "vitest";
import { heroSizes } from "@/lib/dates/art";
import { cuisineLabel, cuisineWords } from "@/lib/dates/cuisines";
import { datesUrls, EARLY_KEY, earlyScript, earlyStart, takeEarly, type EarlyOptions } from "@/lib/dates/early";
import { formatShort, formatStars, ideaHours } from "@/lib/dates/format";
import { MAPLIBRE_SHARED_URL, MAPLIBRE_URL, maplibreUrl, preloadMapLibre } from "@/lib/dates/map-vendor";
import { railStartsOver } from "@/components/dates/idea-rail";
import { createExits, fitsView, openArea, pinInArea, pinOrder } from "@/components/dates/map-pins";
import type { Place } from "@/lib/dates/places";

describe("pins on their way out", () => {
  afterEach(() => vi.useRealTimers());

  it("takes a pill off the map once its exit has run", () => {
    vi.useFakeTimers();
    const gone = vi.fn();
    const exits = createExits(180, gone);
    exits.start("a");
    expect(exits.has("a")).toBe(true);
    vi.advanceTimersByTime(179);
    expect(gone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(gone).toHaveBeenCalledWith("a");
    expect(exits.has("a")).toBe(false);
  });

  it("keeps a pill that is wanted back before it has gone (a card hovered for 90 ms)", () => {
    vi.useFakeTimers();
    const gone = vi.fn();
    const exits = createExits(180, gone);
    exits.start("stanfords");
    vi.advanceTimersByTime(90);
    expect(exits.cancel("stanfords")).toBe(true);
    vi.advanceTimersByTime(500);
    expect(gone).not.toHaveBeenCalled();
    expect(exits.cancel("stanfords")).toBe(false);
  });

  it("gives a pill pushed out again a whole exit, not what was left of the first", () => {
    vi.useFakeTimers();
    const gone = vi.fn();
    const exits = createExits(180, gone);
    exits.start("a");
    vi.advanceTimersByTime(150);
    exits.cancel("a");
    exits.start("a");
    vi.advanceTimersByTime(100);
    expect(gone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(80);
    expect(gone).toHaveBeenCalledTimes(1);
  });

  it("forgets every exit when the map goes", () => {
    vi.useFakeTimers();
    const gone = vi.fn();
    const exits = createExits(180, gone);
    exits.start("a");
    exits.start("b");
    exits.clear();
    vi.advanceTimersByTime(1000);
    expect(gone).not.toHaveBeenCalled();
  });
});

describe("where a pill can go", () => {
  const view = { w: 800, h: 600 };

  it("keeps a whole pill inside the map: it hangs 42px above its place", () => {
    expect(fitsView({ x: 400, y: 300 }, 60, view)).toBe(true);
    expect(fitsView({ x: 400, y: 49 }, 60, view)).toBe(false);
    expect(fitsView({ x: 400, y: 50 }, 60, view)).toBe(true);
    expect(fitsView({ x: 60, y: 300 }, 60, view)).toBe(false);
    expect(fitsView({ x: 400, y: 590 }, 60, view)).toBe(false);
  });

  it("keeps pills out from under the floating header on a wide screen", () => {
    expect(fitsView({ x: 400, y: 100 }, 60, view, 76)).toBe(false);
    expect(fitsView({ x: 400, y: 126 }, 60, view, 76)).toBe(true);
  });

  it("leaves the part of the map a phone's bottom sheet does not cover", () => {
    const phone = { w: 390, h: 664 };
    expect(openArea(phone, { x0: 0, y0: 252, x1: 390, y1: 664 })).toEqual({ x0: 0, y0: 0, x1: 390, y1: 252 });
  });

  it("leaves the part of the map right of a desktop's side sheet, below the header", () => {
    expect(openArea({ w: 880, h: 900 }, { x0: 24, y0: 236, x1: 414, y1: 876 }, 76)).toEqual({ x0: 414, y0: 76, x1: 880, y1: 900 });
  });

  it("ignores a sheet that isn't over the map at all", () => {
    expect(openArea(view, { x0: -500, y0: 0, x1: -10, y1: 600 })).toEqual({ x0: 0, y0: 0, x1: 800, y1: 600 });
    expect(openArea(view, null, 20)).toEqual({ x0: 0, y0: 20, x1: 800, y1: 600 });
  });

  it("says whether a chosen place's pill is in plain sight", () => {
    const area = { x0: 0, y0: 0, x1: 390, y1: 252 };
    expect(pinInArea({ x: 195, y: 150 }, area)).toBe(true);
    // Under the sheet, or with its pill cut by the top of the screen.
    expect(pinInArea({ x: 195, y: 400 }, area)).toBe(false);
    expect(pinInArea({ x: 195, y: 40 }, area)).toBe(false);
    // A chosen pill is up to 250px wide: one near the side of a phone would be cut by the edge.
    expect(pinInArea({ x: 100, y: 150 }, area)).toBe(false);
  });
});

describe("which pills get the room first", () => {
  const at = (id: string, score: number, rank?: number, distanceKm = 1) => ({ id, score, distanceKm, ...(rank ? { rank } : {}) }) as unknown as Place;

  it("follows the list's rank, not the raw score", () => {
    // The park the list ranks 46th has a higher raw score than its 10th: the map's best first is the list's.
    const places = [at("park", 74, 46), at("restaurant", 73, 10), at("bar", 73, 11)];
    expect(places.sort(pinOrder).map((p) => p.id)).toEqual(["restaurant", "bar", "park"]);
  });

  it("falls back to the score, then the distance, for places with no rank", () => {
    expect([at("far", 50, undefined, 3), at("near", 50, undefined, 1), at("best", 60)].sort(pinOrder).map((p) => p.id)).toEqual(["best", "near", "far"]);
    expect([at("plain", 99), at("ranked", 10, 1)].sort(pinOrder).map((p) => p.id)).toEqual(["ranked", "plain"]);
  });
});

describe("the idea rail after its ideas change", () => {
  const all = { order: "a b c", members: "a b c" };
  const reordered = { order: "c a b", members: "a b c" };
  const playful = { order: "b c", members: "b c" };

  it("starts another mood at its first card, however far it had been scrolled", () => {
    expect(railStartsOver(all, playful, 0)).toBe(true);
    expect(railStartsOver(all, playful, 792)).toBe(true);
  });

  it("keeps a rail nobody has scrolled at its start when the places reorder it", () => {
    expect(railStartsOver(all, reordered, 0)).toBe(true);
  });

  it("leaves a rail someone is flicking through to the card they were on", () => {
    expect(railStartsOver(all, reordered, 396)).toBe(false);
  });

  it("does nothing when the cards are the same", () => {
    expect(railStartsOver(all, { ...all }, 0)).toBe(false);
  });
});

describe("numbers in the reader's language", () => {
  it("writes stars with one decimal, in each language's own way", () => {
    expect(formatStars(4.5, "en")).toBe("4.5");
    expect(formatStars(4.5, "es")).toBe("4,5");
    expect(formatStars(4, "es")).toBe("4,0");
  });

  it("writes an idea's hours without a trailing zero", () => {
    expect(ideaHours(150, "en")).toBe("2.5");
    expect(ideaHours(150, "es")).toBe("2,5");
    expect(ideaHours(120, "es")).toBe("2");
    expect(formatShort(3.25, "es")).toBe("3,3");
  });
});

describe("what a place serves", () => {
  it("translates OpenStreetMap's cuisine words", () => {
    expect(cuisineLabel("coffee_shop", "es")).toBe("café");
    expect(cuisineLabel("coffee shop", "es")).toBe("café");
    expect(cuisineLabel("spanish", "es")).toBe("española");
    expect(cuisineLabel("argentinian", "en")).toBe("Argentinian");
  });

  it("leaves out in Spanish what it has no Spanish for, and shows it in English", () => {
    expect(cuisineLabel("smørrebrød", "es")).toBeNull();
    expect(cuisineLabel("smørrebrød", "en")).toBe("smørrebrød");
    expect(cuisineLabel("  ", "en")).toBeNull();
  });

  it("drops repeats and a word that only says the kind again", () => {
    expect(cuisineWords(["ice_cream", "coffee", "coffee shop", "cake"], "en", "Ice cream")).toEqual(["coffee", "cake"]);
    expect(cuisineWords(["spanish", "chicken", "fine_dining"], "es", "Restaurante")).toEqual(["española", "pollo"]);
    expect(cuisineWords(["unknown", "coffee shop"], "es", "Cafetería")).toEqual(["café"]);
  });
});

describe("the hero's sizes", () => {
  it("tells a dense phone a smaller slot, so it takes the 900 px file", () => {
    const sizes = heroSizes("(min-width: 1024px) 300px", "(min-width: 640px) 50vw");
    expect(sizes).toBe("(min-width: 1024px) 300px, (min-width: 640px) 50vw, (max-width: 639px) and (min-resolution: 2.2dppx) 300px, 100vw");
  });
});

describe("the map library", () => {
  it("asks for MapLibre under a new address after a failure", () => {
    expect(maplibreUrl(0)).toBe(MAPLIBRE_URL);
    expect(maplibreUrl(2)).toBe(`${MAPLIBRE_URL}?retry=2`);
    expect(MAPLIBRE_SHARED_URL).toBe(MAPLIBRE_URL.replace("maplibre-gl.mjs", "maplibre-gl-shared.mjs"));
  });

  it("asks for its second file beside the first, into the HTTP cache and not as a module", () => {
    // A failed module preload would stay failed for the whole visit, and the retry with it.
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(""));
    try {
      preloadMapLibre();
      expect(fetch).toHaveBeenCalledWith(MAPLIBRE_SHARED_URL, { priority: "high" });
    } finally {
      fetch.mockRestore();
    }
  });
});

describe("the search the page's HTML starts", () => {
  const options: EarlyOptions = { key: EARLY_KEY, whereKey: "ethos.dates.where.v1", locale: "es", radius: 1500, headingId: "dates-title", titleIn: "Ideas para una cita en {place}" };

  /** Runs the inline script as the page would: its own source, against a pretend window. */
  function run(search: string, saved: string | null = null, wide = false, extra: Partial<EarlyOptions> = {}) {
    const heading = { textContent: "Ideas para una cita cerca de ti" };
    const asked: string[] = [];
    const window: Record<string, unknown> = { location: { search }, localStorage: { getItem: () => saved }, matchMedia: () => ({ matches: wide }) };
    const document = { getElementById: (id: string) => (id === "dates-title" ? heading : null) };
    const fetch = (url: string) => {
      asked.push(url);
      return Promise.resolve(new Response("{}"));
    };
    new Function("window", "document", "fetch", earlyScript({ ...options, ...extra }))(window, document, fetch);
    return { heading, asked, parked: window[EARLY_KEY] as Record<string, unknown> | undefined };
  }

  const cases = [
    { lat: 51.5115, lng: -0.1235 },
    { lat: 38.71395, lng: -9.13945 },
    { lat: -34.60365, lng: -58.38155 },
    { lat: 0.0004, lng: -0.0004 },
    { lat: 40.4168, lng: -3.7038 },
  ];

  it("asks for exactly what the explorer will, so the answer is used", () => {
    for (const at of cases) {
      const { asked } = run(`?lat=${at.lat}&lng=${at.lng}&q=Madrid`);
      // The explorer snaps a town once in go() and again in search(): the same four addresses.
      const snapped = datesUrls(at, 1500, "es").snapped.center;
      const urls = datesUrls(snapped, 1500, "es");
      expect(asked.sort()).toEqual([urls.search, urls.photos, urls.rare, urls.weather].sort());
    }
  });

  it("names the town from the link in the heading, as text", () => {
    expect(run("?lat=40.4168&lng=-3.7038&q=Madrid").heading.textContent).toBe("Ideas para una cita en Madrid");
    // $& in a name is a name, not a replacement pattern.
    expect(run("?lat=40.4168&lng=-3.7038&q=A%24%26B").heading.textContent).toBe("Ideas para una cita en A$&B");
    expect(run("?lat=40.4168&lng=-3.7038").heading.textContent).toBe("Ideas para una cita cerca de ti");
  });

  it("uses last time's town without naming it, then the connection's guess", () => {
    const saved = run("", JSON.stringify({ lat: 40.4168, lng: -3.7038, name: "Madrid" }));
    expect(saved.asked).toContain(datesUrls({ lat: 40.4168, lng: -3.7038 }, 1500, "es").search);
    expect(saved.heading.textContent).toBe("Ideas para una cita cerca de ti");
    expect(run("?lat=999&lng=0").asked).toEqual(["/api/dates/here"]);
    expect(run("", "not json").asked).toEqual(["/api/dates/here"]);
  });

  it("names last time's town when it was one they picked, as the explorer will", () => {
    const picked = run("", JSON.stringify({ lat: 38.7139, lng: -9.1394, name: "Lisboa", share: true }));
    expect(picked.heading.textContent).toBe("Ideas para una cita en Lisboa");
    expect(picked.asked).toContain(datesUrls({ lat: 38.7139, lng: -9.1394 }, 1500, "es").search);
    // "Near me", or the connection's guess, stays unnamed.
    expect(run("", JSON.stringify({ lat: 38.7139, lng: -9.1394, name: "Cerca de ti", share: false })).heading.textContent).toBe("Ideas para una cita cerca de ti");
  });

  it("starts nothing for a town named without coordinates, which the explorer looks up first", () => {
    const saved = JSON.stringify({ lat: 40.4168, lng: -3.7038, name: "Madrid", share: true });
    const named = run("?q=Lisboa", saved);
    expect(named.asked).toEqual([]);
    expect(named.heading.textContent).toBe("Ideas para una cita cerca de ti");
    // One letter is not a town: last time's is used, as before.
    expect(run("?q=L", saved).asked).toContain(datesUrls({ lat: 40.4168, lng: -3.7038 }, 1500, "es").search);
  });

  it("parks each answer for the explorer to take once", async () => {
    const { parked } = run("?lat=40.4168&lng=-3.7038");
    const url = datesUrls({ lat: 40.4168, lng: -3.7038 }, 1500, "es").search;
    const own = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("[]"));
    (globalThis as Record<string, unknown>)[EARLY_KEY] = parked;
    try {
      expect(await (await takeEarly(url)).text()).toBe("{}");
      expect(own).not.toHaveBeenCalled();
      // Taken: the next search of the same place asks again.
      expect(await (await takeEarly(url)).text()).toBe("[]");
      expect(own).toHaveBeenCalledWith(url);
    } finally {
      own.mockRestore();
      delete (globalThis as Record<string, unknown>)[EARLY_KEY];
    }
  });

  it("starts the map's files on a wide screen only, where the map is always shown", () => {
    const warm = ["/vendor/maplibre-gl/x/maplibre-gl.mjs", "https://tiles.example/style"];
    expect(run("?lat=40.4168&lng=-3.7038", null, true, { warm }).asked).toEqual(expect.arrayContaining(warm));
    expect(run("?lat=40.4168&lng=-3.7038", null, false, { warm }).asked).not.toContain(warm[0]);
    // With nowhere to search yet, too.
    expect(run("", null, true, { warm }).asked).toEqual(["/api/dates/here", ...warm]);
  });

  it("can't be closed early by anything in its options", () => {
    const script = earlyScript({ ...options, titleIn: "</script><script>alert(1)</script>{place}" });
    expect(script).not.toContain("</script>");
    expect(typeof earlyStart).toBe("function");
  });
});
