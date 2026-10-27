import type { NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { linkSecret, verifyToken } from "@/lib/lifecycle/links";
import { linkPage } from "@/lib/email/link-page";
import { stopKeep } from "@/lib/keep/store";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * "Unsubscribe", in the gift's link email and every reminder a kept gift brings: the keep goes, with
 * its address and all its reminders. GET asks, POST acts; the POST is also a mail app's one-click
 * unsubscribe (List-Unsubscribe). Already gone reads as done, which is what the link is for.
 */

type L = "en" | "es";
const localeOf = (v: string | null | undefined): L => (v === "es" ? "es" : "en");

async function resolve(request: NextRequest) {
  const secret = linkSecret();
  const admin = getSupabaseAdminClient();
  if (!secret || !admin) return { state: "unavailable" as const };
  if (!(await rateLimit(`keep-stop:${clientIp(request.headers)}`, { limit: 30, windowSeconds: 60 }))) return { state: "unavailable" as const };
  const id = await verifyToken("keep-stop", request.nextUrl.searchParams.get("t"), secret);
  if (!id) return { state: "invalid" as const };
  return { state: "ok" as const, id, db: admin };
}

async function problem(state: "invalid" | "unavailable", locale: L) {
  const t = await getTranslations({ locale, namespace: "lifecycle.link" });
  return linkPage({ locale, title: t(`${state}Title`), body: t(`${state}Body`), home: t("home"), status: state === "invalid" ? 404 : 503 });
}

async function done(locale: L) {
  const t = await getTranslations({ locale, namespace: "lifecycle" });
  return linkPage({ locale, title: t("keep.stopDoneTitle"), body: t("keep.stopDoneBody"), home: t("link.home") });
}

export async function GET(request: NextRequest) {
  const asked = localeOf(request.nextUrl.searchParams.get("l"));
  const found = await resolve(request);
  if (found.state !== "ok") return problem(found.state, asked);
  const { data, error } = await found.db.from("gift_keeps").select("locale").eq("id", found.id).maybeSingle();
  if (error) return problem("unavailable", asked);
  if (!data) return done(asked);
  const locale = localeOf(data.locale);
  const t = await getTranslations({ locale, namespace: "lifecycle" });
  return linkPage({
    locale,
    title: t("keep.stopTitle"),
    body: t("keep.stopBody"),
    confirm: { label: t("keep.stopConfirm"), action: `${request.nextUrl.pathname}${request.nextUrl.search}` },
    home: t("link.home"),
  });
}

export async function POST(request: NextRequest) {
  const asked = localeOf(request.nextUrl.searchParams.get("l"));
  const found = await resolve(request);
  if (found.state !== "ok") return problem(found.state, asked);
  const locale = await stopKeep(found.db, found.id).catch(() => undefined);
  if (locale === undefined) return problem("unavailable", asked);
  return done(locale ?? asked);
}
