import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-user";
import { linkSecret, verifyToken } from "@/lib/lifecycle/links";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { isPageNavigation } from "@/lib/auth/navigation";
import { suggestTemplate } from "@/lib/lifecycle/suggest";
import { lastGiftFor } from "@/lib/lifecycle/last-gift";
import { START_COOKIE, START_COOKIE_SECONDS, START_PARAM, startRefValue, type StartRef } from "@/lib/editor/start-ref";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * GET /api/reminders/open?t=<token>&s=<stage>&l=es[&to=templates]: "Open my gift" in the e-mails
 * before a day (lib/lifecycle/reminder-job.ts). Opens the suggested template's editor with a new gift
 * started from the account's last gift for that person (its names and photos, put together in the
 * reader's own browser: lib/editor/start-from-gift.ts), or with the name alone when no gift was made
 * for them; `to=templates` opens the gallery instead, and a cookie keeps the start for whichever
 * gift they pick there.
 *
 * Signed in to the reminder's account, as the publish reminder's link is (api/checkout/finish): the
 * e-mail went to that account's address. The sign-in is made at the tap, never when the e-mail is
 * sent, is rate-limited, and only until the end of the day after the occasion (the token's time).
 * After that, or for anything that doesn't add up, it asks them to sign in, and on to the gift after.
 */
export async function GET(request: NextRequest) {
  // A sign-in for whoever opens it: only when a page is opened, never as an image inside a gift.
  if (!isPageNavigation(request.headers)) return new NextResponse(null, { status: 400 });
  const url = new URL(request.url);
  const lang = url.searchParams.get("l") === "es" ? "/es" : "";
  const to = (path: string) => NextResponse.redirect(new URL(path, url.origin));

  const secret = linkSecret();
  const value = secret ? await verifyToken("reminder-open", url.searchParams.get("t"), secret) : null;
  const admin = getSupabaseAdminClient();
  if (!value || !admin) return to(`${lang}/dashboard`);
  const [reminderId, until] = value.split(":");
  const { data: reminder } = await admin.from("reminders").select("user_id, recipient_name, occasion, template_slug").eq("id", reminderId).maybeSingle();
  if (!reminder) return to(`${lang}/dashboard`);

  const stage = /^[123]$/.test(url.searchParams.get("s") ?? "") ? url.searchParams.get("s") : "1";
  const ref = `email-reminder-${stage}`;
  const gift = await lastGiftFor(admin, reminder.user_id, reminder.recipient_name);
  const start: StartRef = gift ? { kind: "gift", id: gift.id } : { kind: "reminder", id: reminderId };
  const next =
    url.searchParams.get("to") === "templates"
      ? `${lang}/templates?ref=${ref}`
      : `${lang}/create/${suggestTemplate(reminder.occasion, { avoid: reminder.template_slug }).slug}?${START_PARAM}=${startRefValue(start)}&ref=${ref}`;
  // Kept for the gallery's way round: whichever gift they pick starts from the same names and photos.
  const withStart = (response: NextResponse) => {
    response.cookies.set(START_COOKIE, startRefValue(start), { maxAge: START_COOKIE_SECONDS, sameSite: "lax", path: "/", httpOnly: false, secure: process.env.NODE_ENV === "production" });
    return response;
  };
  const signIn = () => withStart(to(`${lang}/login?next=${encodeURIComponent(next)}`));

  const user = await getCurrentUser();
  if (user?.id === reminder.user_id) return withStart(to(next));
  if (Number(until) * 1000 < Date.now()) return signIn();
  if (!(await rateLimit(`reminder-open:${clientIp(request.headers)}`, { limit: 30, windowSeconds: 600 }))) return signIn();
  const { data: profile } = await admin.from("profiles").select("email").eq("id", reminder.user_id).maybeSingle();
  if (!profile?.email) return signIn();
  const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: profile.email });
  const tokenHash = link?.properties?.hashed_token;
  if (error || !tokenHash) return signIn();
  // The same one-time sign-in the publish reminder hands its reader (auth/confirm).
  return withStart(to(`/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=${encodeURIComponent(next)}`));
}
