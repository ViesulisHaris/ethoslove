import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isConfigured } from "@/lib/env";
import { linkSecret, signToken } from "@/lib/lifecycle/links";
import { dateLetterOn } from "@/lib/lifecycle/date-letter-flag";
import { letterTableThere } from "@/lib/lifecycle/date-letter-store";
import { sendDateLetters, supabaseLetterStore } from "@/lib/lifecycle/date-letter-job";
import { ideaMode } from "@/lib/lifecycle/monthly-idea";
import { sendDateLetter } from "@/lib/email/notify";
import { siteUrl } from "@/lib/email/urls";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Stop starting new emails well inside maxDuration. */
const BUDGET_MS = 45_000;
/** Resend's default limit is two requests a second per team; one email at a time, spaced, stays under it. */
const SEND_GAP_MS = 500;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * The date letter (lib/lifecycle/date-letter.ts): every day at :10, :30 and :50 from 08:10 to 15:50
 * UTC (vercel.json). Every run tidies the list; Thursday to Sunday it sends the week's letter. Switched
 * off until DATE_LETTER=on: then it answers `skipped: "off"` and reads nothing. Without migration 0027
 * it answers `skipped: "no_table"`. How many are on the list, waiting and stopped is counted from the
 * table each run (no event is sent for a confirm or a stop: those pages load no script).
 */
export async function GET(request: NextRequest) {
  // Fail closed: without a configured secret nobody can trigger the cron.
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!dateLetterOn()) return NextResponse.json({ ok: true, skipped: "off" });
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const linkKey = linkSecret();
  // Nothing would be sent, and every claim would only be handed back.
  if (!isConfigured.resend || !linkKey) return NextResponse.json({ ok: true, skipped: "email_not_configured" });
  if (!(await letterTableThere(admin))) return NextResponse.json({ ok: true, skipped: "no_table" });

  const started = Date.now();
  let counts: Awaited<ReturnType<typeof sendDateLetters>>;
  try {
    counts = await sendDateLetters({
      store: supabaseLetterStore(admin, ideaMode() !== "off"),
      send: sendDateLetter,
      stopUrl: async (row) => `${siteUrl()}/api/date-letter/stop?t=${await signToken("date-letter-stop", row.id, linkKey)}&l=${row.locale === "es" ? "es" : "en"}`,
      now: new Date(),
      inTime: () => Date.now() - started <= BUDGET_MS,
      pause: () => sleep(SEND_GAP_MS),
    });
  } catch (error) {
    console.error("[cron/date-letter] failed", (error as Error).message);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  // The list's size, for the log: a failure here is logged and left out, never a 503.
  const totals: { on?: number; pending?: number; stopped?: number } = {};
  try {
    const [on, pending, stopped] = await Promise.all([
      admin.from("date_letter").select("id", { count: "exact", head: true }).not("confirmed_at", "is", null).is("stopped_at", null),
      admin.from("date_letter").select("id", { count: "exact", head: true }).is("confirmed_at", null),
      admin.from("date_letter").select("id", { count: "exact", head: true }).not("stopped_at", "is", null),
    ]);
    if (!on.error) totals.on = on.count ?? 0;
    if (!pending.error) totals.pending = pending.count ?? 0;
    if (!stopped.error) totals.stopped = stopped.count ?? 0;
    for (const r of [on, pending, stopped]) if (r.error) console.error("[cron/date-letter] count failed", r.error.message);
  } catch (error) {
    console.error("[cron/date-letter] count failed", (error as Error).message);
  }
  console.info(`[date-letter] week ${counts.week} slot ${counts.slot}: sent ${counts.sent}, held ${counts.held}, on ${totals.on ?? "?"}, pending ${totals.pending ?? "?"}, stopped ${totals.stopped ?? "?"}`);
  return NextResponse.json({ ok: true, ...counts, totals });
}
