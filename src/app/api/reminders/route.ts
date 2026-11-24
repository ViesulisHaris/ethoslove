import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import type { Tables } from "@/lib/supabase/types";
import { MAX_REMINDERS, initialLastSentYear, type Reminder } from "@/lib/lifecycle/reminders";
import { reminderInput } from "@/lib/lifecycle/reminder-input";
import { isMissingColumn } from "@/lib/commerce/db";

export const runtime = "nodejs";
export const maxDuration = 10;

const COLUMNS = "id, recipient_name, occasion, month, day, locale, template_slug, last_sent_year";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRIVATE = { "cache-control": "private, no-store" };

type Listed = Pick<Tables<"reminders">, "id" | "recipient_name" | "occasion" | "month" | "day" | "locale" | "template_slug" | "last_sent_year">;
/** With what already went for it: the year, and (after migration 0025) which of its three e-mails. */
const toReminder = (r: Listed, sentStage?: number): Reminder => ({
  id: r.id,
  recipientName: r.recipient_name,
  occasion: r.occasion,
  month: r.month,
  day: r.day,
  locale: r.locale,
  templateSlug: r.template_slug,
  sentYear: r.last_sent_year,
  ...(sentStage !== undefined ? { sentStage } : {}),
});

/**
 * Which of the year's three e-mails went last, by id. Read on its own so that a database without
 * migration 0025 still lists everything: then nothing is known, and a year with no stage reads as
 * that year done, as the code before 0025 wrote it.
 */
async function stagesOf(db: NonNullable<Awaited<ReturnType<typeof signedIn>>>["db"], ids: string[]): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await db.from("reminders").select("id, last_stage").in("id", ids);
  if (error || !data) return new Map();
  return new Map(data.map((r) => [r.id, r.last_stage]));
}

/** Every query goes through the signed-in person's own client: row-level security decides what is theirs. */
async function signedIn() {
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser();
  return supabase && user ? { db: supabase, userId: user.id } : null;
}

/** The signed-in person's reminders, in calendar order. */
export async function GET() {
  const session = await signedIn();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { data, error } = await session.db.from("reminders").select(COLUMNS).order("month").order("day").limit(MAX_REMINDERS);
  if (error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const stages = await stagesOf(session.db, (data ?? []).map((r) => r.id));
  return NextResponse.json({ reminders: (data ?? []).map((r) => toReminder(r, stages.get(r.id))) }, { headers: PRIVATE });
}

/**
 * "Remind me next year". Idempotent: the same person, occasion and day (whatever the capitals)
 * returns the reminder already saved, so a double tap or a second gift for the same birthday
 * never means two emails.
 */
export async function POST(request: NextRequest) {
  const session = await signedIn();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!(await rateLimit(`reminders:${session.userId}`, { limit: 20, windowSeconds: 600 }))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = reminderInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const r = parsed.data;
  const { db, userId } = session;

  const sameDay = await db.from("reminders").select(COLUMNS).eq("occasion", r.occasion).eq("month", r.month).eq("day", r.day);
  if (sameDay.error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const name = r.recipientName.toLocaleLowerCase();
  const existing = sameDay.data?.find((x) => x.recipient_name.toLocaleLowerCase() === name);
  if (existing) return NextResponse.json({ reminder: toReminder(existing, (await stagesOf(db, [existing.id])).get(existing.id)), created: false }, { headers: PRIVATE });

  const { count, error: countError } = await db.from("reminders").select("id", { count: "exact", head: true });
  if (countError) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  if ((count ?? 0) >= MAX_REMINDERS) return NextResponse.json({ error: "too_many", max: MAX_REMINDERS }, { status: 409 });

  // Only the gift's own occasion skips this year: it is the day the gift was just made for.
  const skipYear = r.forThisGift ? initialLastSentYear({ month: r.month, day: r.day }, new Date(), r.giftDay) : null;
  const row = {
    user_id: userId,
    recipient_name: r.recipientName,
    occasion: r.occasion,
    month: r.month,
    day: r.day,
    locale: r.locale,
    template_slug: r.templateSlug ?? null,
    last_sent_year: skipYear,
  };
  // Migration 0025: that year is done (all three e-mails), and the page's currency is kept for the
  // prices. Without the migration the row is saved as before, without them.
  const staged = { ...row, ...(skipYear !== null ? { last_stage: 3 } : {}), ...(r.currency ? { currency: r.currency } : {}) };
  // ignoreDuplicates: a request that raced this one to the same row wins, and this one reads it back.
  const save = (values: typeof row) => db.from("reminders").upsert(values, { onConflict: "user_id,recipient_name,occasion,month,day", ignoreDuplicates: true }).select(COLUMNS).maybeSingle();
  let inserted = await save(staged);
  let withStage = true;
  if (inserted.error && isMissingColumn(inserted.error)) {
    inserted = await save(row);
    withStage = false;
  }
  if (inserted.error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  if (inserted.data) return NextResponse.json({ reminder: toReminder(inserted.data, withStage ? (skipYear !== null ? 3 : 0) : undefined), created: true }, { status: 201, headers: PRIVATE });
  const again = await db.from("reminders").select(COLUMNS).eq("recipient_name", r.recipientName).eq("occasion", r.occasion).eq("month", r.month).eq("day", r.day).maybeSingle();
  if (again.error || !again.data) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  return NextResponse.json({ reminder: toReminder(again.data, (await stagesOf(db, [again.data.id])).get(again.data.id)), created: false }, { headers: PRIVATE });
}

/** Take one of the signed-in person's reminders away: `?id=`. */
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!UUID.test(id)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const session = await signedIn();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { error } = await session.db.from("reminders").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
