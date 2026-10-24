import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isShortId } from "@/lib/gift/short-id";
import { emailKey, linkSecret, signToken } from "@/lib/lifecycle/links";
import { KEEP_OCCASIONS, senderFirstName } from "@/lib/keep/keep";
import { confirmNotSent, keepableGift, requestKeep } from "@/lib/keep/store";
import { sendKeepConfirm } from "@/lib/email/notify";
import { siteUrl } from "@/lib/email/urls";

export const runtime = "nodejs";
export const maxDuration = 10;

const NO_STORE = { "cache-control": "no-store" };
/** An address and three days fit in far less: anything bigger isn't from the keep page. */
const MAX_BODY = 4096;

const keepInput = z.object({
  shortId: z.string().refine(isShortId),
  email: z.string().trim().toLowerCase().email().max(254),
  reminders: z
    .array(z.object({ occasion: z.enum(KEEP_OCCASIONS), month: z.number().int().min(1).max(12).optional(), day: z.number().int().min(1).max(31).optional() }))
    .max(KEEP_OCCASIONS.length)
    .default([]),
});

/**
 * "Keep this gift", from the small page off a gift's end screen: { shortId, email, reminders }.
 * Recipients have no account, so nothing is kept or sent but one confirmation (lib/keep/store.ts
 * decides whether even that goes), and the link and reminders follow only a yes from the inbox. The
 * answer is the same whether or not an email went, so the form can't be used to learn anything
 * about an address. Thirty tries an hour from one connection (many phones can share one).
 */
export async function POST(request: NextRequest) {
  const admin = getSupabaseAdminClient();
  const secret = linkSecret();
  if (!admin || !secret) return NextResponse.json({ error: "unavailable" }, { status: 503, headers: NO_STORE });
  if (!(await rateLimit(`keep:${clientIp(request.headers)}`, { limit: 30, windowSeconds: 3600 }))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: NO_STORE });
  }
  const raw = await request.text().catch(() => "");
  if (raw.length > MAX_BODY) return NextResponse.json({ error: "too_large" }, { status: 413, headers: NO_STORE });
  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {}
  const parsed = keepInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400, headers: NO_STORE });
  const gift = await keepableGift(admin, parsed.data.shortId);
  if (!gift) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });

  // The name on a reminder is the sender's first name, read from the gift: nothing typed on the page
  // reaches an email, and no more of the name is kept than the emails after the yes say. A signature
  // with no first name in it ("Tu amor") keeps its reminders, nameless; a gift with no sender has none.
  const sender = senderFirstName(gift.senderName);
  const requests = gift.senderName ? parsed.data.reminders.map((r) => ({ ...r, name: sender })) : [];
  const { email } = parsed.data;
  const result = await requestKeep(admin, { gift, email, locale: gift.locale, requests, now: Date.now() });
  if (result.send) {
    const confirm = await signToken("keep-confirm", result.keepId, secret);
    const never = await signToken("keep-never", await emailKey(email), secret);
    const sent = await sendKeepConfirm({
      to: email,
      locale: gift.locale,
      confirmUrl: `${siteUrl()}/api/keep/confirm?t=${confirm}&l=${gift.locale}`,
      neverUrl: `${siteUrl()}/api/keep/never?t=${never}&l=${gift.locale}`,
    });
    if (!sent) await confirmNotSent(admin, result.keepId);
  }
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
