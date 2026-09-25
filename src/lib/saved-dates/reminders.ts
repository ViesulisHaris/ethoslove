import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { readPlan, stopName } from "@/lib/dates/plan";
import type { DateReminder } from "@/lib/email/saved-dates";
import type { Database, Tables } from "@/lib/supabase/types";
import { getTrip } from "@/lib/trips/presets";

/**
 * "Remind us the day before" (members only; docs/MEMBERSHIP.md 3.4): every morning, the saved dates
 * whose day is tomorrow (UTC, the day the job runs in) are emailed to the member who saved them and
 * to their partner. Each row is claimed first (reminded_for = its day), so two runs at once can't
 * both send; when every email of a row fails, the claim is given back and the next run tries again.
 * A date whose day changes is claimed afresh for the new day.
 */

type Row = Pick<Tables<"saved_dates">, "id" | "owner_user_id" | "kind" | "title" | "day" | "data" | "reminded_for">;
type Person = { email: string; locale: "en" | "es" };

export interface ReminderStore {
  /** Rows with reminders on, for `day`, not yet claimed for it. */
  due(day: string, limit: number): Promise<Row[]>;
  isMember(userId: string): Promise<boolean>;
  partnerOf(userId: string): Promise<string | null>;
  /** True when this run took the row for `day` (nobody had). */
  claim(id: string, day: string): Promise<boolean>;
  release(id: string, previous: string | null): Promise<void>;
  people(ids: string[]): Promise<Map<string, Person>>;
}

export type ReminderRun = {
  store: ReminderStore;
  send: (reminder: DateReminder) => Promise<boolean>;
  /** The links each email carries: the plan (or the trip), and the signed way to turn reminders off. */
  links: (row: Row, locale: "en" | "es") => Promise<{ openUrl: string; offUrl: string }>;
  now: Date;
  /** Stop starting new rows once this is false (the cron's time budget). */
  inTime: () => boolean;
  /** Between two emails, to stay under Resend's rate. */
  pause: () => Promise<void>;
  batch?: number;
};

const DAY_MS = 86_400_000;

/** Tomorrow in UTC, as YYYY-MM-DD: the job runs at 07:00 UTC, the morning before. */
export const tomorrowUtc = (now: Date): string => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + DAY_MS).toISOString().slice(0, 10);

/** What goes in the email, in the reader's language: the stops with their times, or the trip's length. */
export function reminderContent(row: Row, locale: "en" | "es"): Pick<DateReminder, "kind" | "title" | "stops" | "note" | "days"> {
  const title = row.title.trim() || null;
  if (row.kind === "trip") {
    const tripId = typeof row.data === "object" && row.data && !Array.isArray(row.data) ? row.data.tripId : null;
    const trip = typeof tripId === "string" ? getTrip(tripId) : undefined;
    return { kind: "trip", title: title ?? trip?.title[locale] ?? null, stops: [], note: null, days: trip?.days ?? null };
  }
  const plan = readPlan(row.data);
  return { kind: "date", title, stops: (plan?.stops ?? []).map((stop) => ({ time: stop.time ?? null, name: stopName(stop, locale) })), note: plan?.note || null, days: null };
}

export async function sendDateReminders(run: ReminderRun): Promise<{ sent: number; failed: number; deferred: number; skipped: number }> {
  const day = tomorrowUtc(run.now);
  const rows = await run.store.due(day, run.batch ?? 200);
  let sent = 0;
  let failed = 0;
  let deferred = 0;
  let skipped = 0;
  for (const row of rows) {
    if (!run.inTime()) {
      deferred += 1;
      continue;
    }
    // A reminder is part of the membership: without one running, the row keeps its switch but nothing goes.
    if (!(await run.store.isMember(row.owner_user_id))) {
      skipped += 1;
      continue;
    }
    if (!(await run.store.claim(row.id, day))) continue;
    const partner = await run.store.partnerOf(row.owner_user_id);
    const people = await run.store.people([row.owner_user_id, ...(partner ? [partner] : [])]);
    let delivered = 0;
    let tried = 0;
    for (const id of [row.owner_user_id, partner]) {
      const person = id ? people.get(id) : undefined;
      if (!person) continue;
      tried += 1;
      const ok = await run.send({ to: person.email, locale: person.locale, ...reminderContent(row, person.locale), ...(await run.links(row, person.locale)) });
      if (ok) delivered += 1;
      await run.pause();
    }
    if (delivered > 0) sent += 1;
    else {
      failed += tried > 0 ? 1 : 0;
      await run.store.release(row.id, row.reminded_for);
    }
  }
  return { sent, failed, deferred, skipped };
}

/** The service role's view of the table, for the cron. */
export function supabaseReminderStore(db: SupabaseClient<Database>): ReminderStore {
  const unclaimed = (day: string) => `reminded_for.is.null,reminded_for.neq.${day}`;
  return {
    async due(day, limit) {
      const { data, error } = await db.from("saved_dates").select("id, owner_user_id, kind, title, day, data, reminded_for").eq("remind", true).eq("day", day).or(unclaimed(day)).order("created_at", { ascending: true }).limit(limit);
      if (error) throw new Error(`saved-date reminders: ${error.message}`);
      return data ?? [];
    },
    async isMember(userId) {
      const { data, error } = await db.rpc("is_member", { p_user: userId });
      if (error) throw new Error(`is_member: ${error.message}`);
      return data === true;
    },
    async partnerOf(userId) {
      const { data, error } = await db.rpc("couple_partner", { p_user: userId });
      if (error) throw new Error(`couple_partner: ${error.message}`);
      return typeof data === "string" ? data : null;
    },
    async claim(id, day) {
      const { data, error } = await db.from("saved_dates").update({ reminded_for: day }).eq("id", id).eq("remind", true).or(unclaimed(day)).select("id").maybeSingle();
      return !error && Boolean(data);
    },
    async release(id, previous) {
      await db.from("saved_dates").update({ reminded_for: previous }).eq("id", id);
    },
    async people(ids) {
      const { data } = await db.from("profiles").select("id, email, locale").in("id", ids);
      return new Map((data ?? []).filter((p) => Boolean(p.email)).map((p) => [p.id, { email: p.email, locale: p.locale === "es" ? "es" : "en" }]));
    },
  };
}
