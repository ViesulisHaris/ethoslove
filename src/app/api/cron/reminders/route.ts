import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isConfigured } from "@/lib/env";
import { linkSecret, signToken } from "@/lib/lifecycle/links";
import { dueDates, formatMonthDay, needsSending } from "@/lib/lifecycle/reminders";
import { sendMonthsaries, supabaseMonthsaryStore } from "@/lib/lifecycle/monthsary-job";
import { sendMonthsaryCheckIn, sendMonthsaryReminder, sendReminderEmail } from "@/lib/email/notify";
import { sendDateReminder } from "@/lib/email/saved-dates";
import { pageUrl, siteUrl } from "@/lib/email/urls";
import { sendDateReminders, supabaseReminderStore } from "@/lib/saved-dates/reminders";
import { sendKeptReminders } from "@/lib/keep/reminder-job";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Per date per run; anything left over is picked up by tomorrow's catch-up (lib/lifecycle/reminders.ts). */
const BATCH = 200;
/** Stop starting new emails well inside maxDuration. */
const BUDGET_MS = 45_000;
/** Resend's default limit is two requests a second per team; one email at a time, spaced, stays under it. */
const SEND_GAP_MS = 500;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * "Remind me next year": every morning, the reminders whose day is nine days away (and the two
 * days before that, for runs that were missed) get their email. 29 February is sent for on the 28th
 * in other years. Each reminder is claimed before its email goes (last_sent_year = the occasion's
 * year), so two runs at once can't both send it; if the email fails, the claim is given back and
 * the next run tries again. Then the monthsaries (the day-before check-ins, and the reminders that
 * got a yes: lib/lifecycle/monthsary-job.ts), the days recipients who kept a gift asked about (and
 * the deletion of keeps never confirmed: lib/keep/reminder-job.ts), and, in the time left, members'
 * saved dates that are tomorrow.
 */
export async function GET(request: NextRequest) {
  // Fail closed: without a configured secret nobody can trigger the cron.
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const linkKey = linkSecret();
  // Nothing would be sent, and every claim would only be handed back.
  if (!isConfigured.resend || !linkKey) return NextResponse.json({ ok: true, skipped: "email_not_configured" });

  const started = Date.now();
  let sent = 0;
  let failed = 0;
  let deferred = 0;

  for (const due of dueDates(new Date())) {
    const { data: rows, error } = await admin
      .from("reminders")
      .select("id, user_id, recipient_name, occasion, locale, template_slug, last_sent_year")
      .eq("month", due.month)
      .in("day", due.days)
      .or(`last_sent_year.is.null,last_sent_year.lt.${due.year}`)
      .order("created_at", { ascending: true })
      .limit(BATCH);
    if (error) {
      console.error("[cron/reminders] query failed", error.message);
      return NextResponse.json({ error: "unavailable", sent, failed }, { status: 503 });
    }
    if (!rows?.length) continue;

    const owners = [...new Set(rows.map((r) => r.user_id))];
    const { data: profiles } = await admin.from("profiles").select("id, email").in("id", owners);
    const emails = new Map((profiles ?? []).map((p) => [p.id, p.email]));

    for (const r of rows) {
      if (Date.now() - started > BUDGET_MS) {
        deferred += 1;
        continue;
      }
      const to = emails.get(r.user_id);
      if (!to || !needsSending(r.last_sent_year, due.year)) continue;
      const claim = await admin.from("reminders").update({ last_sent_year: due.year }).eq("id", r.id).or(`last_sent_year.is.null,last_sent_year.lt.${due.year}`).select("id").maybeSingle();
      if (claim.error || !claim.data) continue;

      const locale = r.locale === "es" ? "es" : "en";
      const token = await signToken("reminder-remove", r.id, linkKey);
      const ok = await sendReminderEmail({
        to,
        locale,
        recipientName: r.recipient_name,
        occasion: r.occasion,
        // The day it falls on this year: the 28th for a 29 February birthday in a common year.
        date: formatMonthDay({ month: due.date.getUTCMonth() + 1, day: due.date.getUTCDate() }, locale),
        // The template the reminder was saved with is only skipped: the suggestion is a new one.
        avoid: r.template_slug,
        removeUrl: `${siteUrl()}/api/reminders/remove?t=${token}&l=${locale}`,
      });
      if (ok) sent += 1;
      else {
        failed += 1;
        await admin.from("reminders").update({ last_sent_year: r.last_sent_year }).eq("id", r.id);
      }
      await sleep(SEND_GAP_MS);
    }
  }

  // Then the monthsaries. Like the saved dates below, a failure is logged and reported, and never
  // takes back what the yearly reminders sent.
  let monthly: Awaited<ReturnType<typeof sendMonthsaries>> | { error: string };
  try {
    monthly = await sendMonthsaries({
      store: supabaseMonthsaryStore(admin),
      checkIn: sendMonthsaryCheckIn,
      remind: sendMonthsaryReminder,
      links: async (row, date) => ({
        yesUrl: `${siteUrl()}/api/monthsaries/yes?t=${encodeURIComponent(await signToken("monthsary-yes", `${row.user_id}:${date}`, linkKey))}&l=${row.locale}`,
        stopUrl: `${siteUrl()}/api/monthsaries/stop?t=${await signToken("monthsary-stop", row.user_id, linkKey)}&l=${row.locale}`,
      }),
      now: new Date(),
      inTime: () => Date.now() - started <= BUDGET_MS,
      pause: () => sleep(SEND_GAP_MS),
    });
  } catch (error) {
    console.error("[cron/reminders] monthsaries failed", (error as Error).message);
    monthly = { error: "unavailable" };
  }

  // Then the recipients who kept a gift. A failure is logged and reported here too.
  let kept: Awaited<ReturnType<typeof sendKeptReminders>> | { error: string };
  try {
    kept = await sendKeptReminders({
      admin,
      now: new Date(),
      send: sendReminderEmail,
      removeUrl: async (id, locale) => `${siteUrl()}/api/keep/reminder-off?t=${await signToken("keep-reminder-off", id, linkKey)}&l=${locale}`,
      inTime: () => Date.now() - started <= BUDGET_MS,
      pause: () => sleep(SEND_GAP_MS),
    });
  } catch (error) {
    console.error("[cron/reminders] kept gifts failed", (error as Error).message);
    kept = { error: "unavailable" };
  }

  // Then the saved dates that are tomorrow, with whatever time is left (lib/saved-dates/reminders.ts).
  // A failure here is logged and reported, and never takes back what the first part sent.
  let dates: Awaited<ReturnType<typeof sendDateReminders>> | { error: string };
  try {
    dates = await sendDateReminders({
      store: supabaseReminderStore(admin),
      send: sendDateReminder,
      links: async (row, locale) => ({
        openUrl: row.kind === "trip" && typeof row.data === "object" && row.data && !Array.isArray(row.data) && typeof row.data.tripId === "string" ? pageUrl(locale, `/trips/${row.data.tripId}`) : `${pageUrl(locale, "/plan")}#s=${row.id}`,
        offUrl: `${siteUrl()}/api/saved-dates/remind-off?t=${await signToken("saved-date-reminder-off", row.id, linkKey)}&l=${locale}`,
      }),
      now: new Date(),
      inTime: () => Date.now() - started <= BUDGET_MS,
      pause: () => sleep(SEND_GAP_MS),
    });
  } catch (error) {
    console.error("[cron/reminders] saved dates failed", (error as Error).message);
    dates = { error: "unavailable" };
  }

  return NextResponse.json({ ok: true, sent, failed, deferred, monthly, kept, dates });
}
