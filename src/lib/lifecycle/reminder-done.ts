import "server-only";

import type { Db } from "@/lib/commerce/db";
import { isMissingColumn } from "@/lib/commerce/db";
import type { Occasion } from "@/config/occasions";
import { sameName } from "./last-gift";
import { DONE_STAGE, nextOccurrence, occurrenceIn, type ReminderOccasion } from "./reminders";

/**
 * The e-mails before a day stop once the gift for it is made: a gift published or scheduled by the
 * account for someone of a reminder's name, while that person's day is at most this many days away,
 * marks that reminder done for the year (last_sent_year = that year, last_stage = 3), when the gift's
 * template is one for that occasion (a Christmas gift is not a birthday's), and only the nearest such
 * day (a birthday gift made three days before it is not also the anniversary's a week later).
 * A gift that counts down to a day is that day's only: a Scrapbook counting down to 25 December is
 * not the gift for a birthday on the 28th, however well its template fits a birthday.
 * Further out, a gift is not for that day, and the e-mails still come, unless it is scheduled to open
 * on that day (within a day either side, for the time zones), however far ahead it was made.
 * Republishing a gift that was already out before the window (an edit of last year's) makes nothing.
 * A gift made after "Open my gift" in a reminder's e-mail (`forReminder`) is that reminder's while its
 * day is in the window, whatever the gift counts down to ("Until I land" two days before her birthday)
 * and whatever its template's occasions; it then settles that reminder alone, besides any day it is
 * scheduled to open on (not one it merely counts down to).
 */
export const MADE_FOR_WINDOW_DAYS = 10;

const DAY_MS = 86_400_000;

/**
 * What the publish knows of the gift: when it opens if scheduled, when it was out before, if it was,
 * and its template's occasions (manifest.occasions). Without occasions, every occasion counts.
 */
export type MadeGift = {
  unlockAt?: string | null;
  wasOutSince?: string | null;
  occasions?: readonly Occasion[];
  /** The day the gift counts down to (countdownDay, YYYY-MM-DD), if it has a countdown. */
  countsDownTo?: string | null;
  /** The reminder whose e-mail started this gift (the cookie api/reminders/open sets), if any. */
  forReminder?: string | null;
};

/** The occasions that are a reminder's own; any other (Christmas, Mother's Day…) is a reminder's "other" day. */
const OWN: readonly Occasion[] = ["birthday", "anniversary", "valentines"];

/** Pure: whether a gift of a template for these occasions can be the gift for a reminder of this occasion. */
export function giftFitsOccasion(occasion: ReminderOccasion | string, occasions: readonly Occasion[] | undefined): boolean {
  if (!occasions) return true;
  if (occasion === "birthday" || occasion === "anniversary" || occasion === "valentines") return occasions.includes(occasion);
  // A day of their own ("other": Christmas, Mother's Day, the day they met): a template for some such day.
  return occasions.some((o) => !OWN.includes(o) && o !== "just-because");
}

/** The occasion a gift scheduled for `unlockAt` opens on: that year's day within a day of it (time zones), or null. */
function openedOn(row: { month: number; day: number }, unlockAt: string | null | undefined): Date | null {
  const at = unlockAt ? Date.parse(unlockAt) : Number.NaN;
  if (!Number.isFinite(at)) return null;
  const year = new Date(at).getUTCFullYear();
  for (const y of [year - 1, year, year + 1]) {
    const on = occurrenceIn(y, row);
    if (Math.abs(at - (on.getTime() + DAY_MS / 2)) <= 1.5 * DAY_MS) return on;
  }
  return null;
}

/** Pure: the reminders a gift made for `name` today settles, with the occasion's year each is done for. */
export function settledBy(
  rows: { id: string; recipient_name: string; occasion?: string | null; month: number; day: number; last_sent_year: number | null; last_stage: number }[],
  name: string,
  now: Date,
  gift: MadeGift = {},
): { id: string; year: number }[] {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const wasOut = gift.wasOutSince ? Date.parse(gift.wasOutSince) : Number.NaN;
  // Noon UTC of the day counted down to, so openedOn's day either side holds.
  const countsTo = gift.countsDownTo && /^\d{4}-\d{2}-\d{2}$/.test(gift.countsDownTo) ? `${gift.countsDownTo}T12:00:00.000Z` : null;
  // Scheduled to open on a day: that day's, whatever the template. Otherwise only the nearest day in the window.
  const onTheDay: { id: string; year: number }[] = [];
  const near: { id: string; year: number; at: number }[] = [];
  // Started from a reminder's e-mail: that reminder, and any day the gift is scheduled to open on.
  let fromItsEmail = false;
  const itsOwn: { id: string; year: number }[] = [];
  for (const row of rows) {
    if (!sameName(row.recipient_name, name)) continue;
    if (gift.forReminder && row.id === gift.forReminder) {
      const day = nextOccurrence({ month: row.month, day: row.day }, now);
      const year = day.getUTCFullYear();
      const inWindow = day.getTime() - today <= MADE_FOR_WINDOW_DAYS * DAY_MS;
      const anEdit = Number.isFinite(wasOut) && wasOut < day.getTime() - MADE_FOR_WINDOW_DAYS * DAY_MS;
      const settled = row.last_sent_year !== null && (row.last_sent_year > year || (row.last_sent_year === year && row.last_stage === DONE_STAGE));
      if (inWindow && !anEdit) {
        fromItsEmail = true;
        if (!settled) itsOwn.push({ id: row.id, year });
        continue;
      }
    }
    // Counting down to this day (within a day, for the time zones) and not to one already gone: this day's.
    const countedTo = countsTo ? openedOn(row, countsTo) : null;
    const scheduledFor = openedOn(row, gift.unlockAt) ?? (countedTo && countedTo.getTime() >= today - DAY_MS ? countedTo : null);
    const next = scheduledFor ?? nextOccurrence({ month: row.month, day: row.day }, now);
    if (!scheduledFor) {
      // A gift counting down to some other day is not this one's, however near this one is.
      if (countsTo) continue;
      if (next.getTime() - today > MADE_FOR_WINDOW_DAYS * DAY_MS) continue;
      // An edit of a gift already out before this day's window was not made for it.
      if (Number.isFinite(wasOut) && wasOut < next.getTime() - MADE_FOR_WINDOW_DAYS * DAY_MS) continue;
      if (!giftFitsOccasion(row.occasion ?? "other", gift.occasions)) continue;
    }
    const year = next.getUTCFullYear();
    if (row.last_sent_year !== null && (row.last_sent_year > year || (row.last_sent_year === year && row.last_stage === DONE_STAGE))) continue;
    if (scheduledFor && openedOn(row, gift.unlockAt)) itsOwn.push({ id: row.id, year });
    if (scheduledFor) onTheDay.push({ id: row.id, year });
    else near.push({ id: row.id, year, at: next.getTime() });
  }
  // Started from a reminder's e-mail: that reminder is the one it is for, not whichever day is nearest
  // or happens to be the day it counts down to.
  if (fromItsEmail) return itsOwn;
  const nearest = Math.min(...near.map((n) => n.at));
  return [...onTheDay, ...near.filter((n) => n.at === nearest).map(({ id, year }) => ({ id, year }))];
}

/**
 * After a gift goes live or is scheduled (app/actions/gift.ts publishGift). Never throws: a publish
 * never fails for this. Before migration 0025 it does nothing (the one e-mail nine days before goes
 * as it always did).
 */
export async function markMadeFor(db: Db, userId: string, recipientName: string, now: Date, gift: MadeGift = {}): Promise<number> {
  if (!recipientName.trim()) return 0;
  try {
    const { data, error } = await db.from("reminders").select("id, recipient_name, occasion, month, day, last_sent_year, last_stage").eq("user_id", userId);
    if (error) {
      if (!isMissingColumn(error)) console.error("[reminders] made-for read failed", error.message);
      return 0;
    }
    let done = 0;
    for (const { id, year } of settledBy(data ?? [], recipientName, now, gift)) {
      const { error: failed } = await db
        .from("reminders")
        .update({ last_sent_year: year, last_stage: DONE_STAGE })
        .eq("id", id)
        .or(`last_sent_year.is.null,last_sent_year.lte.${year}`);
      if (failed) console.error("[reminders] made-for update failed", failed.message);
      else done += 1;
    }
    return done;
  } catch (error) {
    console.error("[reminders] made-for failed", (error as Error).message);
    return 0;
  }
}
