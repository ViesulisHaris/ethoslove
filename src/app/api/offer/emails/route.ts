import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { ideaMode, ideaSince } from "@/lib/lifecycle/monthly-idea";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * The box "Email me Ethos offers" on the screen a gift is sent from (components/editor/offer-emails-box.tsx).
 * GET says whether the signed-in account said yes; POST { on, locale } records the yes, with the
 * sentence they ticked as the server words it (never the page's copy of it), or takes it back.
 * Signed in only: the address the offers go to is the account's (migration 0021).
 *
 * In the monthly idea's settings "optin" and "buyers" (lib/lifecycle/monthly-idea.ts) the box's
 * sentence names the monthly idea too (`idea: true`): a yes then also starts it, as a "box" row. In
 * "off" and "all" the route is as it was.
 */
const input = z.object({ on: z.boolean(), locale: z.enum(["en", "es"]).default("en"), idea: z.boolean().optional() });

const noStore = { "cache-control": "no-store" };

export async function GET() {
  const user = await getCurrentUser();
  const admin = getSupabaseAdminClient();
  if (!user || !admin) return NextResponse.json({ on: false }, { headers: noStore });
  const mode = ideaMode();
  const boxNamesIdea = mode === "optin" || mode === "buyers";
  const { data } = await admin.from("offer_emails").select(boxNamesIdea ? "user_id, wording" : "user_id").eq("user_id", user.id).maybeSingle();
  if (!boxNamesIdea || !data) return NextResponse.json({ on: Boolean(data) }, { headers: noStore });
  // Which sentence the stored yes was to: a yes to the plain offers sentence is shown next to that
  // sentence, never next to the one that also names the monthly idea, which they never agreed to.
  const wording = (data as { wording?: string | null }).wording ?? "";
  const ideaWordings = await Promise.all((["en", "es"] as const).map(async (locale) => (await getTranslations({ locale, namespace: "offerEmails" }))("boxIdea")));
  return NextResponse.json({ on: true, idea: ideaWordings.includes(wording) }, { headers: noStore });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  if (!(await rateLimit(`offer-emails:${clientIp(request.headers)}`, { limit: 20, windowSeconds: 600 })))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const { on, locale, idea } = parsed.data;
  const mode = ideaMode();
  const withIdea = idea === true && (mode === "optin" || mode === "buyers");

  if (!on) {
    const { error } = await admin.from("offer_emails").delete().eq("user_id", user.id);
    if (error) return NextResponse.json({ error: "save_failed" }, { status: 500 });
    return NextResponse.json({ on: false }, { headers: noStore });
  }
  const t = await getTranslations({ locale, namespace: "offerEmails" });
  const { error } = await admin
    .from("offer_emails")
    .upsert({ user_id: user.id, wording: t(withIdea ? "boxIdea" : "box"), source: "send", locale, created_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) {
    // Before migration 0021 is applied the table isn't there: the box says it couldn't save.
    console.error("[offer-emails] couldn't save a yes", error.message);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  if (withIdea) {
    // Never fails the yes: before migration 0022 the table isn't there, and the offers still are.
    try {
      const { error: ideaError } = await admin
        .from("monthly_ideas")
        .upsert({ user_id: user.id, since: ideaSince(new Date()), locale, basis: "box", wording: t("boxIdea"), off_at: null }, { onConflict: "user_id" });
      if (ideaError) console.error("[offer-emails] couldn't start the monthly idea", ideaError.message);
    } catch (e) {
      console.error("[offer-emails] couldn't start the monthly idea", (e as Error).message);
    }
  }
  return NextResponse.json({ on: true }, { headers: noStore });
}
