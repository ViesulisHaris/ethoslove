import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isConfigured } from "@/lib/env";
import { linkSecret, signToken } from "@/lib/lifecycle/links";
import { sendUnsentGift } from "@/lib/email/notify";
import { siteUrl } from "@/lib/email/urls";
import { sendUnsentGiftReminders, supabaseUnsentGiftStore, unsentLinkUntil } from "@/lib/lifecycle/unsent-gift";
import { unsentMode } from "@/lib/lifecycle/unsent-flag";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Stop starting new emails well inside maxDuration. */
const BUDGET_MS = 45_000;
/** Resend's default limit is two requests a second per team; one email at a time, spaced, stays under it. */
const SEND_GAP_MS = 500;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Every hour: one email to whoever left a premium gift unsent in their account yesterday and has
 * neither paid nor sent anything since (lib/lifecycle/unsent-gift.ts). Switched off unless
 * NEXT_PUBLIC_UNSENT_GIFT_EMAILS says otherwise: then it reads nothing and sends nothing.
 */
export async function GET(request: NextRequest) {
  // Fail closed: without a configured secret nobody can trigger the cron.
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const mode = unsentMode();
  if (!mode.on) return NextResponse.json({ ok: true, skipped: "off" });
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const linkKey = linkSecret();
  if (!isConfigured.resend || !linkKey) return NextResponse.json({ ok: true, skipped: "email_not_configured" });

  const started = Date.now();
  try {
    const result = await sendUnsentGiftReminders({
      store: supabaseUnsentGiftStore(admin),
      mode,
      send: sendUnsentGift,
      link: async (draft, locale) => `${siteUrl()}/api/gift/unsent/open?t=${await signToken("unsent-open", `${draft.id}:${unsentLinkUntil(draft)}`, linkKey)}${locale === "es" ? "&l=es" : ""}`,
      now: started,
      inTime: () => Date.now() - started < BUDGET_MS,
      pause: () => sleep(SEND_GAP_MS),
    });
    if (result.sent || result.failed || result.deferred) console.info("[cron/unsent-gifts]", JSON.stringify(result));
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron/unsent-gifts] failed", (e as Error).message);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
