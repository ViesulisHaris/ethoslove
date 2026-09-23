import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendPassRenewalReminder } from "@/lib/email/notify";
import { iso, renewUrl } from "@/lib/commerce/db";
import { remindRenewals, sweepEndedPasses } from "@/lib/commerce/passes";
import { deleteGiftCardDetails, staleGiftCardDetailsBefore } from "@/lib/commerce/gift-cards";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Daily (vercel.json, 06:00 UTC). "Ethos for Two" is paid once and never renews by itself, so:
 * - 14 days before a year ends, its owner gets one email with a one-tap renew link (unless they
 *   already bought the next year);
 * - a year that ended loses its unlock rows, for the owner and the partner; anyone with another year
 *   running gets them straight back from it. Gifts sent during the year stay live.
 * It also deletes the gift card names and notes that abandoned checkouts left behind (0012).
 */
export async function GET(request: NextRequest) {
  // Fail closed: without a configured secret nobody can trigger the cron.
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const now = Date.now();

  const reminders = await remindRenewals(admin, now, async (pass) => {
    const { data: owner } = await admin.from("profiles").select("email, locale").eq("id", pass.owner_user_id).maybeSingle();
    if (!owner?.email) return false;
    const locale = owner.locale === "es" ? "es" : "en";
    return sendPassRenewalReminder({ to: owner.email, locale, endsAt: iso(Date.parse(pass.ends_at)), renewUrl: renewUrl(locale) });
  });
  const swept = await sweepEndedPasses(admin, now);
  await deleteGiftCardDetails(admin, { olderThan: staleGiftCardDetailsBefore(now) });

  return NextResponse.json({ ok: true, reminders, swept });
}
