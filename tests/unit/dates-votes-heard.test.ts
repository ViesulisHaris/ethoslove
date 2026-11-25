import { afterEach, describe, expect, it, vi } from "vitest";
import { heardVotes, votesOff } from "@/components/dates/use-done";

/** A tab's sessionStorage, as a map. */
function tab() {
  const store = new Map<string, string>();
  vi.stubGlobal("window", { sessionStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) } });
  return store;
}

describe("what the votes route said, kept for the tab (dates2-C8, C9)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("V1 only an answer that says available true or false is kept", () => {
    const store = tab();
    for (const said of [null, undefined, {}, { error: "rate_limited" }, { error: "unavailable" }, { available: "no" }, "x"]) {
      expect(heardVotes(said), JSON.stringify(said)).toBeNull();
    }
    expect(store.size).toBe(0);
    expect(votesOff()).toBe(false);
  });

  it("V2 'not available' from the map's sheet is kept, so the next sheet asks nothing", () => {
    tab();
    expect(heardVotes({ available: false, liked: {} })).toBe(false);
    expect(votesOff()).toBe(true);
    expect(heardVotes({ available: true, liked: {} })).toBe(true);
    expect(votesOff()).toBe(false);
  });
});
