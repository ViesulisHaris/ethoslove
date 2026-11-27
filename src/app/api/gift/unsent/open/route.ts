import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-user";
import { linkSecret, verifyToken } from "@/lib/lifecycle/links";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { isPageNavigation } from "@/lib/auth/navigation";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * GET /api/gift/unsent/open?t=<token>&l=es: "Finish and send" in the email about a gift left unsent
 * (lib/lifecycle/unsent-gift.ts). Opens that draft in the editor, signed in to the account it is
 * in: the email went to that account's address, so whoever opens it can sign in to it anyway. The
 * sign-in is made at the tap, not when the email was sent, as the publish reminder's is. After the
 * token's time, for a gift that has since been sent or deleted, or for anything that doesn't add
 * up, it asks them to sign in, or opens their gifts.
 */
export async function GET(request: NextRequest) {
  // A sign-in for whoever opens it: only when a page is opened, never as an image inside a gift.
  if (!isPageNavigation(request.headers)) return new NextResponse(null, { status: 400 });
  const url = new URL(request.url);
  const lang = url.searchParams.get("l") === "es" ? "/es" : "";
  const to = (path: string) => NextResponse.redirect(new URL(path, url.origin));
  const signIn = (next: string) => to(`${lang}/login?next=${encodeURIComponent(next)}`);

  const secret = linkSecret();
  const value = secret ? await verifyToken("unsent-open", url.searchParams.get("t"), secret) : null;
  const admin = getSupabaseAdminClient();
  if (!value || !admin) return to(`${lang}/dashboard`);
  const [giftId, until] = value.split(":");
  const { data: gift } = await admin.from("gifts").select("user_id, template_slug, status").eq("id", giftId).maybeSingle();
  // Deleted since (they did it, or its week ran out): their gifts, where a new one starts.
  if (!gift) return to(`${lang}/dashboard`);
  const next = `${lang}/create/${gift.template_slug}?gift=${giftId}`;

  const user = await getCurrentUser();
  if (user?.id === gift.user_id) return to(next);
  // Sent since, or the link's time is up: no sign-in is handed out for it any more.
  if (gift.status !== "draft" || Number(until) * 1000 < Date.now()) return signIn(next);
  if (!(await rateLimit(`unsent-open:${clientIp(request.headers)}`, { limit: 30, windowSeconds: 600 }))) return signIn(next);
  const { data: profile } = await admin.from("profiles").select("email").eq("id", gift.user_id).maybeSingle();
  if (!profile?.email) return signIn(next);
  const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: profile.email });
  const tokenHash = link?.properties?.hashed_token;
  if (error || !tokenHash) return signIn(next);
  // The same one-time sign-in the publish reminder hands its reader (auth/confirm).
  return to(`/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=${encodeURIComponent(next)}`);
}
