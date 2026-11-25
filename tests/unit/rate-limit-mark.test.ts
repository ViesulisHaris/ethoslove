import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { swapMark } = await import("@/lib/rate-limit");

describe("swapMark, the limiter's memory of one answer (dates2-D1)", () => {
  it("M1 answers what was there and keeps the new value, in one step", async () => {
    expect(await swapMark("m1", "yes", 60)).toBeNull();
    expect(await swapMark("m1", "no", 60)).toBe("yes");
    expect(await swapMark("m1", null, 60)).toBe("no");
    expect(await swapMark("m1", "yes", 60)).toBeNull();
  });

  it("M2 forgets after its window", async () => {
    vi.useFakeTimers();
    try {
      await swapMark("m2", "yes", 10);
      vi.advanceTimersByTime(11_000);
      expect(await swapMark("m2", "no", 10)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
