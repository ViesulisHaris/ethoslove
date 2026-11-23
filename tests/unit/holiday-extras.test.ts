import { describe, expect, it } from "vitest";
import { extraFor, HOLIDAY_EXTRAS } from "@/lib/lifecycle/holiday-extras";

/** A gift begun and first published at the same instant, as most are. */
const made = (at: string, paid = true) => extraFor({ createdAt: at, publishedAt: at, paid });
const second = (iso: string, by: number) => new Date(Date.parse(iso) + by * 1000).toISOString();

describe("the Tree Tag's days", () => {
  it("is one extra, from the start of 24 November to the end of the 20th anywhere on earth", () => {
    expect(HOLIDAY_EXTRAS).toEqual([{ id: "tree-tag", from: "2026-11-24T00:00:00Z", until: "2026-12-21T12:00:00Z" }]);
  });

  it("starts on 24 November, not a second before", () => {
    expect(made(second("2026-11-24T00:00:00Z", -1))).toBeNull();
    expect(made("2026-11-24T00:00:00Z")).toBe("tree-tag");
    expect(made(second("2026-11-24T00:00:00Z", 1))).toBe("tree-tag");
  });

  it("holds while it is still 20 December somewhere, and ends a second after", () => {
    // 11:59:59 on the 20th at UTC-12 is 11:59:59 UTC on the 21st.
    expect(made(second("2026-12-21T12:00:00Z", -1))).toBe("tree-tag");
    expect(made("2026-12-21T12:00:00Z")).toBe("tree-tag");
    expect(made(second("2026-12-21T12:00:00Z", 1))).toBeNull();
  });

  it("is late on the 20th in Honolulu and in Auckland's 21st alike, and over on Christmas", () => {
    expect(made("2026-12-20T23:30:00-10:00")).toBe("tree-tag");
    expect(made("2026-12-21T09:00:00+13:00")).toBe("tree-tag");
    expect(made("2026-12-25T08:00:00Z")).toBeNull();
  });

  it("gives nothing to a free gift", () => {
    expect(made("2026-12-01T10:00:00Z", false)).toBeNull();
  });

  it("gives nothing to a gift never published", () => {
    expect(extraFor({ createdAt: "2026-12-01T10:00:00Z", publishedAt: null, paid: true })).toBeNull();
  });

  it("gives nothing to a gift from last year", () => {
    expect(made("2025-12-10T10:00:00Z")).toBeNull();
  });

  it("is kept by a gift sent again after the last day: an edit moves published_at, never created_at", () => {
    expect(extraFor({ createdAt: "2026-12-19T20:00:00Z", publishedAt: "2026-12-23T09:00:00Z", paid: true })).toBe("tree-tag");
  });

  it("is not given to a gift begun after the last day", () => {
    expect(extraFor({ createdAt: second("2026-12-21T12:00:00Z", 1), publishedAt: "2026-12-22T09:00:00Z", paid: true })).toBeNull();
  });

  it("goes to a draft begun before 24 November and first sent inside the days", () => {
    expect(extraFor({ createdAt: "2026-11-20T10:00:00Z", publishedAt: "2026-11-26T10:00:00Z", paid: true })).toBe("tree-tag");
  });

  it("reads nothing into a date it cannot read", () => {
    expect(extraFor({ createdAt: "yesterday", publishedAt: "2026-12-01T10:00:00Z", paid: true })).toBeNull();
    expect(extraFor({ createdAt: null, publishedAt: "2026-12-01T10:00:00Z", paid: true })).toBe("tree-tag");
  });
});
