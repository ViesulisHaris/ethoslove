import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  IDEA_MODES,
  RESERVED,
  customerEmailAllowed,
  enrolDecision,
  ideaDecision,
  ideaDue,
  ideaHint,
  ideaMode,
  ideaPaused,
  ideaSince,
  ideaWindow,
  nearReminderEmail,
  nearSavedDateEmail,
  priceEndsAt,
  priceLastDay,
  termsRequired,
  type EnrolInput,
  type IdeaAccount,
  type IdeaBasis,
  type IdeaFacts,
  type IdeaMode,
} from "@/lib/lifecycle/monthly-idea";
import { ymdOf } from "@/lib/lifecycle/monthsaries";

const day = (ymd: string) => new Date(`${ymd}T09:00:00Z`);
const facts = (over: Partial<IdeaFacts> = {}): IdeaFacts => ({
  email: "sam@mail.com",
  optedOut: false,
  hasMonthsary: false,
  reminderDays: [],
  savedDateDays: [],
  boxYes: false,
  customer: false,
  ownsEverything: false,
  holdsGift: false,
  ...over,
});
const fresh = (basis: IdeaBasis = "notice") => ({ basis, lastSentOn: null, priceSentAt: null });

describe("the setting", () => {
  it("U1 reads the setting, and anything else is off", () => {
    for (const value of [undefined, "", "ALL", "yes", " all"]) expect(ideaMode({ MONTHLY_IDEA_EMAILS: value })).toBe("off");
    for (const value of IDEA_MODES) expect(ideaMode({ MONTHLY_IDEA_EMAILS: value })).toBe(value);
  });

  it("U2 pauses until its day", () => {
    const env = { MONTHLY_IDEA_PAUSE_UNTIL: "2026-12-10" };
    expect(ideaPaused(day("2026-12-09"), env)).toBe(true);
    expect(ideaPaused(day("2026-12-10"), env)).toBe(false);
    expect(ideaPaused(day("2026-12-09"), {})).toBe(false);
    expect(ideaPaused(day("2026-12-09"), { MONTHLY_IDEA_PAUSE_UNTIL: "soon" })).toBe(false);
  });
});

describe("when it is due", () => {
  it("U3 is due on the day of the month the gift went out", () => {
    expect(ideaDue({ since: "2026-03-15", handledFor: null }, day("2026-04-15"))).toEqual({ date: "2026-04-15", month: 1 });
    expect(ideaDue({ since: "2026-03-31", handledFor: null }, day("2026-04-30"))).toEqual({ date: "2026-04-30", month: 1 });
    expect(ideaDue({ since: "2026-03-31", handledFor: null }, day("2027-02-28"))).toEqual({ date: "2027-02-28", month: 11 });
    expect(ideaDue({ since: "2027-03-31", handledFor: null }, day("2028-02-29"))).toEqual({ date: "2028-02-29", month: 11 });
    expect(ideaDue({ since: "2028-02-29", handledFor: null }, day("2028-03-29"))).toEqual({ date: "2028-03-29", month: 1 });
    expect(ideaDue({ since: "2028-02-29", handledFor: null }, day("2029-02-28"))).toEqual({ date: "2029-02-28", month: 12 });
  });

  it("U4 runs for twelve months and no more", () => {
    expect(ideaDue({ since: "2026-03-15", handledFor: null }, day("2027-03-15"))).toEqual({ date: "2027-03-15", month: 12 });
    expect(ideaDue({ since: "2026-03-15", handledFor: null }, day("2027-04-15"))).toBeNull();
    expect(ideaDue({ since: "2026-03-15", handledFor: null }, day("2026-03-15"))).toBeNull();
    expect(ideaDue({ since: "2026-03-01", handledFor: null }, day("2026-03-02"))).toBeNull();
  });

  it("U5 catches up two days, never three, never twice", () => {
    const state = { since: "2026-03-15", handledFor: null };
    expect(ideaDue(state, day("2026-04-16"))).toEqual({ date: "2026-04-15", month: 1 });
    expect(ideaDue(state, day("2026-04-17"))).toEqual({ date: "2026-04-15", month: 1 });
    expect(ideaDue(state, day("2026-04-18"))).toBeNull();
    for (const d of ["2026-04-15", "2026-04-16", "2026-04-17"]) expect(ideaDue({ since: "2026-03-15", handledFor: "2026-04-15" }, day(d))).toBeNull();
  });

  it("U6 the window never hides a row that is due", () => {
    const start = Date.UTC(2026, 0, 1);
    for (let i = 0; i < 365; i++) {
      const since = new Date(start + i * 86_400_000);
      const sinceYmd = ymdOf(since);
      const sinceDay = since.getUTCDate();
      for (let ahead = 28; ahead <= 370; ahead++) {
        const today = new Date(start + (i + ahead) * 86_400_000);
        if (!ideaDue({ since: sinceYmd, handledFor: null }, today)) continue;
        const w = ideaWindow(today);
        expect(w.days, `${sinceYmd} on ${ymdOf(today)}`).toContain(sinceDay);
        expect(sinceYmd >= w.sinceFrom && sinceYmd <= w.sinceTo, `${sinceYmd} on ${ymdOf(today)}`).toBe(true);
      }
    }
  });

  it("U7 the window leaves out gifts sent this month", () => {
    const today = day("2026-11-24");
    const w = ideaWindow(today);
    for (const back of [0, 1, 25]) expect(ymdOf(new Date(today.getTime() - back * 86_400_000)) > w.sinceTo).toBe(true);
  });
});

describe("who gets it", () => {
  it("U8 knows a reminder's email is near, on both sides, across a new year", () => {
    // A 5 January birthday: its e-mails can go on 27 December (nine days before, without 0025), 29
    // December, 3 and 4 January.
    const birthday = [{ month: 1, day: 5 }];
    expect(nearReminderEmail(birthday, day("2026-12-13"))).toBe(true); // 27 Dec is 14 days ahead
    expect(nearReminderEmail(birthday, day("2026-12-12"))).toBe(false); // 15 days ahead
    expect(nearReminderEmail(birthday, day("2027-01-18"))).toBe(true); // 4 Jan was 14 days ago
    expect(nearReminderEmail(birthday, day("2027-01-19"))).toBe(false); // 15 days ago
    expect(nearReminderEmail(birthday, day("2026-12-20"))).toBe(true);
    expect(nearReminderEmail([], day("2026-12-20"))).toBe(false);
    // A date later in the year: a saved date 23 days away is near (its first e-mail is in 14), 24 is not.
    const june = [{ month: 6, day: 30 }];
    expect(nearReminderEmail(june, day("2026-06-07"))).toBe(true);
    expect(nearReminderEmail(june, day("2026-06-06"))).toBe(false);
    // And on the far side: the day before's e-mail on 29 June; 13 July is 14 days on, 14 July is 15.
    expect(nearReminderEmail(june, day("2026-07-13"))).toBe(true);
    expect(nearReminderEmail(june, day("2026-07-14"))).toBe(false);
  });

  it("U9 sends nothing without an address it can reach, and the reserved domains are send.ts's own", () => {
    expect(ideaDecision(fresh(), facts({ email: "" }), "all", day("2026-11-24"))).toEqual({ send: false, reason: "no_email" });
    expect(ideaDecision(fresh(), facts({ email: null }), "all", day("2026-11-24"))).toEqual({ send: false, reason: "no_email" });
    for (const email of ["a@example.com", "a@x.test"]) expect(ideaDecision(fresh(), facts({ email }), "all", day("2026-11-24"))).toEqual({ send: false, reason: "undeliverable" });
    const source = readFileSync(join(process.cwd(), "src/lib/email/send.ts"), "utf8");
    const match = /const UNDELIVERABLE = \/(.+)\/i;/.exec(source);
    expect(match?.[1]).toBe(RESERVED.source);
  });

  it("U10 leaves monthsary accounts alone", () => {
    expect(ideaDecision(fresh(), facts({ hasMonthsary: true }), "all", day("2026-11-24"))).toEqual({ send: false, reason: "monthsary" });
  });

  it("U11 skips the month near a reminder, and respects the opt-out list first", () => {
    expect(ideaDecision(fresh(), facts({ reminderDays: [{ month: 12, day: 1 }] }), "all", day("2026-11-24"))).toEqual({ send: false, reason: "near_reminder" });
    expect(ideaDecision(fresh(), facts({ optedOut: true, hasMonthsary: true, reminderDays: [{ month: 12, day: 1 }] }), "all", day("2026-11-24"))).toEqual({ send: false, reason: "opted_out" });
  });

  it("U11b a saved date with \"Remind us the day before\" counts too, on both sides of the fourteen days", () => {
    // Saved for 5 December: its e-mail goes on 4 December.
    const saved = ["2026-12-05"];
    expect(nearSavedDateEmail(saved, day("2026-11-20"))).toBe(true); // 14 days before the e-mail
    expect(nearSavedDateEmail(saved, day("2026-11-19"))).toBe(false); // 15
    expect(nearSavedDateEmail(saved, day("2026-12-18"))).toBe(true); // 14 days after it
    expect(nearSavedDateEmail(saved, day("2026-12-19"))).toBe(false); // 15
    expect(nearSavedDateEmail(["not a day"], day("2026-12-04"))).toBe(false);
    expect(ideaDecision(fresh(), facts({ savedDateDays: saved }), "all", day("2026-11-24"))).toEqual({ send: false, reason: "near_reminder" });
    expect(ideaDecision(fresh(), facts({ savedDateDays: saved }), "all", day("2026-11-19")).send).toBe(true);
  });

  it("U12 each mode lets through only its own rows", () => {
    const today = day("2026-11-24");
    const sends = (basis: IdeaBasis, mode: IdeaMode, over: Partial<IdeaFacts>) => ideaDecision(fresh(basis), facts(over), mode, today).send;
    for (const boxYes of [true, false])
      for (const customer of [true, false]) {
        const f = { boxYes, customer };
        for (const basis of ["notice", "box", "terms"] as const) expect(sends(basis, "off", f)).toBe(false);
        expect(sends("notice", "optin", f)).toBe(false);
        expect(sends("box", "optin", f)).toBe(boxYes);
        expect(sends("terms", "optin", f)).toBe(false);
        expect(sends("notice", "buyers", f)).toBe(customer);
        expect(sends("box", "buyers", f)).toBe(boxYes);
        expect(sends("terms", "buyers", f)).toBe(false);
        for (const basis of ["notice", "terms"] as const) expect(sends(basis, "all", f)).toBe(true);
        // A box row whose box was unticked has withdrawn its yes, in "all" too.
        expect(sends("box", "all", f)).toBe(boxYes);
      }
  });

  it("U13 the price rides in the first email only, and never to someone with nothing to buy", () => {
    const today = day("2026-11-24");
    expect(ideaDecision(fresh(), facts(), "all", today)).toEqual({ send: true, withPrice: true });
    expect(ideaDecision({ ...fresh(), lastSentOn: "2026-10-24" }, facts(), "all", today)).toEqual({ send: true, withPrice: false });
    expect(ideaDecision({ ...fresh(), priceSentAt: "2026-10-24T08:00:00Z" }, facts(), "all", today)).toEqual({ send: true, withPrice: false });
    expect(ideaDecision(fresh(), facts({ ownsEverything: true }), "all", today)).toEqual({ send: true, withPrice: false });
    expect(ideaDecision(fresh(), facts({ holdsGift: true }), "all", today)).toEqual({ send: true, withPrice: false });
  });

  it("U14 the price lasts seven whole days", () => {
    expect(ymdOf(priceLastDay(day("2026-12-20")))).toBe("2026-12-27");
    // The end of 27 December at UTC-8: midnight in California, 3 AM in New York, 8 AM in London.
    expect(priceEndsAt(day("2026-12-20"))).toBe(Date.UTC(2026, 11, 28, 8));
    // Nowhere from UTC-8 east does it end before the named day does there (monthly-D5).
    for (const zone of ["America/Los_Angeles", "America/New_York", "Europe/London", "Europe/Riga", "Asia/Tokyo"]) {
      const local = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date(priceEndsAt(day("2026-12-20")) - 1));
      const get = (t: string) => local.find((x) => x.type === t)!.value;
      expect(`${get("year")}-${get("month")}-${get("day")}` >= "2026-12-27", zone).toBe(true);
    }
    expect(ymdOf(priceLastDay(day("2026-11-28")))).toBe("2026-12-05");
    expect(ymdOf(priceLastDay(day("2026-12-29")))).toBe("2027-01-05");
    expect(priceEndsAt(day("2026-12-29"))).toBe(Date.UTC(2027, 0, 6, 8));
  });
});

describe("enrolment", () => {
  const none: IdeaAccount = { row: null, customer: false };
  const base = (over: Partial<EnrolInput> = {}): EnrolInput => ({
    mode: "all",
    firstPublish: true,
    freeReply: false,
    campaign: false,
    quiet: false,
    deliverable: true,
    paidSend: false,
    account: none,
    acceptedTerms: false,
    ...over,
  });

  it("U15 enrols who the mode says, once", () => {
    for (const mode of ["off", "optin"] as const) expect(enrolDecision(base({ mode, paidSend: true, account: { row: null, customer: true } }))).toEqual({ enrol: false });
    for (const over of [{ firstPublish: false }, { freeReply: true }, { campaign: true }, { quiet: true }, { deliverable: false }])
      expect(enrolDecision(base({ ...over, paidSend: true }))).toEqual({ enrol: false });
    // A row moves its day, whatever the mode that lets enrolment run.
    for (const mode of ["buyers", "all"] as const) expect(enrolDecision(base({ mode, account: { row: { basis: "box", offAt: null }, customer: false } }))).toEqual({ enrol: true, basis: "box", fresh: false });
    for (const mode of ["buyers", "all"] as const) expect(enrolDecision(base({ mode, account: { row: null, customer: true } }))).toEqual({ enrol: true, basis: "notice", fresh: true });
    expect(enrolDecision(base({ mode: "buyers", paidSend: true }))).toEqual({ enrol: false });
    // Where a seller may not write to its own customers unasked, a buyer is never enrolled by the notice.
    for (const mode of ["buyers", "all"] as const) expect(enrolDecision(base({ mode, customerEmail: false, paidSend: true, account: { row: null, customer: true } }))).toEqual({ enrol: false });
    expect(enrolDecision(base({ customerEmail: false, paidSend: true, acceptedTerms: true }))).toEqual({ enrol: true, basis: "terms", fresh: true });
    expect(enrolDecision(base({ customerEmail: false, account: { row: { basis: "notice", offAt: null }, customer: true } }))).toEqual({ enrol: true, basis: "notice", fresh: false });
    for (const country of ["US", "gb", "LV", "DE", "ES", "MX", "CA", "AU", "", null, undefined]) expect(customerEmailAllowed(country), String(country)).toBe(true);
    for (const country of ["PL", "pl", "HU", "TR", "RU", "CN", "KR"]) expect(customerEmailAllowed(country), country).toBe(false);
    expect(enrolDecision(base({ paidSend: true }))).toEqual({ enrol: true, basis: "notice", fresh: true });
    expect(enrolDecision(base({ acceptedTerms: true }))).toEqual({ enrol: true, basis: "terms", fresh: true });
    expect(enrolDecision(base())).toEqual({ enrol: false });
    // A stop is never undone by another gift, in any mode.
    for (const mode of IDEA_MODES)
      expect(enrolDecision(base({ mode, paidSend: true, acceptedTerms: true, account: { row: { basis: "notice", offAt: "2026-11-01T00:00:00Z" }, customer: true } }))).toEqual({ enrol: false });
  });

  it("U16 asks for the Terms exactly when the hint says so", () => {
    const rows = [null, { basis: "notice" as const, offAt: null }, { basis: "terms" as const, offAt: "2026-11-01T00:00:00Z" }];
    for (const mode of IDEA_MODES)
      for (const unlocked of [true, false])
        for (const customer of [true, false])
          for (const row of rows) {
            const account = { row, customer };
            const input = { mode, firstPublish: true, freeReply: false, campaign: false, quiet: false, paidSend: unlocked, account };
            expect(termsRequired(input), `${mode} ${unlocked} ${customer} ${JSON.stringify(row)}`).toBe(ideaHint(mode, { unlocked, account }) === "box");
          }
    const asked = { mode: "all" as const, firstPublish: true, freeReply: false, campaign: false, quiet: false, paidSend: false, account: none };
    expect(termsRequired(asked)).toBe(true);
    for (const over of [{ freeReply: true }, { campaign: true }, { quiet: true }, { firstPublish: false }]) expect(termsRequired({ ...asked, ...over })).toBe(false);
  });

  it("dates a scheduled gift by the day it opens", () => {
    const now = new Date("2026-11-24T22:00:00Z");
    expect(ideaSince(now)).toBe("2026-11-24");
    expect(ideaSince(now, "2026-12-25T07:00:00Z")).toBe("2026-12-25");
    expect(ideaSince(now, "nonsense")).toBe("2026-11-24");
  });
});
