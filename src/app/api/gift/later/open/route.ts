import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-user";
import { linkSecret } from "@/lib/lifecycle/links";
import { openLater } from "@/lib/lifecycle/later-link";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { isPageNavigation } from "@/lib/auth/navigation";
import { findOrCreateUser } from "@/lib/stripe/fulfil";
import { getManifest } from "@/templates/manifests";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * GET /api/gift/later/open?t=<sealed>&l=es: "Open my gift" in the email a guest asked for on the
 * send screen (../route.ts). Opens the template's editor, where this device still holds their gift,
 * signed in to an account with the address the email went to: made now if there is none, so the
 * editor saves the gift to it from here on. Whoever opens the email could sign in to that address
 * anyway. The sign-in is made at the tap, not when the email was sent, as the publish reminder's is.
 *
 * After the link's time, or when anything doesn't add up, the editor opens without a sign-in: the
 * gift is on the device either way.
 */
export async function GET(request: NextRequest) {
  // A sign-in for whoever opens it: only when a page is opened, never as an image inside a gift.
  if (!isPageNavigation(request.headers)) return new NextResponse(null, { status: 400 });
  const url = new URL(request.url);
  const locale = url.searchParams.get("l") === "es" ? "es" : "en";
  const lang = locale === "es" ? "/es" : "";
  const to = (path: string) => NextResponse.redirect(new URL(path, url.origin));

  const secret = linkSecret();
  const link = secret ? await openLater(url.searchParams.get("t"), secret) : null;
  if (!link || !getManifest(link.slug)) return to(`${lang}/templates`);
  const next = `${lang}/create/${link.slug}`;

  const admin = getSupabaseAdminClient();
  const user = await getCurrentUser();
  // Signed in already (to this address or another): the editor saves the gift to that account.
  if (user || !admin) return to(next);
  if (link.until * 1000 < Date.now()) return to(next);
  if (!(await rateLimit(`gift-later-open:${clientIp(request.headers)}`, { limit: 30, windowSeconds: 600 }))) return to(next);
  try {
    await findOrCreateUser(admin, link.email, locale, `later:${link.slug}`);
  } catch {
    return to(next);
  }
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: link.email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) return to(next);
  // The same one-time sign-in the publish reminder hands its reader (auth/confirm), which also
  // sends the welcome email to an account made just now.
  return to(`/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=${encodeURIComponent(next)}`);
}
