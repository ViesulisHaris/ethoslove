import "server-only";

import type { Db } from "@/lib/commerce/db";
import { isMissingColumn } from "@/lib/commerce/db";
import { sameName } from "./last-gift";
import { DONE_STAGE, nextOccurrence } from "./reminders";

/**
 * The e-mails before a day stop once the gift for it is made: a gift published or scheduled by the
 * account for someone of a reminder's name, while that person's day is at most this many days away,
 * marks every such reminder of theirs done for the year (last_sent_year = that year, last_stage = 3).
 * Further out, a gift is not for that day, and the e-mails still come.
 */
export const MADE_FOR_WINDOW_DAYS = 10;

const DAY_MS = 86_400_000;

/** Pure: the reminders a gift made for `name` today settles, with the occasion's year each is done for. */
export function settledBy(rows: { id: string; recipient_name: string; month: number; day: number; last_sent_year: number | null; last_stage: number }[], name: string, now: Date): { id: string; year: number }[] {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const out: { id: string; year: number }[] = [];
  for (const row of rows) {
    if (!sameName(row.recipient_name, name)) continue;
    const next = nextOccurrence({ month: row.month, day: row.day }, now);
    if (next.getTime() - today > MADE_FOR_WINDOW_DAYS * DAY_MS) continue;
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
export async function markMadeFor(db: Db, userId: string, recipientName: string, now: Date): Promise<number> {
  if (!recipientName.trim()) return 0;
  try {
    const { data, error } = await db.from("reminders").select("id, recipient_name, month, day, last_sent_year, last_stage").eq("user_id", userId);
    if (error) {
      if (!isMissingColumn(error)) console.error("[reminders] made-for read failed", error.message);
      return 0;
    }
    let done = 0;
    for (const { id, year } of settledBy(data ?? [], recipientName, now)) {
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
