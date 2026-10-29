import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isConfigured } from "@/lib/env";
import { getStripe } from "@/lib/stripe/server";
import { linkSecret, signToken } from "@/lib/lifecycle/links";
import { sendPublishReminder } from "@/lib/email/notify";
import { siteUrl } from "@/lib/email/urls";
import { sendPublishReminders, supabasePublishReminderStore } from "@/lib/commerce/publish-reminders";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Stop starting new emails well inside maxDuration. */
const BUDGET_MS = 45_000;
/** Resend's default limit is two requests a second per team; one email at a time, spaced, stays under it. */
const SEND_GAP_MS = 500;
/** How long the email's button signs its reader in; after that it asks them to sign in. */
const LINK_SECONDS = 3 * 86_400;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Every five minutes: "One step left" to whoever paid for a gift a quarter of an hour ago and hasn't
 * published it (lib/commerce/publish-reminders.ts).
 */
export async function GET(request: NextRequest) {
  // Fail closed: without a configured secret nobody can trigger the cron.
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const linkKey = linkSecret();
  if (!isConfigured.resend || !linkKey) return NextResponse.json({ ok: true, skipped: "email_not_configured" });

  const started = Date.now();
  const until = Math.floor(started / 1000) + LINK_SECONDS;
  try {
    const result = await sendPublishReminders({
      store: supabasePublishReminderStore(admin, getStripe()),
      send: sendPublishReminder,
      link: async (row, locale) => `${siteUrl()}/api/checkout/finish?t=${await signToken("publish-finish", `${row.id}:${until}`, linkKey)}${locale === "es" ? "&l=es" : ""}`,
      now: started,
      inTime: () => Date.now() - started < BUDGET_MS,
      pause: () => sleep(SEND_GAP_MS),
    });
    if (result.sent || result.failed || result.deferred) console.info("[cron/publish-reminders]", JSON.stringify(result));
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron/publish-reminders] failed", (e as Error).message);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
