import { afterAll, describe, expect, it } from "vitest";
import {
  addMonths,
  clearRange,
  daysIn,
  formatLong,
  formatShort,
  formatSpan,
  lastDay,
  markDay,
  monthsApart,
  monthsFrom,
  monthTitle,
  monthWeeks,
  moveDay,
  nightsBetween,
  pickDay,
  previewEnd,
  quickRanges,
  setOneWay,
  shiftMonths,
  weekdayNames,
  type RangeState,
} from "@/lib/dates/range";

const fresh: RangeState = { start: "", end: "", focus: "start", oneWay: false };
const weekend: RangeState = { start: "2026-10-16", end: "2026-10-19", focus: "start", oneWay: false };

/**
 * The zones where a day is most likely to slip: both sides of the date line, one that changes its
 * clocks at midnight (Santiago skips 00:00, so a date made at midnight would land on the day
 * before) and the two the site is written for. Node picks up a new TZ on assignment.
 */
const ZONES = ["UTC", "Europe/Madrid", "America/Los_Angeles", "America/Santiago", "Pacific/Auckland", "Pacific/Kiritimati"];
const originalTz = process.env.TZ;
afterAll(() => {
  process.env.TZ = originalTz;
});

describe("the months a picker shows", () => {
  it("runs twelve months from today's, across the new year, and ends on the last one's last day", () => {
    const months = monthsFrom("2026-09-23");
    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ y: 2026, m: 8 });
    expect(months[3]).toEqual({ y: 2026, m: 11 });
    expect(months[4]).toEqual({ y: 2027, m: 0 });
    expect(months[11]).toEqual({ y: 2027, m: 7 });
    expect(lastDay("2026-09-23")).toBe("2027-08-31");
    expect(lastDay("2027-02-01", 1)).toBe("2027-02-28");
    expect(addMonths({ y: 2026, m: 0 }, -1)).toEqual({ y: 2025, m: 11 });
    expect(monthsApart({ y: 2026, m: 10 }, { y: 2027, m: 1 })).toBe(3);
    expect(daysIn({ y: 2028, m: 1 })).toBe(29);
  });

  it("lays a month out in whole weeks, Monday first, in every zone", () => {
    for (const zone of ZONES) {
      process.env.TZ = zone;
      // October 2026 starts on a Thursday: three blanks, then the 1st.
      const october = monthWeeks({ y: 2026, m: 9 });
      expect(october[0], zone).toEqual([null, null, null, "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
      expect(october.every((week) => week.length === 7), zone).toBe(true);
      expect(october.flat().filter(Boolean), zone).toHaveLength(31);
      // The clocks go back on 25 October in Madrid: the 25th is still a Sunday and the 26th a Monday.
      expect(october[3].slice(6), zone).toEqual(["2026-10-25"]);
      expect(october[4][0], zone).toBe("2026-10-26");
      expect(october.at(-1), zone).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", null]);
      // February 2027 starts on a Monday and fills exactly four weeks.
      const february = monthWeeks({ y: 2027, m: 1 });
      expect(february, zone).toHaveLength(4);
      expect(february[0][0], zone).toBe("2027-02-01");
      expect(february[3][6], zone).toBe("2027-02-28");
      // Santiago's clocks spring forward at midnight on 6 September 2026: no day goes missing.
      expect(monthWeeks({ y: 2026, m: 8 }).flat().filter(Boolean), zone).toHaveLength(30);
    }
  });
});

describe("nights between two days", () => {
  it("counts whole nights, even across a clock change or a year", () => {
    for (const zone of ZONES) {
      process.env.TZ = zone;
      expect(nightsBetween("2026-10-23", "2026-10-26"), zone).toBe(3);
      expect(nightsBetween("2027-03-26", "2027-03-29"), zone).toBe(3);
      expect(nightsBetween("2026-12-30", "2027-01-02"), zone).toBe(3);
      expect(nightsBetween("2026-10-16", "2026-10-16"), zone).toBe(0);
      expect(nightsBetween("2028-02-28", "2028-03-01"), zone).toBe(2);
    }
  });

  it("moves a day by months, keeping it inside shorter ones", () => {
    expect(shiftMonths("2027-01-31", 1)).toBe("2027-02-28");
    expect(shiftMonths("2026-10-16", -1)).toBe("2026-09-16");
    expect(shiftMonths("2026-10-16", 12)).toBe("2027-10-16");
    expect(shiftMonths("2026-03-31", -1)).toBe("2026-02-28");
  });
});

describe("picking a range", () => {
  it("takes the start on the first tap and the end on the second", () => {
    const first = pickDay(fresh, "2026-10-16");
    expect(first).toEqual({ start: "2026-10-16", end: "", focus: "end", oneWay: false });
    const second = pickDay(first, "2026-10-19");
    expect(second).toEqual({ start: "2026-10-16", end: "2026-10-19", focus: "start", oneWay: false });
  });

  it("makes a same-day return of a second tap on the start", () => {
    expect(pickDay(pickDay(fresh, "2026-10-16"), "2026-10-16")).toMatchObject({ start: "2026-10-16", end: "2026-10-16" });
  });

  it("takes a tap before the start while it waits on the end as an earlier start, keeping the return", () => {
    const waiting: RangeState = { ...weekend, focus: "end" };
    // Opened on the return, then a day before the departure: not a silent one-way search.
    expect(pickDay(waiting, "2026-10-10")).toEqual({ start: "2026-10-10", end: "2026-10-19", focus: "end", oneWay: false });
    expect(pickDay({ ...waiting, end: "" }, "2026-10-10")).toEqual({ start: "2026-10-10", end: "", focus: "end", oneWay: false });
  });

  it("keeps the return for a new departure before it, and waits on the end", () => {
    expect(pickDay(weekend, "2026-10-12")).toEqual({ start: "2026-10-12", end: "2026-10-19", focus: "end", oneWay: false });
    expect(pickDay(weekend, "2026-10-19")).toMatchObject({ start: "2026-10-19", end: "2026-10-19", focus: "end" });
  });

  it("moves the return with a departure past it, so the trip keeps its length and doesn't turn one way", () => {
    expect(pickDay(weekend, "2026-10-23")).toEqual({ start: "2026-10-23", end: "2026-10-26", focus: "end", oneWay: false });
    // Across the clocks going back and forward, still three nights.
    expect(pickDay(weekend, "2027-03-26")).toMatchObject({ start: "2027-03-26", end: "2027-03-29" });
    // Past the last day that can be chosen, the return is dropped rather than put out of reach.
    expect(pickDay(weekend, "2027-08-30", "2027-08-31")).toMatchObject({ start: "2027-08-30", end: "", focus: "end" });
    // With no return, or a same-day one, there is no length to keep.
    expect(pickDay({ ...weekend, end: "" }, "2026-11-01")).toMatchObject({ start: "2026-11-01", end: "" });
    expect(pickDay({ ...weekend, end: "2026-10-16" }, "2026-11-01")).toMatchObject({ start: "2026-11-01", end: "" });
  });

  it("sets the end after a moved return, like any other", () => {
    const moved = pickDay(weekend, "2026-10-23");
    expect(pickDay(moved, "2026-10-30")).toMatchObject({ start: "2026-10-23", end: "2026-10-30", focus: "start" });
  });

  it("one way, only ever sets the start", () => {
    const oneWay = setOneWay(weekend, true);
    expect(oneWay).toEqual({ start: "2026-10-16", end: "", focus: "start", oneWay: true });
    expect(pickDay(oneWay, "2026-11-02")).toEqual({ start: "2026-11-02", end: "", focus: "start", oneWay: true });
    expect(pickDay(pickDay(oneWay, "2026-11-02"), "2026-11-05")).toMatchObject({ start: "2026-11-05", end: "" });
  });

  it("back to a return, brings back the return one way dropped while it still fits", () => {
    const oneWay = setOneWay(weekend, true);
    expect(setOneWay(oneWay, false, weekend.end)).toEqual({ start: "2026-10-16", end: "2026-10-19", focus: "end", oneWay: false });
    // A departure moved past it in the meantime: nothing to bring back.
    expect(setOneWay(pickDay(oneWay, "2026-10-21"), false, weekend.end)).toEqual({ start: "2026-10-21", end: "", focus: "end", oneWay: false });
  });

  it("back to a return, waits on the end; cleared, waits on the start", () => {
    expect(setOneWay({ ...weekend, end: "", oneWay: true }, false)).toEqual({ start: "2026-10-16", end: "", focus: "end", oneWay: false });
    expect(setOneWay({ ...fresh, oneWay: true }, false)).toMatchObject({ focus: "start", oneWay: false });
    expect(clearRange({ ...weekend, focus: "end" })).toEqual({ start: "", end: "", focus: "start", oneWay: false });
  });

  it("previews the end under the pointer only while it waits on one, and never before the start", () => {
    const waiting: RangeState = { ...weekend, end: "", focus: "end" };
    expect(previewEnd(waiting, "2026-10-21")).toBe("2026-10-21");
    expect(previewEnd(waiting, "2026-10-12")).toBeNull();
    expect(previewEnd(waiting, null)).toBeNull();
    expect(previewEnd(weekend, "2026-10-21")).toBeNull();
    expect(previewEnd({ ...waiting, oneWay: true }, "2026-10-21")).toBeNull();
  });
});

describe("drawing a day", () => {
  const range = { start: "2026-10-16", end: "2026-10-19" };

  it("fills the two ends and bands the days between", () => {
    expect(markDay("2026-10-16", range, null)).toEqual({ isStart: true, isEnd: false, inRange: true, isPreview: false });
    expect(markDay("2026-10-17", range, null)).toEqual({ isStart: false, isEnd: false, inRange: true, isPreview: false });
    expect(markDay("2026-10-19", range, null)).toEqual({ isStart: false, isEnd: true, inRange: true, isPreview: false });
    expect(markDay("2026-10-20", range, null)).toEqual({ isStart: false, isEnd: false, inRange: false, isPreview: false });
  });

  it("draws the hovered range in place of the chosen one", () => {
    const start = { start: "2026-10-16", end: "" };
    expect(markDay("2026-10-18", start, "2026-10-21")).toEqual({ isStart: false, isEnd: false, inRange: true, isPreview: true });
    expect(markDay("2026-10-21", start, "2026-10-21")).toEqual({ isStart: false, isEnd: true, inRange: true, isPreview: true });
    expect(markDay("2026-10-17", start, null)).toMatchObject({ inRange: false });
  });

  it("has no band for a one-day trip", () => {
    expect(markDay("2026-10-16", { start: "2026-10-16", end: "2026-10-16" }, null)).toEqual({ isStart: true, isEnd: true, inRange: false, isPreview: false });
  });
});

describe("the quick picks", () => {
  it("on a weekday: this weekend's Friday to Monday, the next one, and a week from the start", () => {
    // Wednesday 23 September 2026.
    const quick = quickRanges("2026-09-23");
    expect(quick.thisWeekend).toEqual({ start: "2026-09-25", end: "2026-09-28" });
    expect(quick.nextWeekend).toEqual({ start: "2026-10-02", end: "2026-10-05" });
    expect(quick.weekAway).toEqual({ start: "2026-09-25", end: "2026-10-02" });
    expect(quickRanges("2026-09-23", "2026-10-16").weekAway).toEqual({ start: "2026-10-16", end: "2026-10-23" });
    // A start already gone isn't one to count a week from.
    expect(quickRanges("2026-09-23", "2026-09-01").weekAway).toEqual({ start: "2026-09-25", end: "2026-10-02" });
  });

  it("on Friday, from today", () => {
    expect(quickRanges("2026-09-25").thisWeekend).toEqual({ start: "2026-09-25", end: "2026-09-28" });
    expect(quickRanges("2026-09-25").nextWeekend).toEqual({ start: "2026-10-02", end: "2026-10-05" });
  });

  it("once the weekend has started, from today to Monday, and next weekend is still the coming Friday", () => {
    expect(quickRanges("2026-09-26").thisWeekend).toEqual({ start: "2026-09-26", end: "2026-09-28" });
    expect(quickRanges("2026-09-26").nextWeekend).toEqual({ start: "2026-10-02", end: "2026-10-05" });
    expect(quickRanges("2026-09-27").thisWeekend).toEqual({ start: "2026-09-27", end: "2026-09-28" });
    expect(quickRanges("2026-09-27").nextWeekend).toEqual({ start: "2026-10-02", end: "2026-10-05" });
  });

  it("are the same days in every zone, over a clock change and over the new year", () => {
    for (const zone of ZONES) {
      process.env.TZ = zone;
      // The clocks go back in Europe on Sunday 25 October 2026.
      expect(quickRanges("2026-10-21").thisWeekend, zone).toEqual({ start: "2026-10-23", end: "2026-10-26" });
      // Forward on Sunday 28 March 2027.
      expect(quickRanges("2027-03-22").nextWeekend, zone).toEqual({ start: "2027-04-02", end: "2027-04-05" });
      expect(quickRanges("2026-12-28").thisWeekend, zone).toEqual({ start: "2027-01-01", end: "2027-01-04" });
      expect(nightsBetween(quickRanges("2026-10-21").thisWeekend.start, quickRanges("2026-10-21").thisWeekend.end), zone).toBe(3);
    }
  });
});

describe("the keyboard in the grid", () => {
  const min = "2026-09-23";
  const max = "2027-08-31";

  it("moves a day, a week, a month or a year, and to the ends of the week", () => {
    expect(moveDay("2026-10-16", "ArrowRight", false, min, max)).toBe("2026-10-17");
    expect(moveDay("2026-10-16", "ArrowLeft", false, min, max)).toBe("2026-10-15");
    expect(moveDay("2026-10-16", "ArrowDown", false, min, max)).toBe("2026-10-23");
    expect(moveDay("2026-10-16", "ArrowUp", false, min, max)).toBe("2026-10-09");
    expect(moveDay("2026-10-31", "ArrowRight", false, min, max)).toBe("2026-11-01");
    expect(moveDay("2026-10-16", "PageDown", false, min, max)).toBe("2026-11-16");
    expect(moveDay("2027-01-31", "PageDown", false, min, max)).toBe("2027-02-28");
    expect(moveDay("2026-10-16", "PageUp", false, min, max)).toBe("2026-09-23");
    expect(moveDay("2026-10-16", "PageDown", true, min, max)).toBe(max);
    // Friday 16 October: Monday the 12th to Sunday the 18th.
    expect(moveDay("2026-10-16", "Home", false, min, max)).toBe("2026-10-12");
    expect(moveDay("2026-10-16", "End", false, min, max)).toBe("2026-10-18");
    expect(moveDay("2026-10-18", "End", false, min, max)).toBe("2026-10-18");
  });

  it("never leaves the days that can be picked, and ignores other keys", () => {
    expect(moveDay("2026-09-23", "ArrowLeft", false, min, max)).toBe(min);
    expect(moveDay("2026-09-24", "Home", false, min, max)).toBe(min);
    expect(moveDay("2027-08-31", "ArrowDown", false, min, max)).toBe(max);
    expect(moveDay("2026-10-16", "Enter", false, min, max)).toBeNull();
    expect(moveDay("2026-10-16", "a", false, min, max)).toBeNull();
  });

  it("moves across the clock change a day at a time", () => {
    for (const zone of ZONES) {
      process.env.TZ = zone;
      expect(moveDay("2026-10-24", "ArrowRight", false, min, max), zone).toBe("2026-10-25");
      expect(moveDay("2026-10-25", "ArrowRight", false, min, max), zone).toBe("2026-10-26");
      expect(moveDay("2027-03-28", "ArrowLeft", false, min, max), zone).toBe("2027-03-27");
    }
  });
});

describe("dates in words", () => {
  it("in English, the way a boarding pass has them", () => {
    expect(formatShort("2026-10-16", "en")).toBe("Fri 16 Oct");
    expect(formatLong("2026-10-16", "en")).toBe("Friday 16 October 2026");
    expect(formatSpan("2026-10-16", "2026-10-19", "en")).toBe("Fri 16 → Mon 19 Oct");
    expect(formatSpan("2026-10-30", "2026-11-02", "en")).toBe("Fri 30 Oct → Mon 2 Nov");
    expect(monthTitle({ y: 2026, m: 9 }, "en")).toEqual({ name: "October", year: "2026", full: "October 2026" });
    expect(weekdayNames("en")).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(weekdayNames("en", "long")[0]).toBe("Monday");
  });

  it("in Spanish, without the abbreviations' full stops", () => {
    expect(formatShort("2026-10-16", "es")).toBe("vie 16 oct");
    expect(formatLong("2026-10-16", "es")).toBe("viernes 16 de octubre de 2026");
    expect(formatSpan("2026-10-16", "2026-10-19", "es")).toBe("vie 16 → lun 19 oct");
    expect(formatSpan("2026-10-30", "2026-11-02", "es")).toBe("vie 30 oct → lun 2 nov");
    expect(monthTitle({ y: 2026, m: 9 }, "es")).toEqual({ name: "Octubre", year: "2026", full: "octubre de 2026" });
    expect(weekdayNames("es")).toEqual(["lun", "mar", "mié", "jue", "vie", "sáb", "dom"]);
    expect(weekdayNames("es", "long")[6]).toBe("domingo");
  });

  it("names the day meant in every zone, on both sides of a clock change", () => {
    for (const zone of ZONES) {
      process.env.TZ = zone;
      expect(formatShort("2026-10-25", "en"), zone).toBe("Sun 25 Oct");
      expect(formatShort("2027-03-28", "es"), zone).toBe("dom 28 mar");
      expect(formatLong("2026-09-06", "en"), zone).toBe("Sunday 6 September 2026");
      expect(formatSpan("2026-10-23", "2026-10-26", "en"), zone).toBe("Fri 23 → Mon 26 Oct");
    }
  });
});
