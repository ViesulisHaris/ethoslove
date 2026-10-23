import type { NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { linkSecret, verifyToken } from "@/lib/lifecycle/links";
import { linkPage } from "@/lib/email/link-page";
import { cleanRequests, joinDe, keptDays } from "@/lib/keep/keep";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * "Remove this reminder", in a keeper's reminder email: that one day goes, and the gift's other days
 * stay. GET asks, POST removes; the POST is also the mail app's one-click unsubscribe for that email.
 */

type L = "en" | "es";
const localeOf = (v: string | null | undefined): L => (v === "es" ? "es" : "en");

async function resolve(request: NextRequest) {
  const secret = linkSecret();
  const admin = getSupabaseAdminClient();
  if (!secret || !admin) return { state: "unavailable" as const };
  if (!(await rateLimit(`keep-reminder-off:${clientIp(request.headers)}`, { limit: 30, windowSeconds: 60 }))) return { state: "unavailable" as const };
  const id = await verifyToken("keep-reminder-off", request.nextUrl.searchParams.get("t"), secret);
  if (!id) return { state: "invalid" as const };
  return { state: "ok" as const, id, db: admin };
}

async function problem(state: "invalid" | "unavailable", locale: L) {
  const t = await getTranslations({ locale, namespace: "lifecycle.link" });
  return linkPage({ locale, title: t(`${state}Title`), body: t(`${state}Body`), home: t("home"), status: state === "invalid" ? 404 : 503 });
}

/** The reminder and the day in words ("Leo's birthday"), or null when it's already gone. */
async function find(db: NonNullable<ReturnType<typeof getSupabaseAdminClient>>, id: string, fallback: L) {
  const { data, error } = await db.from("keep_reminders").select("name, occasion, month, day, keep_id").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: keep } = await db.from("gift_keeps").select("locale").eq("id", data.keep_id).maybeSingle();
  const locale = keep ? localeOf(keep.locale) : fallback;
  const [day] = keptDays(cleanRequests([data]), locale, { named: true });
  return { locale, day: day?.label ?? data.name };
}

export async function GET(request: NextRequest) {
  const asked = localeOf(request.nextUrl.searchParams.get("l"));
  const found = await resolve(request);
  if (found.state !== "ok") return problem(found.state, asked);
  const reminder = await find(found.db, found.id, asked).catch(() => undefined);
  if (reminder === undefined) return problem("unavailable", asked);
  const locale = reminder?.locale ?? asked;
  const t = await getTranslations({ locale, namespace: "lifecycle" });
  if (!reminder) return linkPage({ locale, title: t("keep.reminderOffDoneTitle"), body: t("keep.reminderOffGoneBody"), home: t("link.home") });
  return linkPage({
    locale,
    title: t("keep.reminderOffTitle"),
    body: joinDe(t("keep.reminderOffBody", { day: reminder.day })),
    confirm: { label: t("keep.reminderOffConfirm"), action: `${request.nextUrl.pathname}${request.nextUrl.search}` },
    home: t("link.home"),
  });
}

export async function POST(request: NextRequest) {
  const asked = localeOf(request.nextUrl.searchParams.get("l"));
  const found = await resolve(request);
  if (found.state !== "ok") return problem(found.state, asked);
  const reminder = await find(found.db, found.id, asked).catch(() => undefined);
  if (reminder === undefined) return problem("unavailable", asked);
  const locale = reminder?.locale ?? asked;
  const t = await getTranslations({ locale, namespace: "lifecycle" });
  if (reminder) {
    const { error } = await found.db.from("keep_reminders").delete().eq("id", found.id);
    if (error) return problem("unavailable", locale);
  }
  return linkPage({
    locale,
    title: t("keep.reminderOffDoneTitle"),
    body: reminder ? joinDe(t("keep.reminderOffDoneBody", { day: reminder.day })) : t("keep.reminderOffGoneBody"),
    home: t("link.home"),
  });
}
