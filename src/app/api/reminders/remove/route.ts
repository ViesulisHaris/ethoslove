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
 * "Remove this reminder", from the reminder email: no sign-in, the signed link is the permission.
 * GET asks, POST removes (see lib/email/link-page.ts for why a GET never acts). The POST is also
 * what a mail app's own unsubscribe button sends, through the email's List-Unsubscribe header.
 */

type L = "en" | "es";
const localeOf = (v: string | null | undefined): L => (v === "es" ? "es" : "en");

async function resolve(request: NextRequest) {
  const secret = linkSecret();
  const admin = getSupabaseAdminClient();
  if (!secret || !admin) return { state: "unavailable" as const };
  if (!(await rateLimit(`reminder-remove:${clientIp(request.headers)}`, { limit: 30, windowSeconds: 60 }))) return { state: "unavailable" as const };
  const id = await verifyToken("reminder-remove", request.nextUrl.searchParams.get("t"), secret);
  if (!id) return { state: "invalid" as const };
  return { state: "ok" as const, id, db: admin };
}

async function problem(state: "invalid" | "unavailable", locale: L) {
  const t = await getTranslations({ locale, namespace: "lifecycle.link" });
  return linkPage({ locale, title: t(`${state}Title`), body: t(`${state}Body`), home: t("home"), status: state === "invalid" ? 404 : 503 });
}

export async function GET(request: NextRequest) {
  const asked = localeOf(request.nextUrl.searchParams.get("l"));
  const found = await resolve(request);
  if (found.state !== "ok") return problem(found.state, asked);
  const { data, error } = await found.db.from("reminders").select("recipient_name, locale").eq("id", found.id).maybeSingle();
  if (error) return problem("unavailable", asked);
  if (!data) return problem("invalid", asked);
  const locale = localeOf(data.locale);
  const t = await getTranslations({ locale, namespace: "lifecycle" });
  return linkPage({
    locale,
    title: t("remove.title"),
    body: t("remove.body", { name: data.recipient_name }),
    confirm: { label: t("remove.confirm"), action: `${request.nextUrl.pathname}${request.nextUrl.search}` },
    home: t("link.home"),
  });
}

export async function POST(request: NextRequest) {
  const asked = localeOf(request.nextUrl.searchParams.get("l"));
  const found = await resolve(request);
  if (found.state !== "ok") return problem(found.state, asked);
  const { data, error } = await found.db.from("reminders").delete().eq("id", found.id).select("locale").maybeSingle();
  if (error) return problem("unavailable", asked);
  // Already gone reads the same as just removed: the person wanted it gone, and it is.
  const locale = data ? localeOf(data.locale) : asked;
  const t = await getTranslations({ locale, namespace: "lifecycle" });
  return linkPage({ locale, title: t("remove.doneTitle"), body: t("remove.doneBody"), home: t("link.home") });
}
