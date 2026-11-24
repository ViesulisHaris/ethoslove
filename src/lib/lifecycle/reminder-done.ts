import "server-only";

import type { Db } from "@/lib/commerce/db";
import { isMissingColumn } from "@/lib/commerce/db";
import { sameName } from "./last-gift";
import { DONE_STAGE, nextOccurrence, occurrenceIn } from "./reminders";

/**
 * The e-mails before a day stop once the gift for it is made: a gift published or scheduled by the
 * account for someone of a reminder's name, while that person's day is at most this many days away,
 * marks every such reminder of theirs done for the year (last_sent_year = that year, last_stage = 3).
 * Further out, a gift is not for that day, and the e-mails still come, unless it is scheduled to open
 * on that day (within a day either side, for the time zones), however far ahead it was made.
 * Republishing a gift that was already out before the window (an edit of last year's) makes nothing.
 */
export const MADE_FOR_WINDOW_DAYS = 10;

const DAY_MS = 86_400_000;

/** What the publish knows of the gift: when it opens if scheduled, and when it was out before, if it was. */
export type MadeGift = { unlockAt?: string | null; wasOutSince?: string | null };

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
export function settledBy(rows: { id: string; recipient_name: string; month: number; day: number; last_sent_year: number | null; last_stage: number }[], name: string, now: Date, gift: MadeGift = {}): { id: string; year: number }[] {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const wasOut = gift.wasOutSince ? Date.parse(gift.wasOutSince) : Number.NaN;
  const out: { id: string; year: number }[] = [];
  for (const row of rows) {
    if (!sameName(row.recipient_name, name)) continue;
    const scheduledFor = openedOn(row, gift.unlockAt);
    const next = scheduledFor ?? nextOccurrence({ month: row.month, day: row.day }, now);
    if (!scheduledFor) {
      if (next.getTime() - today > MADE_FOR_WINDOW_DAYS * DAY_MS) continue;
      // An edit of a gift already out before this day's window was not made for it.
      if (Number.isFinite(wasOut) && wasOut < next.getTime() - MADE_FOR_WINDOW_DAYS * DAY_MS) continue;
    }
    const year = next.getUTCFullYear();
    if (row.last_sent_year !== null && (row.last_sent_year > year || (row.last_sent_year === year && row.last_stage === DONE_STAGE))) continue;
    out.push({ id: row.id, year });
  }
  return out;
}

/**
 * After a gift goes live or is scheduled (app/actions/gift.ts publishGift). Never throws: a publish
 * never fails for this. Before migration 0025 it does nothing (the one e-mail nine days before goes
 * as it always did).
 */
export async function markMadeFor(db: Db, userId: string, recipientName: string, now: Date, gift: MadeGift = {}): Promise<number> {
  if (!recipientName.trim()) return 0;
  try {
    const { data, error } = await db.from("reminders").select("id, recipient_name, month, day, last_sent_year, last_stage").eq("user_id", userId);
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
