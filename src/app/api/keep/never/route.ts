import type { NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { linkSecret, verifyToken } from "@/lib/lifecycle/links";
import { linkPage } from "@/lib/email/link-page";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * "Never email me", in a kept gift's confirmation, for an address someone else typed in: it goes on
 * the unsubscribe list (which no keep request gets past, lib/keep/store.ts, and which leaves the
 * offers out of every other email), and every keep for it is deleted, with its reminders. The link
 * names the address by its hash, which is all the list keeps. GET asks, POST acts; the POST is also
 * the one-click unsubscribe a mail app offers.
 */

type L = "en" | "es";
const localeOf = (v: string | null | undefined): L => (v === "es" ? "es" : "en");

async function resolve(request: NextRequest) {
  const secret = linkSecret();
  const admin = getSupabaseAdminClient();
  if (!secret || !admin) return { state: "unavailable" as const };
  if (!(await rateLimit(`keep-never:${clientIp(request.headers)}`, { limit: 30, windowSeconds: 60 }))) return { state: "unavailable" as const };
  const key = await verifyToken("keep-never", request.nextUrl.searchParams.get("t"), secret);
  if (!key) return { state: "invalid" as const };
  return { state: "ok" as const, key, db: admin };
}

async function problem(state: "invalid" | "unavailable", locale: L) {
  const t = await getTranslations({ locale, namespace: "lifecycle.link" });
  return linkPage({ locale, title: t(`${state}Title`), body: t(`${state}Body`), home: t("home"), status: state === "invalid" ? 404 : 503 });
}

export async function GET(request: NextRequest) {
  const locale = localeOf(request.nextUrl.searchParams.get("l"));
  const found = await resolve(request);
  if (found.state !== "ok") return problem(found.state, locale);
  const t = await getTranslations({ locale, namespace: "lifecycle" });
  return linkPage({
    locale,
    title: t("keep.neverTitle"),
    body: t("keep.neverBody"),
    confirm: { label: t("keep.neverConfirm"), action: `${request.nextUrl.pathname}${request.nextUrl.search}` },
    home: t("link.home"),
  });
}

export async function POST(request: NextRequest) {
  const locale = localeOf(request.nextUrl.searchParams.get("l"));
  const found = await resolve(request);
  if (found.state !== "ok") return problem(found.state, locale);
  const { error } = await found.db.from("email_optouts").upsert({ email_sha256: found.key }, { onConflict: "email_sha256", ignoreDuplicates: true });
  if (error) return problem("unavailable", locale);
  const { error: keepsError } = await found.db.from("gift_keeps").delete().eq("email_sha256", found.key);
  if (keepsError) return problem("unavailable", locale);
  const t = await getTranslations({ locale, namespace: "lifecycle" });
  return linkPage({ locale, title: t("keep.neverDoneTitle"), body: t("keep.neverDoneBody"), home: t("link.home") });
}
