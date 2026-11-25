import type { NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { linkSecret, verifyToken } from "@/lib/lifecycle/links";
import { linkPage } from "@/lib/email/link-page";
import { pageUrl } from "@/lib/email/urls";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * "Stop these emails", from any monthly idea (lib/lifecycle/monthly-idea.ts). No sign-in: the signed
 * link is the permission, and it names the account. GET asks, POST stops (a GET never acts: mail
 * scanners open links; lib/email/link-page.ts); the POST is also what a mail app's own unsubscribe
 * button sends (List-Unsubscribe), which is the one tap. The row is kept with off_at set, never
 * deleted: that is what keeps it off when the account sends another gift. Gifts already sent and the
 * date reminders are not touched.
 */

type L = "en" | "es";
const localeOf = (v: string | null | undefined): L => (v === "es" ? "es" : "en");

async function resolve(request: NextRequest) {
  const secret = linkSecret();
  const admin = getSupabaseAdminClient();
  if (!secret || !admin) return { state: "unavailable" as const };
  // The token first, and the limits after it: a mail provider's one-click unsubscribe (RFC 8058)
  // comes from a few of its own servers for everyone at once, so a limit per address would leave
  // the 31st person in a minute subscribed (monthly-D9). Only bad links count against an address;
  // a good one is limited per account, which is all a repeat of it can touch.
  const userId = await verifyToken("monthly-idea-stop", request.nextUrl.searchParams.get("t"), secret);
  if (!userId) {
    if (!(await rateLimit(`monthly-idea-stop-bad:${clientIp(request.headers)}`, { limit: 30, windowSeconds: 60 }))) return { state: "unavailable" as const };
    return { state: "invalid" as const };
  }
  if (!(await rateLimit(`monthly-idea-stop:${userId}`, { limit: 30, windowSeconds: 60 }))) return { state: "unavailable" as const };
  return { state: "ok" as const, userId, db: admin };
}

async function stopped(locale: L) {
  const t = await getTranslations({ locale, namespace: "lifecycle" });
  return linkPage({
    locale,
    title: t("idea.stopDoneTitle"),
    body: t("idea.stopDoneBody"),
    next: { label: t("idea.manage"), href: pageUrl(locale, "/account/reminders") },
    home: t("link.home"),
  });
}

async function problem(state: "invalid" | "unavailable", locale: L) {
  const t = await getTranslations({ locale, namespace: "lifecycle.link" });
  return linkPage({ locale, title: t(`${state}Title`), body: t(`${state}Body`), home: t("home"), status: state === "invalid" ? 404 : 503 });
}

export async function GET(request: NextRequest) {
  const asked = localeOf(request.nextUrl.searchParams.get("l"));
  const found = await resolve(request);
  if (found.state !== "ok") return problem(found.state, asked);
  const { data, error } = await found.db.from("monthly_ideas").select("off_at, locale").eq("user_id", found.userId).maybeSingle();
  if (error) return problem("unavailable", asked);
  // No row, or already stopped, reads as stopped: that is what the link is for.
  if (!data || data.off_at) return stopped(data ? localeOf(data.locale) : asked);
  const locale = localeOf(data.locale);
  const t = await getTranslations({ locale, namespace: "lifecycle" });
  return linkPage({
    locale,
    title: t("idea.stopTitle"),
    body: t("idea.stopBody"),
    confirm: { label: t("idea.stopConfirm"), action: `${request.nextUrl.pathname}${request.nextUrl.search}` },
    home: t("link.home"),
  });
}

export async function POST(request: NextRequest) {
  const asked = localeOf(request.nextUrl.searchParams.get("l"));
  const found = await resolve(request);
  if (found.state !== "ok") return problem(found.state, asked);
  const { data: row, error } = await found.db.from("monthly_ideas").select("locale").eq("user_id", found.userId).maybeSingle();
  if (error) return problem("unavailable", asked);
  if (row) {
    const { error: stopError } = await found.db.from("monthly_ideas").update({ off_at: new Date().toISOString() }).eq("user_id", found.userId).is("off_at", null);
    if (stopError) return problem("unavailable", asked);
  }
  return stopped(row ? localeOf(row.locale) : asked);
}
