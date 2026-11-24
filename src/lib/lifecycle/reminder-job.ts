import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/supabase/types";
import { isMissingColumn } from "@/lib/commerce/db";
import { readyGifts } from "@/lib/commerce/gift-credits";
import { EVERY_TEMPLATE, PRODUCTS, hasUnlock, templateProduct, type Currency } from "@/lib/pricing/products";
import { suggestTemplate } from "./suggest";
import { lastGiftFor, type LastGift } from "./last-gift";
import { dueDates, dueStages, formatMonthDay, occurrenceIn, needsSending, needsStage, weekdayName, whenWords, type DueDate, type ReminderOccasion, type Stage } from "./reminders";

/**
 * "Remind me", the buyers' part of the morning job (api/cron/reminders): three e-mails before each
 * saved day, seven days, two days and the day before (dueStages). Each e-mail is claimed before it
 * goes, with one update that can only succeed once (last_sent_year = the occasion's year, last_stage
 * = this stage, where nothing of that stage or later went for that year), so two runs at once can't
 * both send it and a late run can't send an earlier stage after a later one. A failed e-mail gives
 * the claim back to what it was, and the next run tries again.
 *
 * Without migration 0025 (no last_stage or currency: PostgreSQL's 42703), it runs the way it did
 * before: one e-mail nine days before, today's words, last_sent_year alone. Never a 503 for that.
 */

type Row = Pick<Tables<"reminders">, "id" | "user_id" | "recipient_name" | "occasion" | "month" | "day" | "locale" | "template_slug" | "last_sent_year">;
export type StageRow = Row & Pick<Tables<"reminders">, "last_stage" | "currency">;
type Prior = { last_sent_year: number | null; last_stage: number };

/** What an account's e-mails need to know, read once per account per run. */
export type AccountFacts = {
  /** Gifts ready (lib/commerce/gift-credits.ts): null when the table isn't there. */
  ready: number | null;
  /** Unlock rows kept for good. */
  owned: string[];
  /** The currency of their newest paid purchase, or null. */
  currency: Currency | null;
};

export class MissingStageColumns extends Error {
  constructor() {
    super("reminders.last_stage is missing: migration 0025 is not applied");
  }
}

export interface ReminderJobStore {
  /** Rows on the due date that still need `stage` for its year, oldest first. Throws MissingStageColumns before 0025. */
  stageRows(due: DueDate, stage: Stage, limit: number): Promise<StageRow[]>;
  /** True when this run took the stage (nothing of it or later went for that year). */
  claimStage(id: string, year: number, stage: Stage): Promise<boolean>;
  releaseStage(id: string, prior: Prior): Promise<void>;
  /** Before 0025: rows on the date with no e-mail for its year. */
  oldRows(due: DueDate, limit: number): Promise<Row[]>;
  claimOld(id: string, year: number): Promise<boolean>;
  releaseOld(id: string, prior: number | null): Promise<void>;
  emailsOf(userIds: string[]): Promise<Map<string, string>>;
  account(userId: string): Promise<AccountFacts>;
  lastGiftFor(userId: string, recipientName: string): Promise<LastGift | null>;
}

/** The three e-mails' "Under the button" line: a gift ready, a price, or nothing. */
export type PaidLine = { paid: "ready" } | { paid: "price"; prices: { single: number; three: number | null; currency: Currency } } | { paid: "none" };

export type StagedReminderEmail = {
  to: string;
  locale: "en" | "es";
  recipientName: string;
  occasion: ReminderOccasion;
  /** The day, "5 March". */
  date: string;
  stage: Stage;
  /** "next Friday", "this Friday", "tomorrow". */
  when: string;
  /** "Friday": the day the gift can open at midnight on. */
  weekday: string;
  /** What the opened gift will already hold: their photos and both names, or the name alone. */
  started: "photos" | "name";
  /** The template the e-mail suggests and opens (suggestTemplate). */
  templateSlug: string;
  openUrl: string;
  moreUrl: string;
  skipUrl: string;
  removeUrl: string;
  /** Resend's idempotency key: one e-mail per reminder, year and stage. */
  onceKey: string;
} & PaidLine;

export type OldReminderEmail = { to: string; locale: "en" | "es"; recipientName: string; occasion: ReminderOccasion; date: string; avoid: string | null; removeUrl: string };

export type ReminderLinks = { openUrl: string; moreUrl: string; skipUrl: string; removeUrl: string };

export type ReminderRun = {
  store: ReminderJobStore;
  send: (email: StagedReminderEmail) => Promise<boolean>;
  sendOld: (email: OldReminderEmail) => Promise<boolean>;
  links: (row: StageRow, stage: Stage, year: number, locale: "en" | "es") => Promise<ReminderLinks>;
  removeUrl: (row: Row, locale: "en" | "es") => Promise<string>;
  /** Whether two more gifts are on sale (pairOnSale): the price line names the three only then. */
  pairOnSale: boolean;
  now: Date;
  inTime: () => boolean;
  pause: () => Promise<void>;
  batch?: number;
};

export type ReminderRunResult = { sent: number; failed: number; deferred: number; mode: "stages" | "old" };

/**
 * Until when "Open my gift" signs its reader in (Unix seconds): the end of the day after the
 * occasion, in UTC, the year the e-mail is about. After that it asks them to sign in.
 */
export function openLinkUntil(row: Pick<Tables<"reminders">, "month" | "day">, year: number): number {
  const on = occurrenceIn(year, { month: row.month, day: row.day });
  return Math.floor(on.getTime() / 1000) + 2 * 86_400 - 1;
}

/** Per date per run; anything left over is picked up by the next run (stage 1's catch-up), as before. */
export const REMINDER_BATCH = 200;

/**
 * The line under the button (PLAN-remind 3): nothing for an account that holds every template or
 * already the suggested one; "already paid for" with a gift ready; otherwise the suggested template's
 * own price and, while two more gifts are on sale, that price plus theirs; nothing when the currency
 * isn't known.
 */
export function paidLine(facts: AccountFacts, rowCurrency: Currency | null, slug: string, tier: "free" | "premium", pairOnSale: boolean): PaidLine {
  if (facts.owned.includes(EVERY_TEMPLATE) || hasUnlock(facts.owned, slug)) return { paid: "none" };
  if ((facts.ready ?? 0) > 0) return { paid: "ready" };
  const currency = rowCurrency ?? facts.currency;
  if (!currency) return { paid: "none" };
  const single = PRODUCTS[templateProduct(tier)].amounts[currency];
  return { paid: "price", prices: { single, three: pairOnSale ? single + PRODUCTS.pair.amounts[currency] : null, currency } };
}

export async function sendReminders(run: ReminderRun): Promise<ReminderRunResult> {
  const limit = Math.min(run.batch ?? REMINDER_BATCH, REMINDER_BATCH);
  try {
    return await sendStages(run, limit);
  } catch (error) {
    if (!(error instanceof MissingStageColumns)) throw error;
    console.warn("[cron/reminders] reminders.last_stage is missing (migration 0025): sending the one e-mail nine days before, as before");
    return { ...(await sendOld(run, limit)), mode: "old" };
  }
}

async function sendStages(run: ReminderRun, limit: number): Promise<ReminderRunResult> {
  const { store } = run;
  let sent = 0;
  let failed = 0;
  let deferred = 0;
  // One e-mail per reminder per run, whatever the dates say.
  const touched = new Set<string>();
  const facts = new Map<string, Promise<AccountFacts>>();
  const started = new Map<string, Promise<LastGift | null>>();
  const factsOf = (userId: string) => facts.get(userId) ?? facts.set(userId, store.account(userId)).get(userId)!;
  const startedFor = (userId: string, name: string) => {
    const key = `${userId}\n${name.trim().toLocaleLowerCase()}`;
    return started.get(key) ?? started.set(key, store.lastGiftFor(userId, name)).get(key)!;
  };

  // The day before first, then two days, then the first e-mails: what can't wait goes before a budget runs out.
  for (const { stage, due, daysAway } of [...dueStages(run.now)].reverse()) {
    const rows = (await store.stageRows(due, stage, limit)).filter((r) => !touched.has(r.id) && needsStage(r, due.year, stage));
    if (rows.length === 0) continue;
    const emails = await store.emailsOf([...new Set(rows.map((r) => r.user_id))]);
    for (const r of rows) {
      if (!run.inTime()) {
        deferred += 1;
        continue;
      }
      const to = emails.get(r.user_id);
      if (!to) continue;
      const prior: Prior = { last_sent_year: r.last_sent_year, last_stage: r.last_stage };
      if (!(await store.claimStage(r.id, due.year, stage))) continue;
      touched.add(r.id);

      const locale = r.locale === "es" ? "es" : "en";
      const suggested = suggestTemplate(r.occasion, { avoid: r.template_slug, paid: true });
      const [account, from] = await Promise.all([factsOf(r.user_id), startedFor(r.user_id, r.recipient_name)]);
      const links = await run.links(r, stage, due.year, locale);
      const ok = await run.send({
        to,
        locale,
        recipientName: r.recipient_name,
        occasion: r.occasion,
        // The day it falls on this year: the 28th for a 29 February birthday in a common year.
        date: formatMonthDay({ month: due.date.getUTCMonth() + 1, day: due.date.getUTCDate() }, locale),
        stage,
        when: whenWords(daysAway, due.date, locale),
        weekday: weekdayName(due.date, locale),
        started: from && from.photos > 0 ? "photos" : "name",
        templateSlug: suggested.slug,
        ...links,
        onceKey: `reminder/${r.id}:${due.year}:${stage}`,
        ...paidLine(account, r.currency, suggested.slug, suggested.tier, run.pairOnSale),
      });
      if (ok) sent += 1;
      else {
        failed += 1;
        await store.releaseStage(r.id, prior);
      }
      await run.pause();
    }
  }
  return { sent, failed, deferred, mode: "stages" };
}

/** The job as it was before 0025: one e-mail nine days before (and two days of catch-up). */
async function sendOld(run: ReminderRun, limit: number): Promise<Omit<ReminderRunResult, "mode">> {
  const { store } = run;
  let sent = 0;
  let failed = 0;
  let deferred = 0;
  for (const due of dueDates(run.now)) {
    const rows = await store.oldRows(due, limit);
    if (rows.length === 0) continue;
    const emails = await store.emailsOf([...new Set(rows.map((r) => r.user_id))]);
    for (const r of rows) {
      if (!run.inTime()) {
        deferred += 1;
        continue;
      }
      const to = emails.get(r.user_id);
      if (!to || !needsSending(r.last_sent_year, due.year)) continue;
      if (!(await store.claimOld(r.id, due.year))) continue;
      const locale = r.locale === "es" ? "es" : "en";
      const ok = await run.sendOld({
        to,
        locale,
        recipientName: r.recipient_name,
        occasion: r.occasion,
        date: formatMonthDay({ month: due.date.getUTCMonth() + 1, day: due.date.getUTCDate() }, locale),
        // The template the reminder was saved with is only skipped: the suggestion is a new one.
        avoid: r.template_slug,
        removeUrl: await run.removeUrl(r, locale),
      });
      if (ok) sent += 1;
      else {
        failed += 1;
        await store.releaseOld(r.id, r.last_sent_year);
      }
      await run.pause();
    }
  }
  return { sent, failed, deferred };
}

const BASE = "id, user_id, recipient_name, occasion, month, day, locale, template_slug, last_sent_year";

/**
 * The claim's condition: nothing went for the year, or a lower stage did (never a year written
 * without a stage: that is the code before 0025's "done").
 */
export const stageClaimFilter = (year: number, stage: Stage) => `last_sent_year.is.null,last_sent_year.lt.${year},and(last_sent_year.eq.${year},last_stage.gt.0,last_stage.lt.${stage})`;

/** The service role's view of the tables, for the cron. */
export function supabaseReminderJobStore(db: SupabaseClient<Database>): ReminderJobStore {
  return {
    async stageRows(due, stage, limit) {
      const { data, error } = await db
        .from("reminders")
        .select(`${BASE}, last_stage, currency`)
        .eq("month", due.month)
        .in("day", due.days)
        .or(stageClaimFilter(due.year, stage))
        .order("created_at", { ascending: true })
        .limit(limit);
      if (error) {
        if (isMissingColumn(error)) throw new MissingStageColumns();
        throw new Error(`reminders: ${error.message}`);
      }
      return data ?? [];
    },
    async claimStage(id, year, stage) {
      const { data, error } = await db.from("reminders").update({ last_sent_year: year, last_stage: stage }).eq("id", id).or(stageClaimFilter(year, stage)).select("id").maybeSingle();
      return !error && Boolean(data);
    },
    async releaseStage(id, prior) {
      await db.from("reminders").update(prior).eq("id", id);
    },
    async oldRows(due, limit) {
      const { data, error } = await db
        .from("reminders")
        .select(BASE)
        .eq("month", due.month)
        .in("day", due.days)
        .or(`last_sent_year.is.null,last_sent_year.lt.${due.year}`)
        .order("created_at", { ascending: true })
        .limit(limit);
      if (error) throw new Error(`reminders: ${error.message}`);
      return data ?? [];
    },
    async claimOld(id, year) {
      const { data, error } = await db.from("reminders").update({ last_sent_year: year }).eq("id", id).or(`last_sent_year.is.null,last_sent_year.lt.${year}`).select("id").maybeSingle();
      return !error && Boolean(data);
    },
    async releaseOld(id, prior) {
      await db.from("reminders").update({ last_sent_year: prior }).eq("id", id);
    },
    async emailsOf(userIds) {
      if (userIds.length === 0) return new Map();
      const { data } = await db.from("profiles").select("id, email").in("id", userIds);
      return new Map((data ?? []).filter((p) => p.email).map((p) => [p.id, p.email as string]));
    },
    async account(userId) {
      const [ready, unlocks, purchase] = await Promise.all([
        readyGifts(db, userId),
        db.from("template_unlocks").select("template_slug").eq("user_id", userId),
        db.from("purchases").select("currency").eq("user_id", userId).eq("status", "paid").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      const currency = purchase.data?.currency;
      return {
        ready,
        owned: (unlocks.data ?? []).map((u) => u.template_slug),
        currency: currency === "usd" || currency === "eur" || currency === "gbp" ? currency : null,
      };
    },
    lastGiftFor: (userId, name) => lastGiftFor(db, userId, name),
  };
}
