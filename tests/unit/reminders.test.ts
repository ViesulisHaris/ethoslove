import { describe, expect, it } from "vitest";
import {
  LEAD_DAYS,
  countdownDay,
  dueDates,
  formatMonthDay,
  initialLastSentYear,
  isLeapYear,
  isRealDay,
  needsSending,
  nextOccurrence,
  occurrenceIn,
  reminderDateFor,
  reminderOccasionFor,
} from "@/lib/lifecycle/reminders";
import { reminderInput } from "@/lib/lifecycle/reminder-input";

const utc = (iso: string) => new Date(`${iso}T07:00:00Z`);
const day = (d: Date) => d.toISOString().slice(0, 10);

describe("reminder dates", () => {
  it("knows leap years and real days", () => {
    expect([2024, 2000, 2028].map(isLeapYear)).toEqual([true, true, true]);
    expect([2026, 1900, 2100].map(isLeapYear)).toEqual([false, false, false]);
    expect(isRealDay({ month: 2, day: 29 })).toBe(true);
    expect(isRealDay({ month: 4, day: 31 })).toBe(false);
    expect(isRealDay({ month: 13, day: 1 })).toBe(false);
  });

  it("keeps 29 February on the 28th in other years", () => {
    expect(day(occurrenceIn(2027, { month: 2, day: 29 }))).toBe("2027-02-28");
    expect(day(occurrenceIn(2028, { month: 2, day: 29 }))).toBe("2028-02-29");
  });

  it("finds the next occurrence, today included", () => {
    expect(day(nextOccurrence({ month: 9, day: 23 }, utc("2026-09-23")))).toBe("2026-09-23");
    expect(day(nextOccurrence({ month: 9, day: 22 }, utc("2026-09-23")))).toBe("2027-09-22");
    expect(day(nextOccurrence({ month: 1, day: 3 }, utc("2026-12-30")))).toBe("2027-01-03");
  });

  it("sends nine days ahead, and catches up two missed days before that", () => {
    const due = dueDates(utc("2026-09-23"));
    expect(due.map((d) => day(d.date))).toEqual(["2026-09-30", "2026-10-01", "2026-10-02"]);
    expect(due[due.length - 1]).toMatchObject({ year: 2026, month: 10, days: [2] });
    expect(LEAD_DAYS).toBe(9);
  });

  it("sends for a new year's occasion with that year", () => {
    const due = dueDates(utc("2026-12-25"));
    expect(due[due.length - 1]).toMatchObject({ year: 2027, month: 1, days: [3] });
  });

  it("sends a 29 February birthday on the 28th when there is no 29th", () => {
    const common = dueDates(utc("2027-02-19"));
    expect(common[common.length - 1]).toMatchObject({ year: 2027, month: 2, days: [28, 29] });
    const leap = dueDates(utc("2028-02-19"));
    expect(leap[leap.length - 1]).toMatchObject({ year: 2028, month: 2, days: [28] });
    const leapDay = dueDates(utc("2028-02-20"));
    expect(leapDay[leapDay.length - 1]).toMatchObject({ year: 2028, month: 2, days: [29] });
  });

  it("never sends twice in a year", () => {
    expect(needsSending(null, 2026)).toBe(true);
    expect(needsSending(2025, 2026)).toBe(true);
    expect(needsSending(2026, 2026)).toBe(false);
  });

  it("skips this year when the gift was just made for it", () => {
    // The birthday is in twelve days: the gift is for it, so the first email is next year's.
    expect(initialLastSentYear({ month: 10, day: 5 }, utc("2026-09-23"))).toBe(2026);
    // Today itself.
    expect(initialLastSentYear({ month: 9, day: 23 }, utc("2026-09-23"))).toBe(2026);
    // Months away, or just past: this year's email still goes.
    expect(initialLastSentYear({ month: 3, day: 1 }, utc("2026-09-23"))).toBeNull();
    expect(initialLastSentYear({ month: 9, day: 20 }, utc("2026-09-23"))).toBeNull();
    // Across the new year.
    expect(initialLastSentYear({ month: 1, day: 10 }, utc("2026-12-28"))).toBe(2027);
  });

  it("skips the occasion the gift counts down to, however far ahead it was made", () => {
    // A birthday gift made ten weeks early: "next year" means after this one.
    expect(initialLastSentYear({ month: 12, day: 1 }, utc("2026-09-23"), "2026-12-01")).toBe(2026);
    // A countdown to some other day (the details were changed) doesn't skip anything.
    expect(initialLastSentYear({ month: 11, day: 10 }, utc("2026-09-23"), "2026-12-01")).toBeNull();
    // A countdown more than a year away is for a later occurrence, not the next one.
    expect(initialLastSentYear({ month: 12, day: 1 }, utc("2026-09-23"), "2027-12-01")).toBeNull();
    // Rubbish is ignored rather than trusted.
    expect(initialLastSentYear({ month: 12, day: 1 }, utc("2026-09-23"), "soon")).toBeNull();
  });

  it("formats a day and month in either language", () => {
    expect(formatMonthDay({ month: 10, day: 3 }, "en")).toBe("3 October");
    expect(formatMonthDay({ month: 10, day: 3 }, "es")).toBe("3 de octubre");
    expect(formatMonthDay({ month: 2, day: 29 }, "en")).toBe("29 February");
  });
});

describe("reminder prefill", () => {
  it("takes the template's first occasion when it recurs on a date", () => {
    expect(reminderOccasionFor(["birthday", "anniversary"])).toBe("birthday");
    expect(reminderOccasionFor(["anniversary"])).toBe("anniversary");
    expect(reminderOccasionFor(["valentines"])).toBe("valentines");
    expect(reminderOccasionFor(["long-distance", "birthday"])).toBe("other");
    expect(reminderOccasionFor(undefined)).toBe("other");
  });

  it("uses the countdown's day in its own timezone, else today", () => {
    const countdown = { targetAt: "2026-10-14T23:30:00+00:00", timezone: "Europe/Riga" };
    expect(reminderDateFor("birthday", countdown, new Date(2026, 8, 23))).toEqual({ month: 10, day: 15 });
    expect(reminderDateFor("birthday", undefined, new Date(2026, 8, 23))).toEqual({ month: 9, day: 23 });
    expect(reminderDateFor("birthday", { targetAt: "2026-10-14T12:00:00+00:00", timezone: "Not/AZone" }, new Date(2026, 8, 23))).toEqual({ month: 10, day: 14 });
    expect(reminderDateFor("valentines", countdown, new Date(2026, 8, 23))).toEqual({ month: 2, day: 14 });
  });

  it("reads the countdown's own calendar day", () => {
    expect(countdownDay({ targetAt: "2026-10-14T23:30:00+00:00", timezone: "Europe/Riga" })).toBe("2026-10-15");
    expect(countdownDay({ targetAt: "2026-10-14T23:30:00+00:00", timezone: "Not/AZone" })).toBe("2026-10-14");
    expect(countdownDay({ targetAt: "not a date", timezone: "UTC" })).toBeNull();
    expect(countdownDay(undefined)).toBeNull();
  });
});

describe("reminder input", () => {
  const ok = { recipientName: "  Ana   María ", occasion: "birthday", month: 2, day: 29 };

  it("tidies the name and accepts a real day", () => {
    const parsed = reminderInput.parse(ok);
    expect(parsed.recipientName).toBe("Ana María");
    expect(parsed.locale).toBe("en");
  });

  it("refuses days that don't exist, empty names and unknown occasions", () => {
    expect(reminderInput.safeParse({ ...ok, month: 4, day: 31 }).success).toBe(false);
    expect(reminderInput.safeParse({ ...ok, recipientName: "   " }).success).toBe(false);
    expect(reminderInput.safeParse({ ...ok, recipientName: "x".repeat(61) }).success).toBe(false);
    expect(reminderInput.safeParse({ ...ok, occasion: "christmas" }).success).toBe(false);
    expect(reminderInput.safeParse({ ...ok, templateSlug: "../etc" }).success).toBe(false);
    expect(reminderInput.safeParse({ ...ok, giftDay: "next week" }).success).toBe(false);
    expect(reminderInput.parse({ ...ok, giftDay: "2027-02-28" }).giftDay).toBe("2027-02-28");
  });
});
