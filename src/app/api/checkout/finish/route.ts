import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-user";
import { linkSecret, verifyToken } from "@/lib/lifecycle/links";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { resumePath } from "@/components/pricing/offers";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * GET /api/checkout/finish?t=<token>&l=es: "Publish my gift" in the reminder for a gift paid for and
 * not published (lib/commerce/publish-reminders.ts). Opens the gift ready to publish, signed in to the
 * account the purchase is on: the email went to that account's address, so whoever opens it can
 * sign in to it anyway. The sign-in is made at the tap, not when the email was sent, so a link
 * scanner that opens it first spends nothing the reader needs. After the token's time, or for
 * anything that doesn't add up, it asks them to sign in, and on to the gift after.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const lang = url.searchParams.get("l") === "es" ? "/es" : "";
  const to = (path: string) => NextResponse.redirect(new URL(path, url.origin));
  const signIn = (next: string) => to(`${lang}/login?next=${encodeURIComponent(next)}`);

  const secret = linkSecret();
  const value = secret ? await verifyToken("publish-finish", url.searchParams.get("t"), secret) : null;
  const admin = getSupabaseAdminClient();
  if (!value || !admin) return to(`${lang}/dashboard`);
  const [purchaseId, until] = value.split(":");
  const { data: purchase } = await admin.from("purchases").select("user_id, status, template_slugs").eq("id", purchaseId).maybeSingle();
  const slug = purchase?.template_slugs[0];
  if (!purchase?.user_id || !slug) return to(`${lang}/dashboard`);
  const next = `${lang}${resumePath(slug)}`;

  const user = await getCurrentUser();
  if (user?.id === purchase.user_id) return to(next);
  if (purchase.status !== "paid" || Number(until) * 1000 < Date.now()) return signIn(next);
  if (!(await rateLimit(`checkout-finish:${clientIp(request.headers)}`, { limit: 30, windowSeconds: 600 }))) return signIn(next);
  const { data: profile } = await admin.from("profiles").select("email").eq("id", purchase.user_id).maybeSingle();
  if (!profile?.email) return signIn(next);
  const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: profile.email });
  const tokenHash = link?.properties?.hashed_token;
  if (error || !tokenHash) return signIn(next);
  // The same one-time sign-in the success page hands a guest (auth/confirm).
  return to(`/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=${encodeURIComponent(next)}`);
}
