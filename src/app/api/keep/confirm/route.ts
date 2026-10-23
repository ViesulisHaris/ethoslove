import type { NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { linkSecret, signToken, verifyToken } from "@/lib/lifecycle/links";
import { linkPage } from "@/lib/email/link-page";
import { sendKeepLink } from "@/lib/email/notify";
import { siteUrl } from "@/lib/email/urls";
import { cleanRequests, joinDe, keptDays } from "@/lib/keep/keep";
import { confirmKeep } from "@/lib/keep/store";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * "Yes, email me the link", from a kept gift's confirmation email. GET asks (a mail scanner opening
 * the link does nothing: lib/email/link-page.ts), POST confirms: the reminders asked for become real
 * and the gift's link goes out, once; confirming again sends nothing new. A keep that's gone (not
 * confirmed within a week, or unsubscribed) has nothing left to confirm. The page that asks names
 * nobody (whoever holds the confirmation may not be who the gift was for); after the yes, the page
 * and the link email name the sender by the first name on the gift.
 */

type L = "en" | "es";
const localeOf = (v: string | null | undefined): L => (v === "es" ? "es" : "en");
const inWords = (days: { label: string; date: string }[], locale: L) =>
  new Intl.ListFormat(locale === "es" ? "es" : "en-GB", { type: "conjunction" }).format(days.map((d) => `${d.label} (${d.date})`));

async function resolve(request: NextRequest) {
  const secret = linkSecret();
  const admin = getSupabaseAdminClient();
  if (!secret || !admin) return { state: "unavailable" as const };
  if (!(await rateLimit(`keep-confirm:${clientIp(request.headers)}`, { limit: 30, windowSeconds: 60 }))) return { state: "unavailable" as const };
  const id = await verifyToken("keep-confirm", request.nextUrl.searchParams.get("t"), secret);
  if (!id) return { state: "invalid" as const };
  return { state: "ok" as const, id, db: admin, secret };
}

async function problem(state: "invalid" | "unavailable" | "gone", locale: L) {
  const t = await getTranslations({ locale, namespace: "lifecycle" });
  if (state === "gone") return linkPage({ locale, title: t("keep.goneTitle"), body: t("keep.goneBody"), home: t("link.home") });
  return linkPage({ locale, title: t(`link.${state}Title`), body: t(`link.${state}Body`), home: t("link.home"), status: state === "invalid" ? 404 : 503 });
}

export async function GET(request: NextRequest) {
  const asked = localeOf(request.nextUrl.searchParams.get("l"));
  const found = await resolve(request);
  if (found.state !== "ok") return problem(found.state, asked);
  const { data, error } = await found.db.from("gift_keeps").select("locale, requested").eq("id", found.id).maybeSingle();
  if (error) return problem("unavailable", asked);
  if (!data) return problem("gone", asked);
  const locale = localeOf(data.locale);
  const t = await getTranslations({ locale, namespace: "lifecycle" });
  const days = keptDays(cleanRequests(data.requested), locale);
  return linkPage({
    locale,
    title: t("keep.confirmTitle"),
    body: days.length ? joinDe(t("keep.confirmBodyDays", { days: inWords(days, locale) })) : t("keep.confirmBody"),
    confirm: { label: t("keep.confirmButton"), action: `${request.nextUrl.pathname}${request.nextUrl.search}` },
    home: t("link.home"),
  });
}

export async function POST(request: NextRequest) {
  const asked = localeOf(request.nextUrl.searchParams.get("l"));
  const found = await resolve(request);
  if (found.state !== "ok") return problem(found.state, asked);
  const kept = await confirmKeep(found.db, found.id, Date.now()).catch(() => undefined);
  if (kept === undefined) return problem("unavailable", asked);
  if (kept === null) return problem("gone", asked);
  const giftUrl = `${siteUrl()}/g/${kept.shortId}`;
  const days = keptDays(kept.reminders, kept.locale, { named: true });
  if (kept.first) {
    const stop = await signToken("keep-stop", found.id, found.secret);
    await sendKeepLink({ to: kept.email, locale: kept.locale, giftUrl, days, sender: kept.sender, stopUrl: `${siteUrl()}/api/keep/stop?t=${stop}&l=${kept.locale}` });
  }
  const t = await getTranslations({ locale: kept.locale, namespace: "lifecycle" });
  return linkPage({
    locale: kept.locale,
    title: t("keep.doneTitle"),
    body: days.length ? joinDe(t("keep.doneDays", { days: inWords(days, kept.locale) })) : t("keep.doneBody"),
    next: { label: t("keep.open"), href: giftUrl },
    home: t("link.home"),
  });
}
