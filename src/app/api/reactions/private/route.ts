import type { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getTranslations } from "next-intl/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { linkSecret, verifyToken } from "@/lib/lifecycle/links";
import { linkPage } from "@/lib/email/link-page";
import { REACTIONS_TAG } from "@/lib/proof/proof";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * "Keep it private", in the email telling a sender that the recipient agreed Ethos may show their
 * reaction: the sender says no, and it's never shown (lib/proof reads only reactions without
 * sender_withheld_at), approved or not, and if it already is, it's gone on the next visit: the
 * reactions' cache and /gifts are cleared at once. No sign-in: the signed link is the permission.
 * GET asks, POST acts. Saying no again is fine; there's no link to undo it.
 */

type L = "en" | "es";
const localeOf = (v: string | null | undefined): L => (v === "es" ? "es" : "en");

async function resolve(request: NextRequest) {
  const secret = linkSecret();
  const admin = getSupabaseAdminClient();
  if (!secret || !admin) return { state: "unavailable" as const };
  if (!(await rateLimit(`reaction-private:${clientIp(request.headers)}`, { limit: 30, windowSeconds: 60 }))) return { state: "unavailable" as const };
  const id = await verifyToken("reaction-private", request.nextUrl.searchParams.get("t"), secret);
  if (!id) return { state: "invalid" as const };
  return { state: "ok" as const, id, db: admin };
}

async function page(locale: L, kind: "ask" | "done" | "invalid" | "unavailable", action?: string) {
  const t = await getTranslations({ locale, namespace: "lifecycle" });
  if (kind === "invalid" || kind === "unavailable")
    return linkPage({ locale, title: t(`link.${kind}Title`), body: t(`link.${kind}Body`), home: t("link.home"), status: kind === "invalid" ? 404 : 503 });
  if (kind === "done") return linkPage({ locale, title: t("reactionPrivate.doneTitle"), body: t("reactionPrivate.doneBody"), home: t("link.home") });
  return linkPage({ locale, title: t("reactionPrivate.title"), body: t("reactionPrivate.body"), confirm: action ? { label: t("reactionPrivate.confirm"), action } : undefined, home: t("link.home") });
}

export async function GET(request: NextRequest) {
  const locale = localeOf(request.nextUrl.searchParams.get("l"));
  const found = await resolve(request);
  if (found.state !== "ok") return page(locale, found.state);
  const { data, error } = await found.db.from("reactions").select("sender_withheld_at").eq("id", found.id).maybeSingle();
  if (error) return page(locale, "unavailable");
  // Gone with its gift, or already kept private: either way it's never shown.
  if (!data || data.sender_withheld_at) return page(locale, "done");
  return page(locale, "ask", `${request.nextUrl.pathname}${request.nextUrl.search}`);
}

export async function POST(request: NextRequest) {
  const locale = localeOf(request.nextUrl.searchParams.get("l"));
  const found = await resolve(request);
  if (found.state !== "ok") return page(locale, found.state);
  const { error } = await found.db.from("reactions").update({ sender_withheld_at: new Date().toISOString() }).eq("id", found.id).is("sender_withheld_at", null);
  if (error) return page(locale, "unavailable");
  try {
    // Never served stale: the next visit reads afresh, with this reaction left out.
    revalidateTag(REACTIONS_TAG, { expire: 0 });
    revalidatePath("/[currency]/[locale]/gifts", "page");
  } catch (e) {
    console.error("[reactions] couldn't clear the cache", (e as Error).message);
  }
  return page(locale, "done");
}
