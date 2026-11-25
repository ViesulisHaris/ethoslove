import { afterEach, describe, expect, it, vi } from "vitest";
import { walkingMinutes } from "@/lib/dates/geo";
import { PICKER_KEY, placesInReach, reachKm, readPicker, REACH_MINUTES, savePicker, withinReach } from "@/lib/dates/reach";

const at = { lat: 38.714, lng: -9.139 };
/** A point this many kilometres north of `at`. */
const north = (km: number) => ({ lat: at.lat + km / 111.2, lng: at.lng });

describe("a walk from where you stand (dates2)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("R1 the reach is walkingMinutes the other way round", () => {
    for (const m of REACH_MINUTES) expect(walkingMinutes(reachKm(m))).toBe(m);
  });

  it("R2b far from every place the distance is off, not a longer walk (dates2-C6)", () => {
    const places = [{ id: "a", ...north(0.5) }, { id: "b", ...north(1.5) }];
    // In the city: the walk chosen decides, and nothing within ten minutes is a real "none near".
    expect(placesInReach(places, at, 10)!.map((p) => p.id)).toEqual(["a"]);
    expect(placesInReach(places, north(-0.8), 10)).toEqual([]);
    // An ocean away: null, whatever the walk.
    for (const m of REACH_MINUTES) expect(placesInReach(places, { lat: 40.71, lng: -74.0 }, m)).toBeNull();
    // No places loaded is not "far": the planner says what it says when there are none.
    expect(placesInReach([], at, 10)).toEqual([]);
  });

  it("R2 a place is within reach by its distance, and never without coordinates", () => {
    const near = { id: "near", ...north(0.5) };
    const far = { id: "far", ...north(0.8) };
    const lost = { id: "lost", lat: Number.NaN, lng: at.lng };
    expect(withinReach([near, far, lost], at, 10).map((p) => p.id)).toEqual(["near"]);
    expect(withinReach([near, far, lost], at, 20).map((p) => p.id)).toEqual(["near", "far"]);
  });

  it("R3 only the two choices are read back, and only good values", () => {
    expect(readPicker(JSON.stringify({ setting: "indoors", reach: 20 }))).toEqual({ setting: "indoors", reach: 20 });
    expect(readPicker(JSON.stringify({ setting: "x", reach: 15, lat: 56.9, lng: 24.1 }))).toEqual({});
    expect(readPicker("not json")).toEqual({});
    expect(readPicker(null)).toEqual({});
  });

  it("R4 what is saved holds the setting and the reach, and nothing else", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", { localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) } });
    savePicker({ setting: "outdoors", reach: 10, ...({ lat: 38.7, lng: -9.1 } as object) });
    const saved = store.get(PICKER_KEY)!;
    expect(JSON.parse(saved)).toEqual({ setting: "outdoors", reach: 10 });
    expect(saved).not.toContain("38.7");
    savePicker({});
    expect(store.has(PICKER_KEY)).toBe(false);
  });
});
