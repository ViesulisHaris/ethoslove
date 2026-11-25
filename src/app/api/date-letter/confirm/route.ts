import { NextResponse, type NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { linkSecret, verifyToken } from "@/lib/lifecycle/links";
import { linkPage } from "@/lib/email/link-page";
import { pageUrl } from "@/lib/email/urls";
import { dateLetterOn } from "@/lib/lifecycle/date-letter-flag";
import { LETTER_REF, letterSlot, letterWeek } from "@/lib/lifecycle/date-letter";
import { confirmLetter } from "@/lib/lifecycle/date-letter-store";
import { letterEntry } from "@/content/date-letter";
import { letterEvent, letterToken } from "@/lib/lifecycle/date-letter-events";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * "Yes, send me the date letter", from the confirming e-mail. GET asks (a mail scanner opening the
 * link does nothing: lib/email/link-page.ts), POST confirms. A row that is gone (never confirmed in
 * thirty days, or "not you"), or stopped since that e-mail went, has nothing to confirm. Switched
 * off, a bare 404.
 */

type L = "en" | "es";
const localeOf = (v: string | null | undefined): L => (v === "es" ? "es" : "en");
const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 });

async function resolve(request: NextRequest, token: string | null) {
  const secret = linkSecret();
  const admin = getSupabaseAdminClient();
  if (!secret || !admin) return { state: "unavailable" as const };
  if (!(await rateLimit(`date-letter-confirm:${clientIp(request.headers)}`, { limit: 30, windowSeconds: 60 }))) return { state: "unavailable" as const };
  const id = await verifyToken("date-letter-confirm", token, secret);
  if (!id) return { state: "invalid" as const };
  return { state: "ok" as const, id, db: admin };
}

async function problem(state: "invalid" | "unavailable" | "gone", locale: L) {
  const t = await getTranslations({ locale, namespace: "lifecycle" });
  if (state === "gone") return linkPage({ locale, title: t("letter.goneTitle"), body: t("letter.goneBody"), home: t("link.home") });
  return linkPage({ locale, title: t(`link.${state}Title`), body: t(`link.${state}Body`), home: t("link.home"), status: state === "invalid" ? 404 : 503 });
}

export async function GET(request: NextRequest) {
  if (!dateLetterOn()) return notFound();
  const asked = localeOf(request.nextUrl.searchParams.get("l"));
  const { token } = await letterToken(request);
  const found = await resolve(request, token);
  if (found.state !== "ok") return problem(found.state, asked);
  const { data, error } = await found.db.from("date_letter").select("locale").eq("id", found.id).maybeSingle();
  if (error) return problem("unavailable", asked);
  if (!data) return problem("gone", asked);
  const locale = localeOf(data.locale);
  const t = await getTranslations({ locale, namespace: "lifecycle" });
  return linkPage({
    locale,
    title: t("letter.confirmTitle"),
    body: t("letter.confirmBody"),
    // The token goes in a hidden field, so the address the button POSTs to holds none (it is what
    // the confirm event records: lib/lifecycle/date-letter-events.ts).
    confirm: { label: t("letter.confirmButton"), action: `${request.nextUrl.pathname}?l=${locale}`, fields: { t: token! } },
    home: t("link.home"),
  });
}

export async function POST(request: NextRequest) {
  if (!dateLetterOn()) return notFound();
  const asked = localeOf(request.nextUrl.searchParams.get("l"));
  const { token, fromPage } = await letterToken(request);
  const found = await resolve(request, token);
  if (found.state !== "ok") return problem(found.state, asked);
  const done = await confirmLetter(found.db, found.id, Date.now()).catch(() => null);
  if (!done) return problem("unavailable", asked);
  if (done.result === "gone") return problem("gone", done.locale === "en" ? asked : done.locale);
  if (done.result === "confirmed" && fromPage) await letterEvent("letter_confirmed", request);
  const t = await getTranslations({ locale: done.locale, namespace: "lifecycle" });
  // This week's idea, the same one the letter carries this week.
  const idea = letterEntry(letterSlot(letterWeek(new Date()))).idea;
  return linkPage({
    locale: done.locale,
    title: t("letter.doneTitle"),
    body: t("letter.doneBody"),
    next: { label: t("letter.doneNext"), href: pageUrl(done.locale, `/dates?idea=${idea}&ref=${LETTER_REF}`) },
    home: t("link.home"),
  });
}
