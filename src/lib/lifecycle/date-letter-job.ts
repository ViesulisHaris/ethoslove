import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/supabase/types";
import type { sendDateLetter } from "@/lib/email/notify";
import { emailKey } from "./links";
import type { MonthDay } from "./reminders";
import { ymdOf, type Ymd } from "./monthsaries";
import { isSendDay, letterDecision, letterSlot, letterWeek, otherEmailToday, type LetterDayFacts, type LetterFacts } from "./date-letter";
import { missingTable, purgeLetter } from "./date-letter-store";

/**
 * The date letter's daily job (api/cron/date-letter). Every day it deletes what the list no longer
 * keeps (an address never confirmed after thirty days, one stopped thirty days ago). On Thursday,
 * and on Friday for what waited, it sends the week's letter to each confirmed address that hasn't had it: the week is
 * claimed before anything goes (last_week = this week), so two runs at once can't both send it; a
 * letter that is skipped keeps its claim; a failed e-mail gives the week back and waits for the next
 * day. When another optional e-mail of ours goes to the same person that day, the letter waits a day
 * (held_on), and on Friday it is skipped. The rules are lib/lifecycle/date-letter.ts.
 */

export type LetterRow = Pick<Tables<"date_letter">, "id" | "email" | "locale" | "last_week">;

export interface LetterStore {
  /** Deletes addresses never confirmed after 30 days and addresses stopped 30 days ago. */
  purge(now: Date): Promise<number>;
  /** Confirmed, not stopped, not sent this week, not held today; least recently sent first. */
  due(week: number, today: Ymd, limit: number): Promise<LetterRow[]>;
  /** For a batch at once. Throws if any lookup fails. Keyed by row id. */
  facts(rows: LetterRow[], today: Date): Promise<Map<string, LetterFacts>>;
  /** True when this run took the week (nobody had). */
  claim(id: string, week: number): Promise<boolean>;
  /** Gives the week back after a failed e-mail. */
  release(id: string, previous: number | null): Promise<void>;
  /** Not today: it waited for another e-mail, or its send failed. The row is not fetched again until tomorrow. */
  hold(id: string, today: Ymd): Promise<void>;
}

export type LetterRun = {
  store: LetterStore;
  send: typeof sendDateLetter;
  /** The row's signed stop link. */
  stopUrl: (row: LetterRow) => Promise<string>;
  now: Date;
  inTime: () => boolean;
  pause: () => Promise<void>;
  batch?: number;
};

export const LETTER_BATCH = 100;

const DAY_MS = 86_400_000;
const utcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

export async function sendDateLetters(run: LetterRun): Promise<{ week: number; slot: number; sent: number; skipped: number; held: number; failed: number; deferred: number; purged: number }> {
  const week = letterWeek(run.now);
  const slot = letterSlot(week);
  const counts = { week, slot, sent: 0, skipped: 0, held: 0, failed: 0, deferred: 0, purged: 0 };
  counts.purged = await run.store.purge(run.now);
  if (!isSendDay(run.now)) return counts;
  const day = utcDay(run.now);
  const today = ymdOf(day);
  const rows = await run.store.due(week, today, Math.min(run.batch ?? LETTER_BATCH, LETTER_BATCH));
  if (rows.length === 0) return counts;
  const facts = await run.store.facts(rows, day);
  for (const row of rows) {
    if (!run.inTime()) {
      counts.deferred += 1;
      continue;
    }
    // A row the lookups don't know is treated as on the unsubscribe list: nothing goes against a doubt.
    const decision = letterDecision(row.email, facts.get(row.id) ?? { optedOut: true, other: false }, run.now);
    if (decision === "hold") {
      await run.store.hold(row.id, today);
      counts.held += 1;
      continue;
    }
    // What the claim replaces, read before claiming: a failed e-mail puts it back.
    const previous = row.last_week;
    if (!(await run.store.claim(row.id, week))) continue;
    if (decision === "skip") {
      counts.skipped += 1;
      continue;
    }
    const locale = row.locale === "es" ? "es" : "en";
    const ok = await run.send({ to: row.email, locale, slot, stopUrl: await run.stopUrl(row), onceKey: `date-letter/${row.id}/${week}` });
    if (ok) counts.sent += 1;
    else {
      await run.store.release(row.id, previous);
      await run.store.hold(row.id, today);
      counts.failed += 1;
    }
    await run.pause();
  }
  return counts;
}

/** The service role's view, for the cron. `ideaOn`: the monthly idea is switched on (MONTHLY_IDEA_EMAILS not "off"), so its rows count as e-mails. */
export function supabaseLetterStore(db: SupabaseClient<Database>, ideaOn: boolean): LetterStore {
  const fail = (what: string, error: { message: string } | null) => {
    if (error) throw new Error(`date letter ${what}: ${error.message}`);
  };
  return {
    purge: (now) => purgeLetter(db, now.getTime()),
    async due(week, today, limit) {
      const { data, error } = await db
        .from("date_letter")
        .select("id, email, locale, last_week")
        .not("confirmed_at", "is", null)
        .is("stopped_at", null)
        // One or=(…) of four and(…) groups: "not dealt with this week" and "not held today", spelled
        // out, so the query carries a single or= that PostgREST can't read any other way (letter-C15).
        .or(
          [
            "and(last_week.is.null,held_on.is.null)",
            `and(last_week.is.null,held_on.lt.${today})`,
            `and(last_week.lt.${week},held_on.is.null)`,
            `and(last_week.lt.${week},held_on.lt.${today})`,
          ].join(","),
        )
        .order("last_week", { ascending: true, nullsFirst: true })
        .limit(limit);
      fail("due", error);
      return data ?? [];
    },
    async facts(rows, today) {
      const out = new Map<string, LetterFacts>();
      if (rows.length === 0) return out;
      const addresses = [...new Set(rows.map((r) => r.email.trim().toLowerCase()))];

      const profiles = await db.from("profiles").select("id, email").in("email", addresses);
      fail("profiles", profiles.error);
      const accountOf = new Map<string, string>();
      for (const p of profiles.data ?? []) if (p.email) accountOf.set(p.email.trim().toLowerCase(), p.id);
      const ids = [...new Set(accountOf.values())];

      const keys = new Map<string, string>();
      for (const address of addresses) keys.set(address, await emailKey(address));
      const hashes = [...new Set(keys.values())];

      const empty = { data: [] as never[], error: null };
      const [monthsaries, reminders, ideas, optouts, keeps] = await Promise.all([
        ids.length ? db.from("monthsaries").select("user_id, since").in("user_id", ids) : empty,
        ids.length ? db.from("reminders").select("user_id, month, day").in("user_id", ids) : empty,
        ids.length && ideaOn ? db.from("monthly_ideas").select("user_id, since, handled_for, last_sent_on").in("user_id", ids).is("off_at", null) : empty,
        db.from("email_optouts").select("email_sha256").in("email_sha256", hashes),
        db.from("gift_keeps").select("id, email_sha256").in("email_sha256", hashes).not("confirmed_at", "is", null),
      ]);
      fail("monthsaries", monthsaries.error);
      fail("reminders", reminders.error);
      // The monthly idea (0022) may not be there yet: then nobody has one.
      if (ideas.error && !missingTable(ideas.error)) fail("monthly ideas", ideas.error);
      fail("opt-outs", optouts.error);
      fail("keeps", keeps.error);

      const optedOut = new Set((optouts.data ?? []).map((o) => o.email_sha256));
      const keepDays = new Map<string, MonthDay[]>();
      const keepOf = new Map((keeps.data ?? []).map((k) => [k.id, k.email_sha256]));
      if (keepOf.size > 0) {
        const kept = await db.from("keep_reminders").select("keep_id, month, day").in("keep_id", [...keepOf.keys()]);
        fail("keep reminders", kept.error);
        for (const r of kept.data ?? []) {
          const hash = keepOf.get(r.keep_id)!;
          keepDays.set(hash, [...(keepDays.get(hash) ?? []), { month: r.month, day: r.day }]);
        }
      }

      // "Remind us the day before" (lib/saved-dates/reminders.ts): members' saved dates with reminders
      // on, their own and their partner's, since the e-mail goes to both, while a membership runs.
      // Only tomorrow's matter: that e-mail goes today.
      const couple = new Map<string, Set<string>>();
      const savedBy = new Map<string, Ymd[]>();
      if (ids.length > 0) {
        const nowIso = new Date().toISOString();
        const [asOwner, asPartner] = await Promise.all([
          db.from("couple_passes").select("owner_user_id, partner_user_id").in("owner_user_id", ids).lte("starts_at", nowIso).gt("ends_at", nowIso),
          db.from("couple_passes").select("owner_user_id, partner_user_id").in("partner_user_id", ids).lte("starts_at", nowIso).gt("ends_at", nowIso),
        ]);
        fail("memberships", asOwner.error);
        fail("memberships", asPartner.error);
        for (const pass of [...(asOwner.data ?? []), ...(asPartner.data ?? [])]) {
          const pair = [pass.owner_user_id, pass.partner_user_id].filter((p): p is string => Boolean(p));
          for (const id of pair) if (ids.includes(id)) couple.set(id, new Set([...(couple.get(id) ?? []), ...pair]));
        }
        const people = [...new Set([...couple.values()].flatMap((s) => [...s]))];
        if (people.length > 0) {
          const from = ymdOf(today);
          const to = ymdOf(new Date(today.getTime() + 2 * DAY_MS));
          const saved = await db.from("saved_dates").select("owner_user_id, day").in("owner_user_id", people).eq("remind", true).gte("day", from).lte("day", to);
          fail("saved dates", saved.error);
          for (const d of saved.data ?? []) if (d.day) savedBy.set(d.owner_user_id, [...(savedBy.get(d.owner_user_id) ?? []), d.day]);
        }
      }

      for (const row of rows) {
        const address = row.email.trim().toLowerCase();
        const hash = keys.get(address)!;
        const id = accountOf.get(address);
        const idea = id ? (ideas.error ? undefined : (ideas.data ?? []).find((r) => r.user_id === id)) : undefined;
        const day: LetterDayFacts = {
          idea: idea ? { since: idea.since, handledFor: idea.handled_for, lastSentOn: idea.last_sent_on } : null,
          monthsarySince: id ? ((monthsaries.data ?? []).find((m) => m.user_id === id)?.since ?? null) : null,
          reminderDays: [...(id ? (reminders.data ?? []).filter((r) => r.user_id === id).map((r) => ({ month: r.month, day: r.day })) : []), ...(keepDays.get(hash) ?? [])],
          savedDateDays: id ? [...(couple.get(id) ?? [])].flatMap((p) => savedBy.get(p) ?? []) : [],
        };
        out.set(row.id, { optedOut: optedOut.has(hash), other: otherEmailToday(day, today) });
      }
      return out;
    },
    async claim(id, week) {
      const { data, error } = await db
        .from("date_letter")
        .update({ last_week: week })
        .eq("id", id)
        .is("stopped_at", null)
        .not("confirmed_at", "is", null)
        .or(`last_week.is.null,last_week.lt.${week}`)
        .select("id")
        .maybeSingle();
      return !error && Boolean(data);
    },
    async release(id, previous) {
      const { error } = await db.from("date_letter").update({ last_week: previous }).eq("id", id);
      if (error) console.error("[date-letter] couldn't give a week back", error.message);
    },
    async hold(id, today) {
      const { error } = await db.from("date_letter").update({ held_on: today }).eq("id", id);
      if (error) console.error("[date-letter] couldn't hold a letter", error.message);
    },
  };
}
