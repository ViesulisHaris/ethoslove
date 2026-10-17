import { describe, expect, it } from "vitest";
import { canTurn, focusDay, formatDayField, openingMonth } from "@/lib/pickers/day";
import { daysFor, monthNames, withDay, withMonth } from "@/lib/pickers/month-day";
import {
  formatTime,
  minuteChoices,
  moveInGrid,
  parseTime,
  withHour,
  withMinute,
} from "@/lib/pickers/time";
import { joinWall, splitWall } from "@/lib/pickers/wall-time";

describe("a time of day", () => {
  it("reads only real 24-hour times", () => {
    expect(parseTime("19:30")).toEqual({ hour: 19, minute: 30 });
    expect(parseTime("00:00")).toEqual({ hour: 0, minute: 0 });
    for (const bad of ["24:00", "7:30", "19:60", "19:3", "", undefined, null, "19:30:00"])
      expect(parseTime(bad)).toBeNull();
    expect(formatTime({ hour: 7, minute: 5 })).toBe("07:05");
  });

  it("takes an hour keeping the minutes, or on the hour when there are none", () => {
    expect(withHour(undefined, 19)).toBe("19:00");
    expect(withHour("18:45", 9)).toBe("09:45");
    expect(withHour("nonsense", 0)).toBe("00:00");
  });

  it("puts minutes only on an hour already there", () => {
    expect(withMinute("19:00", 30)).toBe("19:30");
    expect(withMinute(undefined, 30)).toBeUndefined();
  });

  it("offers the quarters, and a time's own minutes beside them", () => {
    expect(minuteChoices(undefined)).toEqual([0, 15, 30, 45]);
    expect(minuteChoices("19:30")).toEqual([0, 15, 30, 45]);
    expect(minuteChoices("18:10")).toEqual([0, 10, 15, 30, 45]);
  });

  it("moves round a grid without wrapping", () => {
    expect(moveInGrid(0, "ArrowRight", 6, 24)).toBe(1);
    expect(moveInGrid(0, "ArrowLeft", 6, 24)).toBe(0);
    expect(moveInGrid(3, "ArrowDown", 6, 24)).toBe(9);
    expect(moveInGrid(21, "ArrowDown", 6, 24)).toBe(21);
    expect(moveInGrid(9, "ArrowUp", 6, 24)).toBe(3);
    expect(moveInGrid(9, "Home", 6, 24)).toBe(0);
    expect(moveInGrid(9, "End", 6, 24)).toBe(23);
    expect(moveInGrid(9, "Enter", 6, 24)).toBeNull();
  });
});

describe("a day that comes round every year", () => {
  it("counts February in a leap year, so the 29th is there", () => {
    expect(daysFor(2)).toBe(29);
    expect(daysFor(4)).toBe(30);
    expect(daysFor(12)).toBe(31);
  });

  it("keeps the day across months, or the month's last when it is shorter", () => {
    expect(withMonth({ month: 1, day: 31 }, 2)).toEqual({ month: 2, day: 29 });
    expect(withMonth({ month: 3, day: 31 }, 4)).toEqual({ month: 4, day: 30 });
    expect(withMonth({ month: 2, day: 14 }, 10)).toEqual({ month: 10, day: 14 });
    expect(withDay({ month: 2, day: 1 }, 29)).toEqual({ month: 2, day: 29 });
    expect(withDay({ month: 2, day: 1 }, 31)).toEqual({ month: 2, day: 29 });
  });

  it("names the months in both languages", () => {
    expect(monthNames("en")).toHaveLength(12);
    expect(monthNames("en")[1]).toBe("Feb");
    expect(monthNames("en")[8]).toBe("Sep");
    expect(monthNames("es")[8]).toBe("Sep");
    expect(monthNames("es")[0]).toBe("Ene");
    expect(monthNames("es", "long")[1]).toBe("Febrero");
  });
});

describe("one day on the calendar", () => {
  it("opens on the day chosen, or today, inside the ends", () => {
    expect(openingMonth("2026-12-24", "2026-09-24")).toEqual({ y: 2026, m: 11 });
    expect(openingMonth("", "2026-09-24")).toEqual({ y: 2026, m: 8 });
    expect(openingMonth("2025-01-01", "2026-09-24", "2026-09-24")).toEqual({ y: 2026, m: 8 });
  });

  it("turns no further than the ends", () => {
    expect(canTurn({ y: 2026, m: 8 }, -1, "2026-09-24")).toBe(false);
    expect(canTurn({ y: 2026, m: 9 }, -1, "2026-09-24")).toBe(true);
    expect(canTurn({ y: 2026, m: 8 }, 1, undefined, "2026-09-30")).toBe(false);
    expect(canTurn({ y: 2026, m: 8 }, 1)).toBe(true);
  });

  it("gives the Tab key to the chosen day, today, or the first that can be picked", () => {
    expect(focusDay({ y: 2026, m: 8 }, "2026-09-12", "2026-09-24")).toBe("2026-09-12");
    expect(focusDay({ y: 2026, m: 8 }, "", "2026-09-24")).toBe("2026-09-24");
    expect(focusDay({ y: 2026, m: 9 }, "", "2026-09-24")).toBe("2026-10-01");
    expect(focusDay({ y: 2026, m: 8 }, "2026-09-02", "2026-09-24", "2026-09-24")).toBe(
      "2026-09-24",
    );
  });

  it("names the day with its year", () => {
    expect(formatDayField("2026-06-13", "en")).toBe("Sat 13 Jun 2026");
    expect(formatDayField("2026-06-13", "es")).toBe("sáb 13 jun 2026");
  });
});

describe("a moment as a day and a time", () => {
  it("splits and joins the datetime-local strings the editor keeps", () => {
    expect(splitWall("2027-06-14T19:30")).toEqual({ day: "2027-06-14", time: "19:30" });
    expect(splitWall("")).toEqual({ day: "", time: "" });
    expect(joinWall("2027-06-14", "19:30")).toBe("2027-06-14T19:30");
    expect(joinWall("2027-06-14", undefined)).toBe("2027-06-14T00:00");
    expect(joinWall("", "19:30")).toBe("");
  });
});
