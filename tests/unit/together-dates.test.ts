import { describe, expect, it } from "vitest";
import { addDays, addMonths, breakdown, daysBetween, formatDay, milestones, monthsBetween, parseDay, timeline, type Day } from "@/lib/together/dates";

const day = (s: string): Day => {
  const d = parseDay(s);
  if (!d) throw new Error(`bad day ${s}`);
  return d;
};
const f = formatDay;

describe("together dates", () => {
  it("reads only real days", () => {
    expect(parseDay("2024-02-29")).toEqual({ y: 2024, m: 2, d: 29 });
    expect(parseDay("2023-02-29")).toBeNull();
    expect(parseDay("2024-13-01")).toBeNull();
    expect(parseDay("24-1-1")).toBeNull();
    expect(parseDay(null)).toBeNull();
  });

  it("counts calendar days, across daylight saving and leap days", () => {
    expect(daysBetween(day("2026-03-28"), day("2026-03-30"))).toBe(2);
    expect(daysBetween(day("2026-10-24"), day("2026-10-26"))).toBe(2);
    expect(daysBetween(day("2024-02-28"), day("2024-03-01"))).toBe(2);
    expect(daysBetween(day("2023-02-28"), day("2023-03-01"))).toBe(1);
    expect(daysBetween(day("2026-11-09"), day("2026-11-01"))).toBe(-8);
  });

  it("lands months on the same date, or the last day of a short month", () => {
    expect(f(addMonths(day("2025-01-31"), 1))).toBe("2025-02-28");
    expect(f(addMonths(day("2024-01-31"), 1))).toBe("2024-02-29");
    expect(f(addMonths(day("2025-01-31"), 2))).toBe("2025-03-31");
    expect(f(addMonths(day("2024-02-29"), 12))).toBe("2025-02-28");
    expect(f(addMonths(day("2024-02-29"), 48))).toBe("2028-02-29");
    expect(f(addMonths(day("2025-11-15"), 2))).toBe("2026-01-15");
  });

  it("says how long the way people do", () => {
    expect(breakdown(day("2023-06-10"), day("2026-11-09"))).toEqual({ years: 3, months: 4, days: 30 });
    expect(breakdown(day("2025-01-31"), day("2025-02-28"))).toEqual({ years: 0, months: 1, days: 0 });
    expect(breakdown(day("2025-01-31"), day("2025-02-27"))).toEqual({ years: 0, months: 0, days: 27 });
    expect(breakdown(day("2026-11-09"), day("2026-11-09"))).toEqual({ years: 0, months: 0, days: 0 });
    expect(monthsBetween(day("2024-02-29"), day("2025-02-28"))).toBe(12);
  });

  it("puts 100 days a hundred days on, or a day sooner counting the first day as day 1", () => {
    const start = day("2026-01-01");
    const plain = milestones(start, day("2030-01-01"));
    const korean = milestones(start, day("2030-01-01"), true);
    expect(f(plain.find((x) => x.kind === "days" && x.count === 100)!.on)).toBe("2026-04-11");
    expect(f(korean.find((x) => x.kind === "days" && x.count === 100)!.on)).toBe("2026-04-10");
    expect(f(plain.find((x) => x.kind === "days" && x.count === 1000)!.on)).toBe(f(addDays(start, 1000)));
    expect(plain.find((x) => x.kind === "years" && x.count === 1)!.on).toEqual(day("2027-01-01"));
    expect(plain.filter((x) => x.kind === "months").map((x) => x.count)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("keeps everything in date order", () => {
    const list = milestones(day("2020-05-31"), day("2030-01-01"));
    for (let i = 1; i < list.length; i++) expect(daysBetween(list[i - 1].on, list[i].on)).toBeGreaterThanOrEqual(0);
  });

  it("shows what's next, what's behind, and the next monthly date after the first year", () => {
    const { next, past, nextMonth } = timeline(day("2024-03-15"), day("2026-11-09"));
    expect(next.length).toBe(5);
    expect(next.every((x) => daysBetween(day("2026-11-09"), x.on) >= 0)).toBe(true);
    expect(past.every((x) => daysBetween(x.on, day("2026-11-09")) > 0)).toBe(true);
    expect(nextMonth).toEqual({ kind: "months", count: 32, on: day("2026-11-15") });
    // On the day itself, today counts as next.
    const onTheDay = timeline(day("2026-08-01"), day("2026-11-09"));
    expect(onTheDay.next[0]).toEqual({ kind: "days", count: 100, on: day("2026-11-09") });
  });
});
