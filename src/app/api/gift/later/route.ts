import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/get-user";
import { isConfigured } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { emailKey, linkSecret } from "@/lib/lifecycle/links";
import { EMAIL_SHAPE, LATER_LINK_SECONDS, sealLater } from "@/lib/lifecycle/later-link";
import { emailMeGiftOn } from "@/lib/lifecycle/later-flag";
import { sendSavedGift } from "@/lib/email/notify";
import { siteUrl } from "@/lib/email/urls";
import { getManifest } from "@/templates/manifests";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * POST /api/gift/later { email, slug, locale }: "Email me this gift", for a guest on the send screen
 * who isn't ready to pay or send (components/editor/email-me-gift.tsx). Sends that address one email
 * with a link back to the template's editor. Nothing of the gift comes here (a guest's gift lives
 * on their device) and nothing is stored: the link carries the address, sealed
 * (lib/lifecycle/later-link.ts), and an account is made only when it is opened (./open).
 *
 * It answers the same whether or not an email went, so the form can't be used to learn anything
 * about an address. Few to an address and few from a connection: somebody else may be typing it.
 */
const input = z.object({ email: z.string().trim().toLowerCase().max(254).regex(EMAIL_SHAPE), slug: z.string().max(60), locale: z.enum(["en", "es"]).default("en") });

export async function POST(request: NextRequest) {
  if (!emailMeGiftOn()) return NextResponse.json({ error: "unavailable" }, { status: 404 });
  const secret = linkSecret();
  if (!isConfigured.resend || !isConfigured.supabase || !secret) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  // A signed-in sender's gift is already in their account: this is for guests.
  if (await getCurrentUser()) return NextResponse.json({ error: "signed_in" }, { status: 409 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const { email, slug, locale } = parsed.data;
  if (!getManifest(slug)) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  if (!(await rateLimit(`gift-later:${clientIp(request.headers)}`, { limit: 5, windowSeconds: 3600 }))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  // Per address, by its hash: the limiter's store has no business holding email addresses.
  if (!(await rateLimit(`gift-later-to:${await emailKey(email)}`, { limit: 2, windowSeconds: 86_400 }))) return NextResponse.json({ ok: true });

  const until = Math.floor(Date.now() / 1000) + LATER_LINK_SECONDS;
  const url = `${siteUrl()}/api/gift/later/open?t=${await sealLater({ email, slug, until }, secret)}${locale === "es" ? "&l=es" : ""}`;
  const sent = await sendSavedGift({ to: email, locale, url, templateSlug: slug });
  if (!sent) console.info("[gift-later] nothing sent (opted out, or the email service refused)");
  return NextResponse.json({ ok: true });
}
