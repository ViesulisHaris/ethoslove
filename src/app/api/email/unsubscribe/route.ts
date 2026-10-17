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
 * "Unsubscribe" from the optional emails: the checkout reminder, and the offers inside other emails
 * (the "Everything for the difference" line on a receipt, the "next gift" link in the first-open
 * email; lib/email/notify.ts leaves them out for an address on the list). The signed link names the
 * address by its hash, which is all the opt-out list keeps. GET asks, POST acts, as for
 * reminders; the POST is also the mail app's one-click unsubscribe.
 */

type L = "en" | "es";

async function page(locale: L, kind: "ask" | "done" | "invalid" | "unavailable", action?: string) {
  const t = await getTranslations({ locale, namespace: "lifecycle" });
  if (kind === "invalid" || kind === "unavailable")
    return linkPage({ locale, title: t(`link.${kind}Title`), body: t(`link.${kind}Body`), home: t("link.home"), status: kind === "invalid" ? 404 : 503 });
  if (kind === "done") return linkPage({ locale, title: t("unsubscribe.doneTitle"), body: t("unsubscribe.doneBody"), home: t("link.home") });
  return linkPage({ locale, title: t("unsubscribe.title"), body: t("unsubscribe.body"), confirm: action ? { label: t("unsubscribe.confirm"), action } : undefined, home: t("link.home") });
}

async function resolve(request: NextRequest): Promise<{ state: "ok"; key: string } | { state: "invalid" | "unavailable" }> {
  const secret = linkSecret();
  if (!secret) return { state: "unavailable" };
  if (!(await rateLimit(`unsubscribe:${clientIp(request.headers)}`, { limit: 30, windowSeconds: 60 }))) return { state: "unavailable" };
  const key = await verifyToken("email-optout", request.nextUrl.searchParams.get("t"), secret);
  return key ? { state: "ok", key } : { state: "invalid" };
}

export async function GET(request: NextRequest) {
  const locale: L = request.nextUrl.searchParams.get("l") === "es" ? "es" : "en";
  const found = await resolve(request);
  if (found.state !== "ok") return page(locale, found.state);
  return page(locale, "ask", `${request.nextUrl.pathname}${request.nextUrl.search}`);
}

export async function POST(request: NextRequest) {
  const locale: L = request.nextUrl.searchParams.get("l") === "es" ? "es" : "en";
  const found = await resolve(request);
  if (found.state !== "ok") return page(locale, found.state);
  const admin = getSupabaseAdminClient();
  if (!admin) return page(locale, "unavailable");
  const { error } = await admin.from("email_optouts").upsert({ email_sha256: found.key }, { onConflict: "email_sha256", ignoreDuplicates: true });
  if (error) return page(locale, "unavailable");
  return page(locale, "done");
}
