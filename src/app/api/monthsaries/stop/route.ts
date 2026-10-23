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
 * "Stop these", from any monthsary email: every monthly check-in and reminder for the account ends,
 * for good, and the partner's name and the date go with them. No sign-in: the signed link is the
 * permission, and it names the account, so a link from an older email still stops a monthsary
 * turned on again since. GET asks, POST stops (a GET never acts: lib/email/link-page.ts); the POST
 * is also what a mail app's own unsubscribe button sends (List-Unsubscribe), which is the one tap.
 * The yearly reminders are separate, and stay.
 */

type L = "en" | "es";
const localeOf = (v: string | null | undefined): L => (v === "es" ? "es" : "en");

async function resolve(request: NextRequest) {
  const secret = linkSecret();
  const admin = getSupabaseAdminClient();
  if (!secret || !admin) return { state: "unavailable" as const };
  if (!(await rateLimit(`monthsary-stop:${clientIp(request.headers)}`, { limit: 30, windowSeconds: 60 }))) return { state: "unavailable" as const };
  const userId = await verifyToken("monthsary-stop", request.nextUrl.searchParams.get("t"), secret);
  if (!userId) return { state: "invalid" as const };
  return { state: "ok" as const, userId, db: admin };
}

async function stopped(locale: L) {
  const t = await getTranslations({ locale, namespace: "lifecycle" });
  return linkPage({
    locale,
    title: t("monthly.stopDoneTitle"),
    body: t("monthly.stopDoneBody"),
    next: { label: t("monthly.manage"), href: pageUrl(locale, "/account/reminders") },
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
  const { data, error } = await found.db.from("monthsaries").select("partner_name, locale").eq("user_id", found.userId).limit(1).maybeSingle();
  if (error) return problem("unavailable", asked);
  // Already stopped reads as stopped: that is what the link is for.
  if (!data) return stopped(asked);
  const locale = localeOf(data.locale);
  const t = await getTranslations({ locale, namespace: "lifecycle" });
  return linkPage({
    locale,
    title: t("monthly.stopTitle"),
    body: t("monthly.stopBody", { name: data.partner_name }),
    confirm: { label: t("monthly.stopConfirm"), action: `${request.nextUrl.pathname}${request.nextUrl.search}` },
    home: t("link.home"),
  });
}

export async function POST(request: NextRequest) {
  const asked = localeOf(request.nextUrl.searchParams.get("l"));
  const found = await resolve(request);
  if (found.state !== "ok") return problem(found.state, asked);
  const { data: row, error } = await found.db.from("monthsaries").select("locale").eq("user_id", found.userId).limit(1).maybeSingle();
  if (error) return problem("unavailable", asked);
  // All of the account's: "stop these" means all of them.
  if (row) {
    const { error: removeError } = await found.db.from("monthsaries").delete().eq("user_id", found.userId);
    if (removeError) return problem("unavailable", asked);
  }
  return stopped(row ? localeOf(row.locale) : asked);
}
