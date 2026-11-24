import { describe, expect, it } from "vitest";
import { distance, localToday, nextDays, occasionIcon, occasionPath, todayIn } from "@/lib/lifecycle/next-days";

/** The two days the "two more gifts" card names (lib/lifecycle/next-days.ts), on fixed dates. */
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const saved = (occasion: "birthday" | "anniversary" | "valentines" | "other", month: number, d: number) => ({ occasion, month, day: d, recipientName: "Mia" });
const shown = (days: ReturnType<typeof nextDays>) => days.map((d) => `${d.kind} ${d.month}-${d.day} in ${distance(d.daysAway).count} ${distance(d.daysAway).unit}`);

describe("nextDays", () => {
  it("on 24 Nov 2026 with nothing saved: Christmas in 4 weeks, Valentine's Day in 12 weeks", () => {
    expect(shown(nextDays(day("2026-11-24"), [], null))).toEqual(["christmas 12-25 in 4 weeks", "valentines 2-14 in 12 weeks"]);
  });

  it("puts a saved anniversary on 9 January second", () => {
    expect(shown(nextDays(day("2026-11-24"), [saved("anniversary", 1, 9)], null))).toEqual(["christmas 12-25 in 4 weeks", "anniversary 1-9 in 7 weeks"]);
  });

  it("never lists the birthday a birthday gift made today was for", () => {
    const days = nextDays(day("2026-11-24"), [saved("birthday", 11, 24)], { occasion: "birthday", month: 11, day: 24 });
    expect(days.map((d) => d.kind)).toEqual(["christmas", "valentines"]);
  });

  it("a Christmas gift made on 10 December names Valentine's Day and the next saved day", () => {
    const days = nextDays(day("2026-12-10"), [saved("birthday", 3, 5)], { occasion: "christmas", month: 12, day: 25 });
    expect(shown(days)).toEqual(["valentines 2-14 in 9 weeks", "birthday 3-5 in 12 weeks"]);
  });

  it("…and with nothing saved, Christmas the year after, in months", () => {
    const days = nextDays(day("2026-12-10"), [], { occasion: "christmas", month: 12, day: 25 });
    // A year and a fortnight away reads as a year, never "in 13 months".
    expect(shown(days)).toEqual(["valentines 2-14 in 9 weeks", "christmas 12-25 in 12 months"]);
  });

  it("a gift for another kind of day hides only that day, not every other day of theirs", () => {
    // An apology (kind "other") made today, on 24 Nov: their own day saved for 8 December stays.
    const made = { occasion: "other" as const, month: 11, day: 24 };
    expect(shown(nextDays(day("2026-11-24"), [saved("other", 12, 8)], made))).toEqual(["other 12-8 in 2 weeks", "christmas 12-25 in 4 weeks"]);
    // The day the gift was made for is still left out.
    expect(nextDays(day("2026-11-24"), [saved("other", 12, 8)], { occasion: "other", month: 12, day: 8 }).map((d) => d.kind)).toEqual(["christmas", "valentines"]);
  });

  it("names Valentine's Day once, even when it is saved", () => {
    expect(nextDays(day("2026-11-24"), [saved("valentines", 2, 14)], null).filter((d) => d.kind === "valentines")).toHaveLength(1);
  });

  it("keeps 29 February, on the 28th in a year without one", () => {
    const days = nextDays(day("2027-02-01"), [saved("birthday", 2, 29)], null);
    expect(days[0]).toMatchObject({ kind: "valentines", daysAway: 13 });
    expect(days[1]).toMatchObject({ kind: "birthday", month: 2, day: 29, daysAway: 27 });
  });

  it("takes a day exactly 8 days away, and leaves out one 7 days away", () => {
    expect(nextDays(day("2026-12-17"), [], null)[0]).toMatchObject({ kind: "christmas", daysAway: 8 });
    expect(nextDays(day("2026-12-18"), [], null).map((d) => d.kind)).not.toContain("christmas");
    expect(nextDays(day("2026-12-18"), [], null)[0]).toMatchObject({ kind: "valentines" });
  });

  it("is at most two days, soonest first", () => {
    const days = nextDays(day("2026-11-24"), [saved("birthday", 12, 10), saved("anniversary", 1, 9)], null);
    expect(days.map((d) => d.kind)).toEqual(["birthday", "christmas"]);
  });
});

describe("distance, paths and pictures", () => {
  it("says days up to 13, weeks up to 112 days, months beyond", () => {
    expect(distance(8)).toEqual({ unit: "days", count: 8 });
    expect(distance(13)).toEqual({ unit: "days", count: 13 });
    expect(distance(14)).toEqual({ unit: "weeks", count: 2 });
    expect(distance(112)).toEqual({ unit: "weeks", count: 16 });
    expect(distance(113)).toEqual({ unit: "months", count: 4 });
    expect(distance(380)).toEqual({ unit: "months", count: 12 });
    expect(distance(396)).toEqual({ unit: "months", count: 12 });
  });

  it("leads each day to its occasion page and picture", () => {
    expect(occasionPath("christmas")).toBe("/occasions/christmas");
    expect(occasionPath("other")).toBe("/templates");
    expect(occasionIcon("valentines")).toBe("/art/occasions/valentines.webp");
    expect(occasionIcon("other")).toBe("/art/occasions/just-because.webp");
  });

  it("counts from the visitor's own calendar day", () => {
    expect(localToday(new Date(2026, 10, 24, 23, 30)).toISOString()).toBe("2026-11-24T00:00:00.000Z");
  });

  it("on the server, counts from the day in the visitor's timezone, else the server's", () => {
    // 03:30 UTC on 25 Nov is still 24 Nov, 22:30, in New York.
    const now = new Date("2026-11-25T03:30:00.000Z");
    expect(todayIn("America/New_York", now).toISOString()).toBe("2026-11-24T00:00:00.000Z");
    expect(todayIn("Europe/Madrid", now).toISOString()).toBe("2026-11-25T00:00:00.000Z");
    expect(todayIn(null, now).toISOString()).toBe("2026-11-25T00:00:00.000Z");
    expect(todayIn("Not/AZone", now).toISOString()).toBe("2026-11-25T00:00:00.000Z");
  });
});
