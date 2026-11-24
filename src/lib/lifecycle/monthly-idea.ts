import { LEAD_DAYS, STAGE_DAYS, occurrenceIn, type MonthDay } from "./reminders";
import { daysLandingOn, monthsaryOn, parseYmd, ymdOf, type Ymd } from "./monthsaries";

/**
 * The monthly idea: after someone sends a gift, one email a month for a year, each with one template
 * for the season ("A birthday coming up?"), and in the very first one a one-time price. General on
 * purpose (the owner, 20 Nov 2026): it never names the person a gift was for, the template they used,
 * or "a month ago". Stopped with one tap from any email, the share screen or the account page, and
 * a stop survives sending another gift.
 *
 * Everything here is a pure rule on UTC calendar days, like the reminders: no database, no
 * `server-only`, so the send sheet and the tests import it. The job is monthly-idea-job.ts; the
 * enrolment when a gift is sent is monthly-idea-enrol.ts.
 *
 * It ships switched off: MONTHLY_IDEA_EMAILS unset is "off", and then nothing reads or writes.
 */

export const IDEA_MODES = ["off", "optin", "buyers", "all"] as const;
export type IdeaMode = (typeof IDEA_MODES)[number];

/** MONTHLY_IDEA_EMAILS; unset or anything else is "off". Server-side only: the browser reads "off". */
export function ideaMode(env: Record<string, string | undefined> = process.env): IdeaMode {
  const value = env.MONTHLY_IDEA_EMAILS;
  return (IDEA_MODES as readonly string[]).includes(value ?? "") ? (value as IdeaMode) : "off";
}

/** MONTHLY_IDEA_PAUSE_UNTIL=YYYY-MM-DD: true while `today` (UTC) is before that day. Unset or not a real day: false. */
export function ideaPaused(today: Date, env: Record<string, string | undefined> = process.env): boolean {
  const until = env.MONTHLY_IDEA_PAUSE_UNTIL;
  if (!until || !parseYmd(until)) return false;
  return ymdOf(utcDay(today)) < until;
}

/** For a year after the last gift. */
export const IDEA_MONTHS = 12;
/** No idea email this close to another optional email of theirs, before or after. */
export const IDEA_QUIET_DAYS = 14;
/** How long the one-time price lasts: seven whole days after the email. */
export const IDEA_PRICE_DAYS = 7;
/** Where a click from the email came from (`?ref=`). */
export const IDEA_REF = "email-monthly";
/** How someone came to get it: told when sending (notice), the offers box (box), the free version's Terms box (terms). */
export type IdeaBasis = "notice" | "box" | "terms";

const DAY_MS = 86_400_000;
const utcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);

/** The UTC day a gift goes out: today, or the day of `unlockAt` for a scheduled one. */
export function ideaSince(now: Date, unlockAt?: string | null): Ymd {
  if (unlockAt) {
    const at = new Date(unlockAt);
    if (!Number.isNaN(at.getTime()) && at.getTime() > now.getTime()) return ymdOf(utcDay(at));
  }
  return ymdOf(utcDay(now));
}

/**
 * The monthly date to deal with on `today`: today's, else yesterday's, else the day before's (a run
 * that missed a morning still sends, two days late at most); months 1 to 12 only; never one already
 * handled.
 */
export function ideaDue(state: { since: Ymd; handledFor: Ymd | null }, today: Date): { date: Ymd; month: number } | null {
  const since = parseYmd(state.since);
  if (!since) return null;
  const start = utcDay(today);
  for (let back = 0; back <= 2; back++) {
    const d = addDays(start, -back);
    const month = monthsaryOn(since, d);
    if (month === null || month > IDEA_MONTHS) continue;
    const date = ymdOf(d);
    if (state.handledFor === null || state.handledFor < date) return { date, month };
  }
  return null;
}

/**
 * What the job asks the database for: rows whose day of the month lands on today or the two days
 * before, whose gift went out between 26 and 372 days ago (a due date is 28 to 366 days after it,
 * plus the two days' catch-up), and that weren't handled in those three days. Without the `since`
 * window every account that sent a gift in the last three days would match its own day and fill the
 * batch ahead of the rows that are due.
 */
export function ideaWindow(today: Date): { days: number[]; sinceFrom: Ymd; sinceTo: Ymd; handledBefore: Ymd } {
  const start = utcDay(today);
  const days = [...new Set([0, 1, 2].flatMap((back) => daysLandingOn(addDays(start, -back))))].sort((a, b) => a - b);
  return { days, sinceFrom: ymdOf(addDays(start, -372)), sinceTo: ymdOf(addDays(start, -26)), handledBefore: ymdOf(addDays(start, -2)) };
}

/**
 * The days before a saved date that a reminder e-mail can go: the three e-mails (seven, two and one
 * days before, lib/lifecycle/reminders.ts STAGE_DAYS) and the one e-mail nine days before that the
 * job sends while migration 0025 is missing.
 */
const REMINDER_EMAIL_LEADS = [...new Set([LEAD_DAYS, ...Object.values(STAGE_DAYS)])];

/**
 * True when a reminder e-mail of theirs goes within `quiet` days of `today`, before or after: the
 * monthly idea and the date reminders are two different things and never land on top of each other.
 * Read from the saved dates alone, so a reminder that may have gone counts as gone.
 */
export function nearReminderEmail(dates: readonly MonthDay[], today: Date, quiet = IDEA_QUIET_DAYS): boolean {
  const day = utcDay(today).getTime();
  const year = utcDay(today).getUTCFullYear();
  for (const date of dates) {
    for (let y = year - 1; y <= year + 1; y++) {
      const occurrence = occurrenceIn(y, date);
      for (const lead of REMINDER_EMAIL_LEADS) {
        const emailDay = addDays(occurrence, -lead).getTime();
        if (Math.abs(emailDay - day) <= quiet * DAY_MS) return true;
      }
    }
  }
  return false;
}

/** The same address check as lib/email/send.ts (server-only there); tests/unit/monthly-idea.test.ts holds the two equal. */
export const RESERVED = /@(?:[^@]+\.)?(?:example\.(?:com|org|net)|[^@]+\.(?:test|invalid|localhost|example))$/i;

export type IdeaFacts = {
  /** profiles.email; "" counts as none. */
  email: string | null;
  /** email_optouts holds its hash. */
  optedOut: boolean;
  /** A monthsaries row: they get a monthly email already. */
  hasMonthsary: boolean;
  /** The account's reminders, and keep_reminders of confirmed keeps at this address. */
  reminderDays: MonthDay[];
  /** An offer_emails row. */
  boxYes: boolean;
  /** A paid purchase made on the site. */
  customer: boolean;
  /** A template_unlocks row "*": nothing to sell. */
  ownsEverything: boolean;
  /** A gift ready (gift_credits) not used yet: they have a gift to make already, so no price. */
  holdsGift: boolean;
};
export type IdeaSkip = "no_email" | "undeliverable" | "opted_out" | "monthsary" | "near_reminder" | "not_permitted";

/** Whether a row's basis is let through by the setting (the table in PLAN-monthly.md step 2). */
function permitted(basis: IdeaBasis, facts: IdeaFacts, mode: IdeaMode): boolean {
  if (mode === "all") return true;
  if (mode === "off") return false;
  if (basis === "box") return facts.boxYes;
  if (basis === "notice") return mode === "buyers" && facts.customer;
  return false;
}

/** Whether this month's email goes to this row, and whether it carries the one-time price. */
export function ideaDecision(
  row: { basis: IdeaBasis; lastSentOn: Ymd | null; priceSentAt: string | null },
  facts: IdeaFacts,
  mode: IdeaMode,
  today: Date,
): { send: true; withPrice: boolean } | { send: false; reason: IdeaSkip } {
  const email = facts.email?.trim() ?? "";
  if (!email) return { send: false, reason: "no_email" };
  if (RESERVED.test(email)) return { send: false, reason: "undeliverable" };
  if (facts.optedOut) return { send: false, reason: "opted_out" };
  if (facts.hasMonthsary) return { send: false, reason: "monthsary" };
  if (nearReminderEmail(facts.reminderDays, today)) return { send: false, reason: "near_reminder" };
  if (!permitted(row.basis, facts, mode)) return { send: false, reason: "not_permitted" };
  const withPrice = row.lastSentOn === null && row.priceSentAt === null && !facts.ownsEverything && !facts.holdsGift;
  return { send: true, withPrice };
}

/** When a price sent on `sentOn` stops working: the start of the eighth UTC day after it (ms). */
export function priceEndsAt(sentOn: Date): number {
  return addDays(utcDay(sentOn), IDEA_PRICE_DAYS + 1).getTime();
}

/** The last whole day it works, which is the day the email names: the seventh after `sentOn`. */
export function priceLastDay(sentOn: Date): Date {
  return addDays(utcDay(sentOn), IDEA_PRICE_DAYS);
}

/** The account as enrolment sees it: its row (if any), and whether it ever paid on the site. */
export type IdeaAccount = { row: { basis: IdeaBasis; offAt: string | null } | null; customer: boolean };
export type EnrolInput = {
  mode: IdeaMode;
  /** The gift was a draft until now (a re-publish never moves the day). */
  firstPublish: boolean;
  /** A free reply to a gift: not a sender of their own. */
  freeReply: boolean;
  /** Made under a campaign grant. */
  campaign: boolean;
  /** Sent from the iPhone app or in Etsy mode: the notice could not be shown there. */
  quiet: boolean;
  /** The account's address can receive mail. */
  deliverable: boolean;
  /** This gift was paid for (its template is unlocked, or its photos were bought). */
  paidSend: boolean;
  account: IdeaAccount;
  /** They ticked the free version's Terms box. */
  acceptedTerms: boolean;
};

/** In "all": a free gift from someone who never paid and has no row needs the Terms box ticked to be sent. */
export function termsRequired(input: Omit<EnrolInput, "acceptedTerms" | "deliverable">): boolean {
  return input.mode === "all" && input.firstPublish && !input.freeReply && !input.campaign && !input.quiet && !input.paidSend && !input.account.customer && input.account.row === null;
}

/** Whether sending this gift starts (or moves) the monthly idea, and on what basis. A stop is never undone here. */
export function enrolDecision(input: EnrolInput): { enrol: false } | { enrol: true; basis: IdeaBasis; fresh: boolean } {
  const { mode, account } = input;
  if (mode === "off" || mode === "optin") return { enrol: false };
  if (!input.firstPublish || input.freeReply || input.campaign || input.quiet || !input.deliverable) return { enrol: false };
  if (account.row?.offAt) return { enrol: false };
  if (account.row) return { enrol: true, basis: account.row.basis, fresh: false };
  if (account.customer) return { enrol: true, basis: "notice", fresh: true };
  if (mode === "buyers") return { enrol: false };
  if (input.paidSend) return { enrol: true, basis: "notice", fresh: true };
  if (input.acceptedTerms) return { enrol: true, basis: "terms", fresh: true };
  return { enrol: false };
}

export type IdeaHint = "box" | "none";

/** What the send sheet is told for a signed-in account before publishing: show the Terms box, or nothing. */
export function ideaHint(mode: IdeaMode, facts: { unlocked: boolean; account: IdeaAccount }): IdeaHint {
  return mode === "all" && !facts.unlocked && !facts.account.customer && facts.account.row === null ? "box" : "none";
}
