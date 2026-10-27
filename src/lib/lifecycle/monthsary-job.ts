import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/supabase/types";
import { formatMonthDay } from "./reminders";
import { daysLandingOn, monthsaryWork, parseYmd, type Ymd } from "./monthsaries";

/**
 * The monthsaries' part of the morning job (api/cron/reminders): for each one whose day lands on
 * tomorrow, the check-in; for each one whose day is today and that got a yes, the reminder. Every
 * email is claimed before it goes (checkin_for, reminded_for = that monthsary), so two runs at once
 * can't both send it, and a failed email gives its claim back for the next run. Nothing goes late: a
 * check-in that missed its morning would ask about "tomorrow" on the day itself.
 */

type Row = Pick<Tables<"monthsaries">, "id" | "user_id" | "partner_name" | "since" | "locale" | "checkin_for" | "confirmed_for" | "reminded_for">;
export type MonthsaryEmailKind = "checkin" | "reminder";

export interface MonthsaryStore {
  /** Rows whose day of the month is one of `days`, oldest first, at most `limit`. */
  landingOn(days: number[], limit: number): Promise<Row[]>;
  /** True when this run took the email for `date` (nobody had). */
  claim(id: string, kind: MonthsaryEmailKind, date: Ymd): Promise<boolean>;
  release(id: string, kind: MonthsaryEmailKind, previous: Ymd | null): Promise<void>;
  emailOf(userId: string): Promise<string | null>;
}

export type MonthsaryRun = {
  store: MonthsaryStore;
  checkIn: (args: { to: string; locale: "en" | "es"; partnerName: string; date: string; yesUrl: string; stopUrl: string }) => Promise<boolean>;
  remind: (args: { to: string; locale: "en" | "es"; partnerName: string; months: number; stopUrl: string }) => Promise<boolean>;
  /** The signed links a row's emails carry. */
  links: (row: Row, date: Ymd) => Promise<{ yesUrl: string; stopUrl: string }>;
  now: Date;
  inTime: () => boolean;
  pause: () => Promise<void>;
  batch?: number;
};

const DAY_MS = 86_400_000;
export const MONTHSARY_BATCH = 200;

export async function sendMonthsaries(run: MonthsaryRun): Promise<{ checkIns: number; reminders: number; failed: number; deferred: number }> {
  const today = new Date(Date.UTC(run.now.getUTCFullYear(), run.now.getUTCMonth(), run.now.getUTCDate()));
  const tomorrow = new Date(today.getTime() + DAY_MS);
  const days = [...new Set([...daysLandingOn(today), ...daysLandingOn(tomorrow)])];
  const rows = await run.store.landingOn(days, Math.min(run.batch ?? MONTHSARY_BATCH, MONTHSARY_BATCH));
  let checkIns = 0;
  let reminders = 0;
  let failed = 0;
  let deferred = 0;
  for (const row of rows) {
    const work = monthsaryWork({ since: row.since, checkinFor: row.checkin_for, confirmedFor: row.confirmed_for, remindedFor: row.reminded_for }, today);
    if (!work.checkIn && !work.remind) continue;
    if (!run.inTime()) {
      deferred += 1;
      continue;
    }
    const to = await run.store.emailOf(row.user_id);
    if (!to) continue;
    const locale = row.locale === "es" ? "es" : "en";
    // What each claim replaces, read before claiming: a failed email puts it back.
    const before = { checkin: row.checkin_for, reminder: row.reminded_for };
    if (work.remind && (await run.store.claim(row.id, "reminder", work.remind.date))) {
      const { stopUrl } = await run.links(row, work.remind.date);
      if (await run.remind({ to, locale, partnerName: row.partner_name, months: work.remind.months, stopUrl })) reminders += 1;
      else {
        failed += 1;
        await run.store.release(row.id, "reminder", before.reminder);
      }
      await run.pause();
    }
    if (work.checkIn && (await run.store.claim(row.id, "checkin", work.checkIn.date))) {
      const day = parseYmd(work.checkIn.date)!;
      const links = await run.links(row, work.checkIn.date);
      if (await run.checkIn({ to, locale, partnerName: row.partner_name, date: formatMonthDay(day, locale), ...links })) checkIns += 1;
      else {
        failed += 1;
        await run.store.release(row.id, "checkin", before.checkin);
      }
      await run.pause();
    }
  }
  return { checkIns, reminders, failed, deferred };
}

/** The service role's view of the table, for the cron. */
export function supabaseMonthsaryStore(db: SupabaseClient<Database>): MonthsaryStore {
  const column = (kind: MonthsaryEmailKind) => (kind === "checkin" ? "checkin_for" : "reminded_for");
  const set = (kind: MonthsaryEmailKind, value: Ymd | null) => (kind === "checkin" ? { checkin_for: value } : { reminded_for: value });
  return {
    async landingOn(days, limit) {
      const { data, error } = await db
        .from("monthsaries")
        .select("id, user_id, partner_name, since, locale, checkin_for, confirmed_for, reminded_for")
        .in("since_day", days)
        .order("created_at", { ascending: true })
        .limit(limit);
      if (error) throw new Error(`monthsaries: ${error.message}`);
      return data ?? [];
    },
    async claim(id, kind, date) {
      const col = column(kind);
      const { data, error } = await db
        .from("monthsaries")
        .update(set(kind, date))
        .eq("id", id)
        .or(`${col}.is.null,${col}.neq.${date}`)
        .select("id")
        .maybeSingle();
      return !error && Boolean(data);
    },
    async release(id, kind, previous) {
      await db.from("monthsaries").update(set(kind, previous)).eq("id", id);
    },
    async emailOf(userId) {
      const { data } = await db.from("profiles").select("email").eq("id", userId).maybeSingle();
      return data?.email || null;
    },
  };
}
