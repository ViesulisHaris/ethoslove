import type { NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { linkSecret, verifyToken } from "@/lib/lifecycle/links";
import { linkPage } from "@/lib/email/link-page";
import { reminderContent } from "@/lib/saved-dates/reminders";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * "Turn off reminders for this date", from the day-before email of a saved date: no sign-in, the
 * signed link is the permission. GET asks, POST turns them off (lib/email/link-page.ts says why a
 * GET never acts); the POST is also what a mail app's own unsubscribe button sends, through the
 * email's List-Unsubscribe header. It turns the reminder off for the date, so for both people who
 * share it, which is what the page says.
 */

type L = "en" | "es";
const localeOf = (v: string | null | undefined): L => (v === "es" ? "es" : "en");

async function resolve(request: NextRequest) {
  const secret = linkSecret();
  const admin = getSupabaseAdminClient();
  if (!secret || !admin) return { state: "unavailable" as const };
  if (!(await rateLimit(`saved-date-remind-off:${clientIp(request.headers)}`, { limit: 30, windowSeconds: 60 }))) return { state: "unavailable" as const };
  const id = await verifyToken("saved-date-reminder-off", request.nextUrl.searchParams.get("t"), secret);
  if (!id) return { state: "invalid" as const };
  return { state: "ok" as const, id, db: admin };
}

async function problem(state: "invalid" | "unavailable", locale: L) {
  const t = await getTranslations({ locale, namespace: "lifecycle.link" });
  return linkPage({ locale, title: t(`${state}Title`), body: t(`${state}Body`), home: t("home"), status: state === "invalid" ? 404 : 503 });
}

/** The columns reminderContent reads a row by. */
const COLUMNS = "id, owner_user_id, kind, title, day, data, reminded_for";

/**
 * The title as the page quotes it, named the way the day-before email names it (reminderContent): the
 * title it was saved with, or for a trip, saved without one on purpose, the trip's own name in the
 * reader's language. Only a date saved with no name, or a trip we no longer have, says what it is.
 */
async function titleOf(row: Parameters<typeof reminderContent>[0] | null | undefined, locale: L) {
  const named = row ? reminderContent(row, locale).title : null;
  if (named) return named;
  const t = await getTranslations({ locale, namespace: "savedDates" });
  return row?.kind === "trip" ? t("card.trip") : t("save.defaultTitle");
}

export async function GET(request: NextRequest) {
  const locale = localeOf(request.nextUrl.searchParams.get("l"));
  const found = await resolve(request);
  if (found.state !== "ok") return problem(found.state, locale);
  const { data, error } = await found.db.from("saved_dates").select(COLUMNS).eq("id", found.id).maybeSingle();
  if (error) return problem("unavailable", locale);
  if (!data) return problem("invalid", locale);
  const [t, tl] = await Promise.all([getTranslations({ locale, namespace: "savedDates.remindOff" }), getTranslations({ locale, namespace: "lifecycle.link" })]);
  return linkPage({
    locale,
    title: t("title"),
    body: t("body", { title: await titleOf(data, locale) }),
    confirm: { label: t("confirm"), action: `${request.nextUrl.pathname}${request.nextUrl.search}` },
    home: tl("home"),
  });
}

export async function POST(request: NextRequest) {
  const locale = localeOf(request.nextUrl.searchParams.get("l"));
  const found = await resolve(request);
  if (found.state !== "ok") return problem(found.state, locale);
  const { data, error } = await found.db.from("saved_dates").update({ remind: false }).eq("id", found.id).select(COLUMNS).maybeSingle();
  if (error) return problem("unavailable", locale);
  // A date deleted since the email went is as good as turned off: nothing more will be sent for it.
  const [t, tl] = await Promise.all([getTranslations({ locale, namespace: "savedDates.remindOff" }), getTranslations({ locale, namespace: "lifecycle.link" })]);
  return linkPage({ locale, title: t("done"), body: t("doneBody", { title: await titleOf(data, locale) }), home: tl("home") });
}
