import type { NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import type { Db } from "@/lib/commerce/db";
import { linkPage } from "@/lib/email/link-page";
import { groupGiftsEnabled } from "@/lib/group/flag";
import { sendSignedGiftEmails } from "@/lib/group/signed-email";
import { linkSecret, verifyToken } from "@/lib/lifecycle/links";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * "Yes, send it to me", from the confirmation someone who added a note to a group card is sent.
 * GET asks (a mail scanner opening the link does nothing: lib/email/link-page.ts), POST confirms
 * the address. The finished card then goes to it once: when the card is sent, or straight away if
 * it already has been. Nothing here names anybody: whoever holds the confirmation may not be who
 * wrote the note. A note that is gone (taken back, turned down, the card long sent) has nothing
 * left to confirm. 404 while group cards are switched off.
 */

type L = "en" | "es";
const localeOf = (v: string | null | undefined): L => (v === "es" ? "es" : "en");

async function resolve(request: NextRequest) {
  if (!groupGiftsEnabled()) return { state: "invalid" as const };
  const secret = linkSecret();
  const admin = getSupabaseAdminClient() as Db | null;
  if (!secret || !admin) return { state: "unavailable" as const };
  if (!(await rateLimit(`group-confirm:${clientIp(request.headers)}`, { limit: 30, windowSeconds: 60 }))) return { state: "unavailable" as const };
  const id = await verifyToken("group-confirm", request.nextUrl.searchParams.get("t"), secret);
  if (!id) return { state: "invalid" as const };
  return { state: "ok" as const, id, db: admin };
}

async function problem(state: "invalid" | "unavailable" | "gone", locale: L) {
  const t = await getTranslations({ locale, namespace: "lifecycle" });
  if (state === "gone") return linkPage({ locale, title: t("group.goneTitle"), body: t("group.goneBody"), home: t("link.home") });
  return linkPage({ locale, title: t(`link.${state}Title`), body: t(`link.${state}Body`), home: t("link.home"), status: state === "invalid" ? 404 : 503 });
}

/**
 * The note, with its group's language, if it still holds an address to confirm or its card has
 * already been sent to that address (`sent`: the address is deleted by then, so there is nothing
 * left to do but say so). Null when there is neither; undefined when the database could not say.
 */
async function waiting(db: Db, id: string) {
  const { data: entry, error } = await db.from("gift_contributions").select("id, group_id, email, email_confirmed_at, emailed_at").eq("id", id).maybeSingle();
  if (error) return undefined;
  if (!entry || (!entry.email && !entry.emailed_at)) return null;
  const { data: group } = await db.from("gift_groups").select("gift_id, locale").eq("id", entry.group_id).maybeSingle();
  return group ? { entry, sent: !entry.email, giftId: group.gift_id, locale: localeOf(group.locale) } : null;
}

async function done(locale: L) {
  const t = await getTranslations({ locale, namespace: "lifecycle" });
  return linkPage({ locale, title: t("group.doneTitle"), body: t("group.doneBody"), home: t("link.home") });
}

export async function GET(request: NextRequest) {
  const asked = localeOf(request.nextUrl.searchParams.get("l"));
  const found = await resolve(request);
  if (found.state !== "ok") return problem(found.state, asked);
  const note = await waiting(found.db, found.id);
  if (note === undefined) return problem("unavailable", asked);
  if (note === null) return problem("gone", asked);
  if (note.sent) return done(note.locale);
  const t = await getTranslations({ locale: note.locale, namespace: "lifecycle" });
  return linkPage({
    locale: note.locale,
    title: t("group.confirmTitle"),
    body: t("group.confirmBody"),
    confirm: { label: t("group.confirmButton"), action: `${request.nextUrl.pathname}${request.nextUrl.search}` },
    home: t("link.home"),
  });
}

export async function POST(request: NextRequest) {
  const asked = localeOf(request.nextUrl.searchParams.get("l"));
  const found = await resolve(request);
  if (found.state !== "ok") return problem(found.state, asked);
  const note = await waiting(found.db, found.id);
  if (note === undefined) return problem("unavailable", asked);
  if (note === null) return problem("gone", asked);
  if (note.sent) return done(note.locale);
  const now = Date.now();
  if (!note.entry.email_confirmed_at) {
    const { error } = await found.db.from("gift_contributions").update({ email_confirmed_at: new Date(now).toISOString() }).eq("id", note.entry.id).is("email_confirmed_at", null);
    if (error) return problem("unavailable", asked);
  }
  // A card that is already out sends it now; one still being made sends it when it goes.
  await sendSignedGiftEmails(found.db, note.giftId, now).catch(() => {});
  return done(note.locale);
}
