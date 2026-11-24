import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isConfigured } from "@/lib/env";
import { linkSecret, signToken } from "@/lib/lifecycle/links";
import { openLinkUntil, sendReminders, supabaseReminderJobStore } from "@/lib/lifecycle/reminder-job";
import { pairOnSale } from "@/lib/pricing/products";
import { sendMonthsaries, supabaseMonthsaryStore } from "@/lib/lifecycle/monthsary-job";
import { sendMonthsaryCheckIn, sendMonthsaryReminder, sendReminderEmail } from "@/lib/email/notify";
import { sendDateReminder } from "@/lib/email/saved-dates";
import { pageUrl, siteUrl } from "@/lib/email/urls";
import { sendDateReminders, supabaseReminderStore } from "@/lib/saved-dates/reminders";
import { sendKeptReminders } from "@/lib/keep/reminder-job";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Stop starting new emails well inside maxDuration. */
const BUDGET_MS = 45_000;
/** Resend's default limit is two requests a second per team; one email at a time, spaced, stays under it. */
const SEND_GAP_MS = 500;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * "Remind me": every morning, the three e-mails before each saved day, seven days, two days and the
 * day before (lib/lifecycle/reminder-job.ts; before migration 0025, the one e-mail nine days
 * before). 29 February is sent for on the 28th in other years. Each e-mail is claimed before it goes,
 * so two runs at once can't both send it; if it fails, the claim is given back and the next run tries
 * again. Then the monthsaries (the day-before check-ins, and the reminders that
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

  // The three e-mails before each saved day (lib/lifecycle/reminder-job.ts), or, before migration
  // 0025, the one e-mail as it always was. A database that can't be read answers 503, as before.
  let yearly: Awaited<ReturnType<typeof sendReminders>>;
  try {
    yearly = await sendReminders({
      store: supabaseReminderJobStore(admin),
      send: (email) =>
        sendReminderEmail({
          to: email.to,
          locale: email.locale,
          recipientName: email.recipientName,
          occasion: email.occasion,
          date: email.date,
          removeUrl: email.removeUrl,
          staged: email,
        }),
      sendOld: (email) => sendReminderEmail(email),
      links: async (row, stage, year, locale) => {
        const open = `${siteUrl()}/api/reminders/open?t=${await signToken("reminder-open", `${row.id}:${openLinkUntil(row, year)}`, linkKey)}&s=${stage}&l=${locale}`;
        return {
          openUrl: open,
          moreUrl: `${open}&to=templates`,
          skipUrl: `${siteUrl()}/api/reminders/skip?t=${await signToken("reminder-skip", `${row.id}:${year}`, linkKey)}&l=${locale}`,
          removeUrl: `${siteUrl()}/api/reminders/remove?t=${await signToken("reminder-remove", row.id, linkKey)}&l=${locale}`,
        };
      },
      removeUrl: async (row, locale) => `${siteUrl()}/api/reminders/remove?t=${await signToken("reminder-remove", row.id, linkKey)}&l=${locale}`,
      pairOnSale: pairOnSale(),
      now: new Date(),
      inTime: () => Date.now() - started <= BUDGET_MS,
      pause: () => sleep(SEND_GAP_MS),
    });
  } catch (error) {
    console.error("[cron/reminders] query failed", (error as Error).message);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  const { sent, failed, deferred } = yearly;

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

  return NextResponse.json({ ok: true, sent, failed, deferred, mode: yearly.mode, monthly, kept, dates });
}
