import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/supabase/types";
import type { sendMonthlyIdea } from "@/lib/email/notify";
import { pageUrl } from "@/lib/email/urls";
import { isMissingTable } from "@/lib/commerce/gift-credits";
import { emailKey } from "./links";
import { formatMonthDay, type MonthDay } from "./reminders";
import { parseYmd, ymdOf, type Ymd } from "./monthsaries";
import { IDEA_REF, ideaDecision, ideaDue, ideaWindow, priceEndsAt, priceLastDay, type IdeaFacts, type IdeaMode } from "./monthly-idea";
import { seasonFor, seasonTemplate, suggestionPath } from "./suggest";

/**
 * The monthly idea's morning job (api/cron/monthly-idea): for each account whose monthly date is
 * today (or one or two days ago, for a run that was missed), one e-mail with the season's idea. Each
 * month is claimed before anything goes (handled_for = that date), so two runs at once can't both
 * send it; a month that is skipped stays claimed (it is never retried), and a failed e-mail gives
 * its claim back for the next run. The rules are lib/lifecycle/monthly-idea.ts.
 */

type Row = Pick<Tables<"monthly_ideas">, "user_id" | "since" | "template_slug" | "locale" | "basis" | "handled_for" | "last_sent_on" | "price_sent_at">;

export interface IdeaStore {
  /** Rows that may be due: day of the month in `days`, not stopped, `since` between the two days, not handled since `handledBefore`; least recently handled first. */
  due(window: ReturnType<typeof ideaWindow>, limit: number): Promise<Row[]>;
  /** Everything the decision needs, for a batch of rows at once. Throws if any lookup fails. */
  facts(rows: Row[]): Promise<Map<string, IdeaFacts>>;
  /** True when this run took the month (nobody had). */
  claim(userId: string, date: Ymd): Promise<boolean>;
  release(userId: string, previous: Ymd | null): Promise<void>;
  /** After an email went: last_sent_on, and price_sent_at when it carried the price. */
  sent(userId: string, on: Ymd, withPrice: boolean, at: Date): Promise<void>;
}

export type IdeaRun = {
  store: IdeaStore;
  mode: IdeaMode;
  send: typeof sendMonthlyIdea;
  /** Signed links for one row: the stop link, and the price links when `withPrice`. Null price link: no secret, so no price. */
  links: (row: Row, slug: string, withPrice: boolean, endsAt: number) => Promise<{ stopUrl: string; priceUrl: string | null; priceMoreUrl: string | null }>;
  /** Whether the account bought at a personal price lately (lib/commerce/personal-price.ts personalPriceUsed). */
  priceSpent: (userId: string) => Promise<boolean>;
  now: Date;
  inTime: () => boolean;
  pause: () => Promise<void>;
  batch?: number;
};

export const IDEA_BATCH = 100;

const utcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

export async function sendMonthlyIdeas(run: IdeaRun): Promise<{ sent: number; skipped: number; failed: number; deferred: number }> {
  const today = utcDay(run.now);
  const rows = await run.store.due(ideaWindow(today), Math.min(run.batch ?? IDEA_BATCH, IDEA_BATCH));
  const counts = { sent: 0, skipped: 0, failed: 0, deferred: 0 };
  const due = rows.map((row) => ({ row, month: ideaDue({ since: row.since, handledFor: row.handled_for }, today) })).filter((d) => d.month !== null);
  if (due.length === 0) return counts;
  const facts = await run.store.facts(due.map((d) => d.row));
  for (const { row, month } of due) {
    if (!run.inTime()) {
      counts.deferred += 1;
      continue;
    }
    const known = facts.get(row.user_id);
    const decision = known
      ? ideaDecision({ basis: row.basis, lastSentOn: row.last_sent_on, priceSentAt: row.price_sent_at }, known, run.mode, today)
      : ({ send: false, reason: "no_email" } as const);
    // What the claim replaces, read before claiming: a failed email puts it back.
    const previous = row.handled_for;
    if (!(await run.store.claim(row.user_id, month!.date))) continue;
    if (!decision.send) {
      counts.skipped += 1;
      continue;
    }
    const dueDay = parseYmd(month!.date)!;
    const season = seasonFor(new Date(Date.UTC(dueDay.year, dueDay.month - 1, dueDay.day)));
    const manifest = seasonTemplate(season, row.template_slug);
    const locale = row.locale === "es" ? "es" : "en";
    let withPrice = decision.withPrice && !(await run.priceSpent(row.user_id));
    const links = await run.links(row, manifest.slug, withPrice, priceEndsAt(today));
    if (!links.priceUrl || !links.priceMoreUrl) withPrice = false;
    const ideaUrl = withPrice ? links.priceUrl! : pageUrl(locale, suggestionPath(manifest.slug, IDEA_REF));
    const moreUrl = withPrice
      ? links.priceMoreUrl!
      : pageUrl(locale, season.more === "templates" ? `/templates?ref=${IDEA_REF}` : `/occasions/${season.more}?ref=${IDEA_REF}`);
    const last = priceLastDay(today);
    const lastDay: MonthDay = { month: last.getUTCMonth() + 1, day: last.getUTCDate() };
    const ok = await run.send({
      to: known!.email!.trim(),
      locale,
      season: season.id,
      templateSlug: manifest.slug,
      ideaUrl,
      moreUrl,
      stopUrl: links.stopUrl,
      basis: row.basis,
      ...(withPrice ? { priceUntil: formatMonthDay(lastDay, locale) } : {}),
      onceKey: `monthly-idea/${row.user_id}/${month!.date}`,
    });
    if (ok) {
      await run.store.sent(row.user_id, ymdOf(today), withPrice, run.now);
      counts.sent += 1;
    } else {
      await run.store.release(row.user_id, previous);
      counts.failed += 1;
    }
    await run.pause();
  }
  return counts;
}

/** The service role's view, for the cron. */
export function supabaseIdeaStore(db: SupabaseClient<Database>): IdeaStore {
  const fail = (what: string, error: { message: string } | null) => {
    if (error) throw new Error(`monthly idea ${what}: ${error.message}`);
  };
  return {
    async due(window, limit) {
      const { data, error } = await db
        .from("monthly_ideas")
        .select("user_id, since, template_slug, locale, basis, handled_for, last_sent_on, price_sent_at")
        .in("since_day", window.days)
        .is("off_at", null)
        .gte("since", window.sinceFrom)
        .lte("since", window.sinceTo)
        .or(`handled_for.is.null,handled_for.lt.${window.handledBefore}`)
        .order("handled_for", { ascending: true, nullsFirst: true })
        .limit(limit);
      fail("due", error);
      return data ?? [];
    },
    async facts(rows) {
      const ids = [...new Set(rows.map((r) => r.user_id))];
      const out = new Map<string, IdeaFacts>();
      if (ids.length === 0) return out;
      const [profiles, monthsaries, reminders, offers, purchases, unlocks, credits] = await Promise.all([
        db.from("profiles").select("id, email").in("id", ids),
        db.from("monthsaries").select("user_id").in("user_id", ids),
        db.from("reminders").select("user_id, month, day").in("user_id", ids),
        db.from("offer_emails").select("user_id").in("user_id", ids),
        db.from("purchases").select("user_id").in("user_id", ids).eq("status", "paid").or("store.is.null,store.eq.stripe"),
        db.from("template_unlocks").select("user_id").in("user_id", ids).eq("template_slug", "*"),
        db.from("gift_credits").select("user_id").in("user_id", ids).is("spent_slug", null).is("revoked_at", null),
      ]);
      fail("profiles", profiles.error);
      fail("monthsaries", monthsaries.error);
      fail("reminders", reminders.error);
      fail("offer emails", offers.error);
      fail("purchases", purchases.error);
      fail("unlocks", unlocks.error);
      // Gifts ready (0024) may not be there yet: then nobody holds one.
      if (credits.error && !isMissingTable(credits.error)) fail("gift credits", credits.error);

      const emails = new Map((profiles.data ?? []).map((p) => [p.id, (p.email ?? "").trim()]));
      const keys = new Map<string, string>();
      for (const [id, email] of emails) if (email) keys.set(id, await emailKey(email));
      const hashes = [...new Set(keys.values())];
      let optedOut = new Set<string>();
      const keepDays = new Map<string, MonthDay[]>();
      if (hashes.length > 0) {
        const [optouts, keeps] = await Promise.all([
          db.from("email_optouts").select("email_sha256").in("email_sha256", hashes),
          db.from("gift_keeps").select("id, email_sha256").in("email_sha256", hashes).not("confirmed_at", "is", null),
        ]);
        fail("opt-outs", optouts.error);
        fail("keeps", keeps.error);
        optedOut = new Set((optouts.data ?? []).map((o) => o.email_sha256));
        const keepOf = new Map((keeps.data ?? []).map((k) => [k.id, k.email_sha256]));
        if (keepOf.size > 0) {
          const kept = await db.from("keep_reminders").select("keep_id, month, day").in("keep_id", [...keepOf.keys()]);
          fail("keep reminders", kept.error);
          for (const r of kept.data ?? []) {
            const hash = keepOf.get(r.keep_id)!;
            keepDays.set(hash, [...(keepDays.get(hash) ?? []), { month: r.month, day: r.day }]);
          }
        }
      }
      const has = (data: { user_id: string }[] | null, id: string) => (data ?? []).some((r) => r.user_id === id);
      for (const id of ids) {
        const hash = keys.get(id);
        out.set(id, {
          email: emails.get(id) || null,
          optedOut: hash ? optedOut.has(hash) : false,
          hasMonthsary: has(monthsaries.data, id),
          reminderDays: [...(reminders.data ?? []).filter((r) => r.user_id === id).map((r) => ({ month: r.month, day: r.day })), ...(hash ? (keepDays.get(hash) ?? []) : [])],
          boxYes: has(offers.data, id),
          customer: has(purchases.data, id),
          ownsEverything: has(unlocks.data, id),
          holdsGift: credits.error ? false : has(credits.data, id),
        });
      }
      return out;
    },
    async claim(userId, date) {
      const { data, error } = await db
        .from("monthly_ideas")
        .update({ handled_for: date })
        .eq("user_id", userId)
        .is("off_at", null)
        .or(`handled_for.is.null,handled_for.lt.${date}`)
        .select("user_id")
        .maybeSingle();
      return !error && Boolean(data);
    },
    async release(userId, previous) {
      await db.from("monthly_ideas").update({ handled_for: previous }).eq("user_id", userId);
    },
    async sent(userId, on, withPrice, at) {
      const { error } = await db
        .from("monthly_ideas")
        .update({ last_sent_on: on, ...(withPrice ? { price_sent_at: at.toISOString() } : {}) })
        .eq("user_id", userId);
      if (error) console.error("[monthly-idea] couldn't record a sent email", error.message);
    },
  };
}
