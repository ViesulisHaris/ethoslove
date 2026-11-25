import { NextResponse, type NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-user";
import { linkSecret, signToken } from "@/lib/lifecycle/links";
import { dateLetterOn } from "@/lib/lifecycle/date-letter-flag";
import { cleanPath } from "@/lib/lifecycle/date-letter";
import { askLetter, confirmNotSent, letterStateOf, letterTableThere } from "@/lib/lifecycle/date-letter-store";
import { sendLetterConfirm } from "@/lib/email/notify";
import { siteUrl } from "@/lib/email/urls";

export const runtime = "nodejs";
export const maxDuration = 10;

const NO_STORE = { "cache-control": "private, no-store" };
/** An address, a language and a path fit in far less: anything bigger isn't from the box. */
const MAX_BODY = 1024;

const askInput = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  locale: z.enum(["en", "es"]).default("en"),
  path: z.string().max(200).optional(),
});

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });

/**
 * The date letter's box (components/date-letter/letter-box.tsx). Switched off (DATE_LETTER unset),
 * neither handler reads anything: a bare 404.
 *
 * GET: whether the box may be drawn (the list exists), and for someone signed in their own address
 * to fill in, and whether it is on the list already. Nobody else's address is ever said.
 */
export async function GET() {
  if (!dateLetterOn()) return notFound();
  const admin = getSupabaseAdminClient();
  if (!admin || !(await letterTableThere(admin))) return NextResponse.json({ available: false, email: null, state: "none" }, { headers: NO_STORE });
  const user = await getCurrentUser().catch(() => null);
  if (!user?.email) return NextResponse.json({ available: true, email: null, state: "none" }, { headers: NO_STORE });
  const state = (await letterStateOf(admin, user.email).catch(() => "none" as const)) === "on" ? "on" : "none";
  return NextResponse.json({ available: true, email: user.email, state }, { headers: NO_STORE });
}

/**
 * POST { email, locale, path }: the box was pressed. One confirming e-mail goes (lib/lifecycle/
 * date-letter-store.ts decides whether even that); nothing weekly until its button is pressed. The
 * answer is the same whatever happened, so the box can't be used to learn anything about an address.
 * Signed in with that same address, the press is the yes and the answer says so. Five tries in ten
 * minutes from one connection.
 */
export async function POST(request: NextRequest) {
  if (!dateLetterOn()) return notFound();
  const admin = getSupabaseAdminClient();
  const secret = linkSecret();
  if (!admin || !secret || !(await letterTableThere(admin))) return NextResponse.json({ error: "unavailable" }, { status: 503, headers: NO_STORE });
  if (!(await rateLimit(`date-letter:${clientIp(request.headers)}`, { limit: 5, windowSeconds: 600 }))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: NO_STORE });
  }
  const raw = await request.text().catch(() => "");
  if (raw.length > MAX_BODY) return NextResponse.json({ error: "too_large" }, { status: 413, headers: NO_STORE });
  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {}
  const parsed = askInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400, headers: NO_STORE });
  const { email, locale, path } = parsed.data;

  const user = await getCurrentUser().catch(() => null);
  const verified = Boolean(user?.email) && user!.email!.trim().toLowerCase() === email;
  // The sentence they agreed to, as the server words it in their language: never taken from the page.
  const wording = (await getTranslations({ locale, namespace: "dateLetter" }))("wording");
  let result: Awaited<ReturnType<typeof askLetter>>;
  try {
    result = await askLetter(admin, { email, locale, path: cleanPath(path), wording, verified, now: Date.now() });
  } catch (error) {
    console.error("[date-letter] ask failed", (error as Error).message);
    return NextResponse.json({ error: "unavailable" }, { status: 503, headers: NO_STORE });
  }
  if (result.send) {
    const confirm = await signToken("date-letter-confirm", result.id, secret);
    const stop = await signToken("date-letter-stop", result.id, secret);
    const sent = await sendLetterConfirm({
      to: email,
      locale,
      confirmUrl: `${siteUrl()}/api/date-letter/confirm?t=${confirm}&l=${locale}`,
      stopUrl: `${siteUrl()}/api/date-letter/stop?t=${stop}&l=${locale}`,
    });
    if (!sent) await confirmNotSent(admin, result.id);
  }
  // Only the account's own address hears "on", and only when it is on (not when it is on the unsubscribe list).
  return NextResponse.json({ ok: true, state: verified && !result.send && result.state === "on" ? "on" : "asked" }, { headers: NO_STORE });
}
