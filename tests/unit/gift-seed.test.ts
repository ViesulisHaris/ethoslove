import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { mergeSeedFields, saveGiftSeed, takeGiftSeed } from "@/lib/editor/gift-seed";

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

const schema = z.object({
  trip: z.enum(["flight", "road", "train"]).default("flight"),
  toCity: z.string().min(1).max(40).default("Lisbon"),
  stops: z.array(z.string().trim().min(1).max(40)).max(5).default([]),
  nights: z.number().int().min(1).max(30).default(3),
});

describe("a gift that starts half made", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { sessionStorage: memoryStorage() });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("hands the fields to that template, once", () => {
    saveGiftSeed({ slug: "pack-your-bags", fields: { toCity: "Ravello", nights: 5 } });
    expect(takeGiftSeed("pack-your-bags")).toEqual({ slug: "pack-your-bags", fields: { toCity: "Ravello", nights: 5 } });
    expect(takeGiftSeed("pack-your-bags")).toBeNull();
  });

  it("ignores another template and a seed older than an hour", () => {
    saveGiftSeed({ slug: "pack-your-bags", fields: { toCity: "Ravello" } });
    expect(takeGiftSeed("passport")).toBeNull();
    vi.useFakeTimers();
    saveGiftSeed({ slug: "pack-your-bags", fields: { toCity: "Ravello" } });
    vi.advanceTimersByTime(61 * 60 * 1000);
    expect(takeGiftSeed("pack-your-bags")).toBeNull();
  });

  it("refuses fields that aren't an object, and a seed far too big", () => {
    window.sessionStorage.setItem("ethos:gift-seed", JSON.stringify({ slug: "pack-your-bags", fields: ["x"], savedAt: Date.now() }));
    expect(takeGiftSeed("pack-your-bags")).toBeNull();
    saveGiftSeed({ slug: "pack-your-bags", fields: { note: "x".repeat(30_000) } });
    expect(takeGiftSeed("pack-your-bags")).toBeNull();
    window.sessionStorage.setItem("ethos:gift-seed", "{not json");
    expect(takeGiftSeed("pack-your-bags")).toBeNull();
  });

  it("never throws when storage is blocked", () => {
    vi.stubGlobal("window", {});
    expect(() => saveGiftSeed({ slug: "pack-your-bags", fields: {} })).not.toThrow();
    expect(takeGiftSeed("pack-your-bags")).toBeNull();
  });
});

describe("merging a seed into a gift", () => {
  const defaults = schema.parse({});

  it("puts the seed over what was there", () => {
    const draft = { ...defaults, toCity: "Oslo", nights: 9 };
    expect(mergeSeedFields(schema, draft, { toCity: "Ravello", stops: ["Positano"], nights: 5 })).toEqual({ trip: "flight", toCity: "Ravello", stops: ["Positano"], nights: 5 });
  });

  it("drops a field that doesn't validate and keeps the rest", () => {
    expect(mergeSeedFields(schema, defaults, { toCity: "Ravello", nights: 99, trip: "boat" })).toEqual({ ...defaults, toCity: "Ravello" });
  });

  it("still lands on a draft that no longer validates, over the defaults", () => {
    const stale = { ...defaults, trip: "boat", nights: 0 };
    expect(mergeSeedFields(schema, stale, { toCity: "Ravello", trip: "road" })).toEqual({ ...defaults, toCity: "Ravello", trip: "road" });
  });

  it("gives nothing when nothing in the seed is usable", () => {
    expect(mergeSeedFields(schema, defaults, { nights: -1, toCity: "" })).toBeNull();
  });
});
