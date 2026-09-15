import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveReplySeed, takeReplySeed } from "@/lib/editor/reply-seed";

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

describe("send one back", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { sessionStorage: memoryStorage() });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("hands the swapped names to the same template, once", () => {
    saveReplySeed({ slug: "bouquet", recipientName: "Leo", senderName: "Mia" });
    expect(takeReplySeed("bouquet")).toEqual({ slug: "bouquet", recipientName: "Leo", senderName: "Mia" });
    expect(takeReplySeed("bouquet")).toBeNull();
  });

  it("ignores another template and a seed older than an hour", () => {
    saveReplySeed({ slug: "bouquet", recipientName: "Leo", senderName: "Mia" });
    expect(takeReplySeed("the-letter")).toBeNull();
    vi.useFakeTimers();
    saveReplySeed({ slug: "bouquet", recipientName: "Leo", senderName: "Mia" });
    vi.advanceTimersByTime(61 * 60 * 1000);
    expect(takeReplySeed("bouquet")).toBeNull();
  });

  it("never throws when storage is blocked", () => {
    vi.stubGlobal("window", {});
    expect(() => saveReplySeed({ slug: "bouquet", recipientName: "Leo", senderName: "Mia" })).not.toThrow();
    expect(takeReplySeed("bouquet")).toBeNull();
  });
});
