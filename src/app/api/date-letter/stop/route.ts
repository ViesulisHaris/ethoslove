import { NextResponse, type NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { linkSecret, verifyToken } from "@/lib/lifecycle/links";
import { linkPage } from "@/lib/email/link-page";
import { dateLetterOn } from "@/lib/lifecycle/date-letter-flag";
import { stopLetter } from "@/lib/lifecycle/date-letter-store";
import { letterEvent, letterToken } from "@/lib/lifecycle/date-letter-events";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * "Stop these emails", from any date letter, and "never email this address" from the confirming
 * e-mail. No sign-in: the signed link is the permission, and it names the row. GET asks, POST acts (a
 * GET never acts: mail scanners open links; lib/email/link-page.ts); the POST is also what a mail
 * app's own unsubscribe button sends (List-Unsubscribe), which is the one tap. A confirmed address is
 * stopped at once; one never confirmed is deleted and put on the unsubscribe list. Switched off, a
 * bare 404.
 */

type L = "en" | "es";
const localeOf = (v: string | null | undefined): L => (v === "es" ? "es" : "en");
const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 });

async function resolve(request: NextRequest, token: string | null) {
  const secret = linkSecret();
  const admin = getSupabaseAdminClient();
  if (!secret || !admin) return { state: "unavailable" as const };
  // The token first, and the limits after it: a mail provider's one-click unsubscribe comes from a few
  // of its own servers for everyone at once, so a limit per connection would leave the 31st person in
  // a minute subscribed (monthly-D9). Only bad links count against a connection; a good one is limited
  // per row, which is all a repeat of it can touch.
  const id = await verifyToken("date-letter-stop", token, secret);
  if (!id) {
    if (!(await rateLimit(`date-letter-stop-bad:${clientIp(request.headers)}`, { limit: 30, windowSeconds: 60 }))) return { state: "unavailable" as const };
    return { state: "invalid" as const };
  }
  if (!(await rateLimit(`date-letter-stop:${id}`, { limit: 30, windowSeconds: 60 }))) return { state: "unavailable" as const };
  return { state: "ok" as const, id, db: admin };
}

async function page(locale: L, which: "stopped" | "notMe") {
  const t = await getTranslations({ locale, namespace: "lifecycle" });
  return which === "notMe"
    ? linkPage({ locale, title: t("letter.notMeDoneTitle"), body: t("letter.notMeDoneBody"), home: t("link.home") })
    : linkPage({ locale, title: t("letter.stopDoneTitle"), body: t("letter.stopDoneBody"), home: t("link.home") });
}

async function problem(state: "invalid" | "unavailable", locale: L) {
  const t = await getTranslations({ locale, namespace: "lifecycle.link" });
  return linkPage({ locale, title: t(`${state}Title`), body: t(`${state}Body`), home: t("home"), status: state === "invalid" ? 404 : 503 });
}

export async function GET(request: NextRequest) {
  if (!dateLetterOn()) return notFound();
  const asked = localeOf(request.nextUrl.searchParams.get("l"));
  const { token } = await letterToken(request);
  const found = await resolve(request, token);
  if (found.state !== "ok") return problem(found.state, asked);
  const { data, error } = await found.db.from("date_letter").select("confirmed_at, stopped_at, locale").eq("id", found.id).maybeSingle();
  if (error) return problem("unavailable", asked);
  // No row, or already stopped, reads as stopped: that is what the link is for.
  if (!data || data.stopped_at) return page(data ? localeOf(data.locale) : asked, "stopped");
  const locale = localeOf(data.locale);
  const t = await getTranslations({ locale, namespace: "lifecycle" });
  const notMe = !data.confirmed_at;
  return linkPage({
    locale,
    title: t(notMe ? "letter.notMeTitle" : "letter.stopTitle"),
    body: t(notMe ? "letter.notMeBody" : "letter.stopBody"),
    // The token in a hidden field, as on the confirming page; a mail app's one-click POSTs to the
    // e-mail's own address, token included, and is answered all the same.
    confirm: { label: t(notMe ? "letter.notMeConfirm" : "letter.stopConfirm"), action: `${request.nextUrl.pathname}?l=${locale}`, fields: { t: token! } },
    home: t("link.home"),
  });
}

export async function POST(request: NextRequest) {
  if (!dateLetterOn()) return notFound();
  const asked = localeOf(request.nextUrl.searchParams.get("l"));
  const { token, fromPage } = await letterToken(request);
  const found = await resolve(request, token);
  if (found.state !== "ok") return problem(found.state, asked);
  const done = await stopLetter(found.db, found.id, Date.now()).catch(() => null);
  if (!done) return problem("unavailable", asked);
  if (done.result === "stopped" && fromPage) await letterEvent("letter_stopped", request);
  return page(done.result === "gone" ? asked : done.locale, done.result === "not_me" ? "notMe" : "stopped");
}
