import type { NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isMissingColumn } from "@/lib/commerce/db";
import { linkSecret, verifyToken } from "@/lib/lifecycle/links";
import { DONE_STAGE } from "@/lib/lifecycle/reminders";
import { linkPage } from "@/lib/email/link-page";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * "Not this year", from the e-mails before a day: no sign-in, the signed link is the permission. GET
 * asks, POST acts (see lib/email/link-page.ts for why a GET never acts). It marks that one reminder
 * done for the occasion's year the link names (last_sent_year = that year, last_stage = 3), and only
 * for this year or the next, so an e-mail kept for years can't silence one far ahead. Next year's
 * e-mails come as usual.
 */

type L = "en" | "es";
const localeOf = (v: string | null | undefined): L => (v === "es" ? "es" : "en");

async function resolve(request: NextRequest) {
  const secret = linkSecret();
  const admin = getSupabaseAdminClient();
  if (!secret || !admin) return { state: "unavailable" as const };
  if (!(await rateLimit(`reminder-skip:${clientIp(request.headers)}`, { limit: 30, windowSeconds: 60 }))) return { state: "unavailable" as const };
  const value = await verifyToken("reminder-skip", request.nextUrl.searchParams.get("t"), secret);
  if (!value) return { state: "invalid" as const };
  const [id, yearText] = value.split(":");
  const year = Number(yearText);
  const thisYear = new Date().getUTCFullYear();
  if (year !== thisYear && year !== thisYear + 1) return { state: "invalid" as const };
  return { state: "ok" as const, id, year, db: admin };
}

async function problem(state: "invalid" | "unavailable", locale: L) {
  const t = await getTranslations({ locale, namespace: "lifecycle.link" });
  return linkPage({ locale, title: t(`${state}Title`), body: t(`${state}Body`), home: t("home"), status: state === "invalid" ? 404 : 503 });
}

export async function GET(request: NextRequest) {
  const asked = localeOf(request.nextUrl.searchParams.get("l"));
  const found = await resolve(request);
  if (found.state !== "ok") return problem(found.state, asked);
  const { data, error } = await found.db.from("reminders").select("recipient_name, occasion, locale").eq("id", found.id).maybeSingle();
  if (error) return problem("unavailable", asked);
  if (!data) return problem("invalid", asked);
  const locale = localeOf(data.locale);
  const t = await getTranslations({ locale, namespace: "lifecycle" });
  return linkPage({
    locale,
    title: t("skip.title"),
    // The occasion named as the e-mails name it: "your anniversary", not "Mia's day".
    body: t(`skip.body.${bodyOccasion(data.occasion)}`, { name: data.recipient_name }),
    confirm: { label: t("skip.confirm"), action: `${request.nextUrl.pathname}${request.nextUrl.search}` },
    home: t("link.home"),
  });
}

export async function POST(request: NextRequest) {
  const asked = localeOf(request.nextUrl.searchParams.get("l"));
  const found = await resolve(request);
  if (found.state !== "ok") return problem(found.state, asked);
  // Never back: a reminder already done for a later year stays as it is.
  const { data, error } = await found.db
    .from("reminders")
    .update({ last_sent_year: found.year, last_stage: DONE_STAGE })
    .eq("id", found.id)
    .or(`last_sent_year.is.null,last_sent_year.lte.${found.year}`)
    .select("locale")
    .maybeSingle();
  if (error && !isMissingColumn(error)) return problem("unavailable", asked);
  // Before migration 0025 there were no three e-mails to stop: the year alone does what it can.
  if (error) await found.db.from("reminders").update({ last_sent_year: found.year }).eq("id", found.id).or(`last_sent_year.is.null,last_sent_year.lte.${found.year}`);
  // Removed meanwhile, or already done for a later year, reads the same as done: nothing more comes this year.
  const locale = data ? localeOf(data.locale) : asked;
  const t = await getTranslations({ locale, namespace: "lifecycle" });
  return linkPage({ locale, title: t("skip.doneTitle"), body: t("skip.doneBody"), home: t("link.home") });
}

/** The occasions the page has words for; anything else reads as their day. */
const bodyOccasion = (occasion: string | null | undefined): "birthday" | "anniversary" | "valentines" | "other" =>
  occasion === "birthday" || occasion === "anniversary" || occasion === "valentines" ? occasion : "other";
