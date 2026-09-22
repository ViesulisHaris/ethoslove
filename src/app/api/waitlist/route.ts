import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 10;

const input = z.object({ email: z.string().trim().toLowerCase().email().max(254), locale: z.enum(["en", "es"]).optional() });

/** An email for "Ethos for Two". Nothing is sent to it; it is a list for the day the plan exists. */
export async function POST(request: NextRequest) {
  if (!(await rateLimit(`waitlist:${clientIp(request.headers)}`, { limit: 5, windowSeconds: 600 }))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = input.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const db = getSupabaseAdminClient();
  if (!db) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  // Signing up twice is not an error anybody needs to hear about.
  const { error } = await db.from("waitlist").upsert({ email: parsed.data.email, product: "for-two", locale: parsed.data.locale ?? null }, { onConflict: "email", ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
