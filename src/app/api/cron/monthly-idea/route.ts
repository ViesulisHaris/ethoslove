import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isConfigured } from "@/lib/env";
import { linkSecret, signToken } from "@/lib/lifecycle/links";
import { ideaMode, ideaPaused, IDEA_REF } from "@/lib/lifecycle/monthly-idea";
import { sendMonthlyIdeas, supabaseIdeaStore } from "@/lib/lifecycle/monthly-idea-job";
import { monthlyPriceToken, personalPriceSecret, personalPriceUsed } from "@/lib/commerce/personal-price";
import { sendMonthlyIdea } from "@/lib/email/notify";
import { siteUrl } from "@/lib/email/urls";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Stop starting new emails well inside maxDuration. */
const BUDGET_MS = 45_000;
/** Resend's default limit is two requests a second per team; one email at a time, spaced, stays under it. */
const SEND_GAP_MS = 500;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * The monthly idea (lib/lifecycle/monthly-idea.ts): every morning, seven runs from 07:40 to 13:40 UTC
 * (vercel.json), one e-mail to each account whose monthly date has come, for a year after its last
 * gift. Switched off until MONTHLY_IDEA_EMAILS says otherwise: then it answers `skipped: "off"` and
 * reads nothing. MONTHLY_IDEA_PAUSE_UNTIL holds it for a while without a deploy.
 */
export async function GET(request: NextRequest) {
  // Fail closed: without a configured secret nobody can trigger the cron.
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const mode = ideaMode();
  if (mode === "off") return NextResponse.json({ ok: true, skipped: "off" });
  if (ideaPaused(new Date())) return NextResponse.json({ ok: true, skipped: "paused" });
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const linkKey = linkSecret();
  // Nothing would be sent, and every claim would only be handed back.
  if (!isConfigured.resend || !linkKey) return NextResponse.json({ ok: true, skipped: "email_not_configured" });
  const priceKey = personalPriceSecret();

  const started = Date.now();
  try {
    const counts = await sendMonthlyIdeas({
      store: supabaseIdeaStore(admin),
      mode,
      send: sendMonthlyIdea,
      links: async (row, slug, withPrice, endsAt) => {
        const locale = row.locale === "es" ? "es" : "en";
        const stopUrl = `${siteUrl()}/api/monthly-idea/stop?t=${await signToken("monthly-idea-stop", row.user_id, linkKey)}&l=${locale}`;
        if (!withPrice || !priceKey) return { stopUrl, priceUrl: null, priceMoreUrl: null };
        const token = encodeURIComponent(await monthlyPriceToken(row.user_id, endsAt, priceKey));
        const priceMoreUrl = `${siteUrl()}/api/offer/open?t=${token}&l=${locale}&r=${IDEA_REF}`;
        return { stopUrl, priceUrl: `${priceMoreUrl}&to=${slug}`, priceMoreUrl };
      },
      priceSpent: personalPriceUsed,
      now: new Date(),
      inTime: () => Date.now() - started <= BUDGET_MS,
      pause: () => sleep(SEND_GAP_MS),
    });
    return NextResponse.json({ ok: true, ...counts });
  } catch (error) {
    console.error("[cron/monthly-idea] failed", (error as Error).message);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
