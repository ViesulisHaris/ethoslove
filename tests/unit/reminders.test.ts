import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  LEAD_DAYS,
  REMINDER_RUN_HOURS,
  STAGE_CATCH_UP,
  STAGE_DAYS,
  countdownDay,
  dueDates,
  dueStages,
  firstEmailDate,
  formatEmailDate,
  formatMonthDay,
  initialLastSentYear,
  isLeapYear,
  isRealDay,
  needsSending,
  needsStage,
  weekdayName,
  whenWords,
  nextOccurrence,
  occurrenceIn,
  reminderDateFor,
  reminderOccasionFor,
  soleReminderOccasion,
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

  it("says the year of an e-mail only when it isn't this one, so next year's never reads as a day gone", () => {
    const now = utc("2026-11-24");
    expect(formatEmailDate(utc("2026-11-28"), now, "en")).toBe("28 November");
    expect(formatEmailDate(utc("2027-11-17"), now, "en")).toBe("17 November 2027");
    expect(formatEmailDate(utc("2027-11-17"), now, "es")).toBe("17 de noviembre de 2027");
    // Next week's, across the new year, says so too.
    expect(formatEmailDate(utc("2027-01-02"), utc("2026-12-30"), "en")).toBe("2 January 2027");
  });
});

describe("reminder prefill", () => {
  it("takes the template's first occasion when it recurs on a date", () => {
    expect(reminderOccasionFor(["birthday", "anniversary"])).toBe("birthday");
    expect(reminderOccasionFor(["anniversary"])).toBe("anniversary");
    expect(reminderOccasionFor(["valentines"])).toBe("valentines");
    expect(reminderOccasionFor(["long-distance", "birthday"])).toBe("other");
    expect(reminderOccasionFor(undefined)).toBe("other");
    // Only a template for one occasion says what its gift's day is.
    expect(soleReminderOccasion(["birthday"])).toBe("birthday");
    expect(soleReminderOccasion(["christmas"])).toBe("other");
    expect(soleReminderOccasion(["halloween", "just-because"])).toBe("other");
    expect(soleReminderOccasion(["anniversary", "birthday", "just-because", "long-distance"])).toBeNull();
    expect(soleReminderOccasion(["anniversary", "wedding", "graduation", "long-distance"])).toBeNull();
    expect(soleReminderOccasion(undefined)).toBeNull();
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

describe("three e-mails before each day", () => {
  const plan = (today: string) => dueStages(utc(today)).map((d) => `${d.stage}@${d.daysAway}:${day(d.due.date)}`);

  it("sends stage 1 seven days before with two days of catch-up, stage 2 two days before, stage 3 the day before", () => {
    expect(STAGE_DAYS).toEqual({ 1: 7, 2: 2, 3: 1 });
    expect(STAGE_CATCH_UP).toBe(2);
    expect(plan("2026-02-20")).toEqual(["1@7:2026-02-27", "1@6:2026-02-26", "1@5:2026-02-25", "2@2:2026-02-22", "3@1:2026-02-21"]);
  });

  it("names the occasion's year across the new year", () => {
    const due = dueStages(utc("2026-12-28"));
    expect(due.find((d) => d.stage === 1 && d.daysAway === 7)!.due).toMatchObject({ year: 2027, month: 1, days: [4] });
    expect(due.find((d) => d.stage === 3)!.due).toMatchObject({ year: 2026, month: 12, days: [29] });
  });

  it("sends a 29 February day on the 28th in a common year, and on the 29th in a leap year", () => {
    const common = dueStages(utc("2027-02-21"));
    expect(common.find((d) => d.stage === 1 && d.daysAway === 7)!.due).toMatchObject({ year: 2027, month: 2, days: [28, 29] });
    const commonEve = dueStages(utc("2027-02-27"));
    expect(commonEve.find((d) => d.stage === 3)!.due).toMatchObject({ month: 2, days: [28, 29] });
    const leap = dueStages(utc("2028-02-28"));
    expect(leap.find((d) => d.stage === 3)!.due).toMatchObject({ year: 2028, month: 2, days: [29] });
    expect(dueStages(utc("2028-02-27")).find((d) => d.stage === 3)!.due).toMatchObject({ month: 2, days: [28] });
  });

  it("needs a stage when nothing went this year or a lower one did, never a stage after a later one", () => {
    const row = (last_sent_year: number | null, last_stage: number) => ({ last_sent_year, last_stage });
    expect(needsStage(row(null, 0), 2027, 1)).toBe(true);
    expect(needsStage(row(2026, 3), 2027, 1)).toBe(true);
    expect(needsStage(row(2027, 1), 2027, 1)).toBe(false);
    expect(needsStage(row(2027, 1), 2027, 2)).toBe(true);
    expect(needsStage(row(2027, 1), 2027, 3)).toBe(true);
    expect(needsStage(row(2027, 2), 2027, 2)).toBe(false);
    expect(needsStage(row(2027, 2), 2027, 3)).toBe(true);
    expect(needsStage(row(2027, 3), 2027, 1)).toBe(false);
    expect(needsStage(row(2027, 3), 2027, 3)).toBe(false);
    // Stage 3 went (or the gift was made): stage 1 late on a caught-up run never follows it.
    expect(needsStage(row(2027, 2), 2027, 1)).toBe(false);
    // A year written by the code before 0025 (its one e-mail, or the gift made for that day) is done.
    expect(needsStage(row(2027, 0), 2027, 1)).toBe(false);
    expect(needsStage(row(2027, 0), 2027, 3)).toBe(false);
    expect(needsStage(row(2028, 3), 2027, 1)).toBe(false);
  });

  it("says when in words that stay true on a late run, in both languages", () => {
    const friday = new Date(Date.UTC(2027, 2, 5));
    expect(whenWords(7, friday, "en")).toBe("next Friday");
    expect(whenWords(6, friday, "en")).toBe("this Friday");
    expect(whenWords(5, friday, "en")).toBe("this Friday");
    expect(whenWords(2, friday, "en")).toBe("this Friday");
    expect(whenWords(1, friday, "en")).toBe("tomorrow");
    expect(whenWords(7, friday, "es")).toBe("el viernes que viene");
    expect(whenWords(2, friday, "es")).toBe("este viernes");
    expect(whenWords(1, friday, "es")).toBe("mañana");
    expect(weekdayName(friday, "en")).toBe("Friday");
    expect(weekdayName(new Date(Date.UTC(2027, 2, 7)), "es")).toBe("domingo");
  });

  it("says when the first e-mail of the days just saved comes", () => {
    const today = utc("2027-02-19");
    const at = (saved: Parameters<typeof firstEmailDate>[0]) => {
      const d = firstEmailDate(saved, today);
      return d ? day(d) : null;
    };
    // Your anniversary on 5 March: seven days before. Mia's birthday on 24 November is later.
    expect(at([{ month: 3, day: 5 }, { month: 11, day: 24 }])).toBe("2027-02-26");
    // Five or six days away: the catch-up sends it on the next run, today.
    expect(at([{ month: 2, day: 25 }])).toBe("2027-02-19");
    // Three or four days away: the first is the two-days-before one.
    expect(at([{ month: 2, day: 23 }])).toBe("2027-02-21");
    // Tomorrow: the morning's last run (11:00 UTC) is still to come. Today itself: next year's.
    expect(at([{ month: 2, day: 20 }])).toBe("2027-02-19");
    expect(at([{ month: 2, day: 19 }])).toBe("2028-02-12");
    // Saved with the gift made for it: done for this year, so next year's. The code before 0025 wrote a year with no stage: done too.
    expect(at([{ month: 3, day: 5, sentYear: 2027, sentStage: 3 }])).toBe("2028-02-27");
    expect(at([{ month: 3, day: 5, sentYear: 2027, sentStage: 0 }])).toBe("2028-02-27");
    expect(at([])).toBeNull();
  });

  it("counts from tomorrow once the morning's runs are over, as the job will", () => {
    const evening = new Date("2027-02-19T15:00:00Z");
    const at = (saved: Parameters<typeof firstEmailDate>[0], now = evening) => {
      const d = firstEmailDate(saved, now);
      return d ? day(d) : null;
    };
    // Tomorrow: the day-before e-mail was this morning's, so nothing this year: next year's first.
    expect(at([{ month: 2, day: 20 }])).toBe("2028-02-13");
    // Five days away: tomorrow it is four, too late for the first; the two-days-before one is the first.
    expect(at([{ month: 2, day: 24 }])).toBe("2027-02-22");
    // Six days away: tomorrow's run still catches the first up.
    expect(at([{ month: 2, day: 25 }])).toBe("2027-02-20");
    // Two days away: the day before.
    expect(at([{ month: 2, day: 21 }])).toBe("2027-02-20");
    // Seven days away: the first on the next run, tomorrow.
    expect(at([{ month: 2, day: 26 }])).toBe("2027-02-20");
    // The last run's hour itself is over; the hour before it isn't.
    expect(at([{ month: 2, day: 20 }], new Date("2027-02-19T11:00:00Z"))).toBe("2028-02-13");
    expect(at([{ month: 2, day: 20 }], new Date("2027-02-19T10:59:00Z"))).toBe("2027-02-19");
    // A day whose first e-mail went: the second is next.
    expect(at([{ month: 3, day: 5, sentYear: 2027, sentStage: 1 }], new Date("2027-02-26T15:00:00Z"))).toBe("2027-03-03");
  });

  it("names the job's last run hour as vercel.json schedules it", () => {
    const vercel = JSON.parse(readFileSync(join(process.cwd(), "vercel.json"), "utf8")) as { crons: { path: string; schedule: string }[] };
    const schedule = vercel.crons.find((c) => c.path === "/api/cron/reminders")?.schedule;
    expect(schedule).toBe(`0 ${REMINDER_RUN_HOURS.first}-${REMINDER_RUN_HOURS.last} * * *`);
  });
});
