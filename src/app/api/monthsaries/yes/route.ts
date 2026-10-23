import type { NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { linkSecret, verifyToken } from "@/lib/lifecycle/links";
import { linkPage } from "@/lib/email/link-page";
import { pageUrl } from "@/lib/email/urls";
import { answerYes, monthsaryOn, parseYmd } from "@/lib/lifecycle/monthsaries";
import { suggestTemplate, suggestionPath } from "@/lib/lifecycle/suggest";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * "Yes, remind me", from a monthsary's check-in (lib/lifecycle/monthsaries.ts): no sign-in, the
 * signed link is the permission, and it names the account and the one day it asks about. GET asks, POST answers
 * (a GET never acts: lib/email/link-page.ts). A yes the day before brings the reminder the next
 * morning; a yes on the day itself shows the small idea at once, in place of the email that has
 * already had its morning; a yes after the day changes nothing.
 */

type L = "en" | "es";
const localeOf = (v: string | null | undefined): L => (v === "es" ? "es" : "en");

async function resolve(request: NextRequest) {
  const secret = linkSecret();
  const admin = getSupabaseAdminClient();
  if (!secret || !admin) return { state: "unavailable" as const };
  if (!(await rateLimit(`monthsary-yes:${clientIp(request.headers)}`, { limit: 30, windowSeconds: 60 }))) return { state: "unavailable" as const };
  const value = await verifyToken("monthsary-yes", request.nextUrl.searchParams.get("t"), secret);
  if (!value) return { state: "invalid" as const };
  const [userId, date] = [value.slice(0, 36), value.slice(37)];
  const { data, error } = await admin.from("monthsaries").select("id, partner_name, since, locale, checkin_for, confirmed_for").eq("user_id", userId).maybeSingle();
  if (error) return { state: "unavailable" as const };
  // Stopped since: the link says so, rather than that it's broken. Asked about another day since (they
  // stopped and started again): this email's question is an old one, and the next asks afresh.
  if (!data) return { state: "stopped" as const };
  if (data.checkin_for !== date) return { state: "stale" as const };
  return { state: "ok" as const, row: data, date, db: admin };
}

async function problem(state: "invalid" | "unavailable" | "stopped" | "stale", locale: L) {
  const t = await getTranslations({ locale, namespace: "lifecycle" });
  if (state === "stopped") return linkPage({ locale, title: t("monthly.stoppedTitle"), body: t("monthly.stoppedBody"), home: t("link.home") });
  if (state === "stale") return linkPage({ locale, title: t("monthly.staleTitle"), body: t("monthly.staleBody"), home: t("link.home") });
  return linkPage({ locale, title: t(`link.${state}Title`), body: t(`link.${state}Body`), home: t("link.home"), status: state === "invalid" ? 404 : 503 });
}

export async function GET(request: NextRequest) {
  const asked = localeOf(request.nextUrl.searchParams.get("l"));
  const found = await resolve(request);
  if (found.state !== "ok") return problem(found.state, asked);
  const locale = localeOf(found.row.locale);
  const t = await getTranslations({ locale, namespace: "lifecycle" });
  const when = answerYes(found.date, new Date());
  if (when === "passed") return linkPage({ locale, title: t("monthly.passedTitle"), body: t("monthly.passedBody"), home: t("link.home") });
  return linkPage({
    locale,
    title: t(when === "today" ? "monthly.yesTodayTitle" : "monthly.yesTitle", { name: found.row.partner_name }),
    body: t(when === "today" ? "monthly.yesTodayBody" : "monthly.yesBody", { name: found.row.partner_name }),
    confirm: { label: t(when === "today" ? "monthly.yesTodayConfirm" : "monthly.yesConfirm"), action: `${request.nextUrl.pathname}${request.nextUrl.search}` },
    home: t("link.home"),
  });
}

export async function POST(request: NextRequest) {
  const asked = localeOf(request.nextUrl.searchParams.get("l"));
  const found = await resolve(request);
  if (found.state !== "ok") return problem(found.state, asked);
  const { row, date, db } = found;
  const locale = localeOf(row.locale);
  const t = await getTranslations({ locale, namespace: "lifecycle" });
  const when = answerYes(date, new Date());
  if (when === "passed") return linkPage({ locale, title: t("monthly.passedTitle"), body: t("monthly.passedBody"), home: t("link.home") });
  if (when === "remind_tomorrow") {
    const { error } = await db.from("monthsaries").update({ confirmed_for: date }).eq("id", row.id).eq("checkin_for", date);
    if (error) return problem("unavailable", locale);
    return linkPage({ locale, title: t("monthly.yesDoneTitle"), body: t("monthly.yesDoneBody", { name: row.partner_name }), home: t("link.home") });
  }
  // The day itself: the morning's email has had its run, so the idea is here instead, and is the reminder.
  const { error } = await db.from("monthsaries").update({ confirmed_for: date, reminded_for: date }).eq("id", row.id).eq("checkin_for", date);
  if (error) return problem("unavailable", locale);
  const since = parseYmd(row.since);
  const months = since ? (monthsaryOn(since, new Date(`${date}T00:00:00Z`)) ?? 0) : 0;
  const idea = suggestTemplate("monthsary", { turn: months });
  return linkPage({
    locale,
    title: t("monthly.todayTitle"),
    body: t("monthly.todayBody", { name: row.partner_name, template: idea.name[locale] }),
    next: { label: t("monthly.todayCta", { template: idea.name[locale] }), href: pageUrl(locale, suggestionPath(idea.slug, "email-monthsary")) },
    home: t("link.home"),
  });
}
