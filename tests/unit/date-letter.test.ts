import { describe, expect, it } from "vitest";
import { dayIso, dayOf } from "@/lib/games/daily";
import { weekOf, weekStart } from "@/lib/games/weekly";
import { dateLetterOn } from "@/lib/lifecycle/date-letter-flag";
import { LETTER_EPOCH, cleanPath, isLastSendDay, isSendDay, letterDecision, letterSlot, letterWeek, otherEmailToday, type LetterDayFacts } from "@/lib/lifecycle/date-letter";
import { ymdOf } from "@/lib/lifecycle/monthsaries";

const at = (iso: string) => new Date(iso);
const DAY = 86_400_000;
const none: LetterDayFacts = { idea: null, monthsarySince: null, reminderDays: [], savedDateDays: [] };

describe("the date letter's rules", () => {
  it("W1 only \"on\" switches it on", () => {
    for (const value of [undefined, "", "ON", "true", "1", "yes"]) expect(dateLetterOn({ DATE_LETTER: value }), String(value)).toBe(false);
    expect(dateLetterOn({})).toBe(false);
    expect(dateLetterOn({ DATE_LETTER: "on" })).toBe(true);
  });

  it("W2 week 1 starts on Monday 4 January 2027", () => {
    expect(dayIso(weekStart(LETTER_EPOCH))).toBe("2027-01-04");
    expect(letterSlot(LETTER_EPOCH)).toBe(1);
    for (let i = 0; i < 20; i++) {
      const d = new Date(Date.UTC(2026, 0, 1) + i * 37.3 * DAY + i * 3_600_123);
      expect(letterWeek(d)).toBe(weekOf(dayOf(d.getTime())));
    }
  });

  it("W3 the week's idea is the same all week and changes on Monday 00:00 UTC", () => {
    const monday = at("2027-03-08T00:00:00.000Z");
    const sunday = at("2027-03-14T23:59:59.999Z");
    const next = at("2027-03-15T00:00:00.000Z");
    expect(monday.getUTCDay()).toBe(1);
    expect(letterSlot(letterWeek(monday))).toBe(letterSlot(letterWeek(sunday)));
    expect(letterSlot(letterWeek(next))).toBe((letterSlot(letterWeek(sunday)) % 52) + 1);
    // One millisecond before Monday is still last week.
    expect(letterSlot(letterWeek(new Date(monday.getTime() - 1)))).toBe(((letterSlot(letterWeek(monday)) + 50) % 52) + 1);
  });

  it("W4 nothing is skipped or shown twice at a new year, 53-week years included", () => {
    for (const [from, to] of [
      ["2026-12-21", "2027-01-18"],
      ["2032-12-20", "2033-01-17"],
    ]) {
      let previous: number | null = null;
      for (let t = Date.parse(`${from}T12:00:00Z`); t <= Date.parse(`${to}T12:00:00Z`); t += 7 * DAY) {
        const slot = letterSlot(letterWeek(new Date(t)));
        if (previous !== null) expect(slot, new Date(t).toISOString()).toBe(previous === 52 ? 1 : previous + 1);
        previous = slot;
      }
    }
    // 2026 and 2032 are calendar years with 53 ISO weeks; every run of 52 weeks still shows each entry once.
    for (let t = Date.parse("2026-01-05T00:00:00Z"); t < Date.parse("2035-01-01T00:00:00Z"); t += 7 * DAY) {
      const slots = new Set<number>();
      for (let w = 0; w < 52; w++) slots.add(letterSlot(letterWeek(new Date(t + w * 7 * DAY))));
      expect(slots.size).toBe(52);
    }
  });

  it("W5 it goes on Thursday, and waits no later than Friday", () => {
    // Monday 8 March 2027 to Sunday 14 March.
    const days = ["2027-03-08", "2027-03-09", "2027-03-10", "2027-03-11", "2027-03-12", "2027-03-13", "2027-03-14"];
    const send = [false, false, false, true, true, false, false];
    const last = [false, false, false, false, true, false, false];
    days.forEach((day, i) => {
      for (const time of ["00:00:00.000", "23:59:59.999"]) {
        const d = at(`${day}T${time}Z`);
        expect(isSendDay(d), `${day} ${time}`).toBe(send[i]);
        expect(isLastSendDay(d), `${day} ${time}`).toBe(last[i]);
      }
    });
  });

  it("W6 knows when another e-mail of ours goes today", () => {
    const today = at("2027-03-11T09:00:00Z");
    const ymd = (offset: number) => ymdOf(new Date(Date.UTC(2027, 2, 11) + offset * DAY));
    // The monthly idea: its day of the month is the 11th when `since` is a 11th.
    expect(otherEmailToday({ ...none, idea: { since: "2027-01-11", handledFor: null, lastSentOn: null } }, today)).toBe(true);
    expect(otherEmailToday({ ...none, idea: { since: "2026-11-20", handledFor: null, lastSentOn: ymd(0) } }, today)).toBe(true);
    expect(otherEmailToday({ ...none, idea: { since: "2027-01-10", handledFor: null, lastSentOn: null } }, today)).toBe(true);
    expect(otherEmailToday({ ...none, idea: { since: "2027-01-10", handledFor: "2027-03-10", lastSentOn: "2027-03-10" } }, today)).toBe(false);
    expect(otherEmailToday({ ...none, idea: null }, today)).toBe(false);
    // A monthsary today, or tomorrow (its check-in goes today); not in two days.
    expect(otherEmailToday({ ...none, monthsarySince: "2026-06-11" }, today)).toBe(true);
    expect(otherEmailToday({ ...none, monthsarySince: "2026-06-12" }, today)).toBe(true);
    expect(otherEmailToday({ ...none, monthsarySince: "2026-06-13" }, today)).toBe(false);
    // Reminder e-mails go nine, seven, two and one days before a saved day.
    for (const ahead of [7, 2, 1, 9]) {
      const d = new Date(Date.UTC(2027, 2, 11) + ahead * DAY);
      expect(otherEmailToday({ ...none, reminderDays: [{ month: d.getUTCMonth() + 1, day: d.getUTCDate() }] }, today), `${ahead} days`).toBe(true);
    }
    const three = new Date(Date.UTC(2027, 2, 14));
    expect(otherEmailToday({ ...none, reminderDays: [{ month: three.getUTCMonth() + 1, day: three.getUTCDate() }] }, today)).toBe(false);
    // A member's saved date: its e-mail goes the day before.
    expect(otherEmailToday({ ...none, savedDateDays: [ymd(1)] }, today)).toBe(true);
    expect(otherEmailToday({ ...none, savedDateDays: [ymd(0)] }, today)).toBe(false);
  });

  it("W7 decides send, skip or hold", () => {
    const thu = at("2027-03-11T09:00:00Z");
    const fri = at("2027-03-12T09:00:00Z");
    expect(letterDecision("a@example.com", { optedOut: false, other: false }, thu)).toBe("skip");
    expect(letterDecision("sam@mail.com", { optedOut: true, other: false }, thu)).toBe("skip");
    expect(letterDecision("sam@mail.com", { optedOut: false, other: true }, thu)).toBe("hold");
    expect(letterDecision("sam@mail.com", { optedOut: false, other: true }, fri)).toBe("skip");
    expect(letterDecision("sam@mail.com", { optedOut: false, other: false }, thu)).toBe("send");
    expect(letterDecision("sam@mail.com", { optedOut: true, other: true }, thu)).toBe("skip");
  });

  it("W8 keeps only a plain path", () => {
    for (const ok of ["/es/dates/ideas/cheap", "/blog/x-y", "/"]) expect(cleanPath(ok)).toBe(ok);
    for (const bad of ["/Dates", "/plan?x=1", "//evil.com", "/a b", `/${"a".repeat(199)}`, undefined, 42, null, "dates"]) expect(cleanPath(bad), String(bad)).toBe("/");
  });
});
