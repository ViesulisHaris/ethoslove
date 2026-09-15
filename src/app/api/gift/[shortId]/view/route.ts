import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { viewerHash } from "@/lib/crypto";
import { isShortId } from "@/lib/gift/short-id";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { notifyFirstOpen } from "@/lib/email/notify";
import { pruneOpenedGiftStorage } from "@/lib/gift/storage-cleanup";

export const runtime = "nodejs";
export const maxDuration = 5;

function device(ua: string): string {
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Macintosh|Windows|Linux/i.test(ua)) return "desktop";
  return "other";
}

type RecordGiftViewResult = {
  viewId: string;
  giftId: string | null;
  isNewView: boolean;
  isFirstOpen: boolean;
};

function parseRecordGiftViewResult(value: unknown): RecordGiftViewResult | null {
  if (typeof value === "string") {
    return { viewId: value, giftId: null, isNewView: true, isFirstOpen: false };
  }
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.viewId !== "string") return null;
  return {
    viewId: row.viewId,
    giftId: typeof row.giftId === "string" ? row.giftId : null,
    isNewView: row.isNewView === true,
    isFirstOpen: row.isFirstOpen === true,
  };
}

/** Records an open. Returns the view id so progress can be reported. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/gift/[shortId]/view">) {
  const { shortId } = await ctx.params;
  if (!isShortId(shortId)) return NextResponse.json({ ok: false }, { status: 404 });
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ ok: false }, { status: 503 });
  const ip = clientIp(request.headers);
  const ua = request.headers.get("user-agent") ?? "";
  if (!(await rateLimit(`view:${ip}`, { limit: 60, windowSeconds: 600 }))) return NextResponse.json({ ok: false }, { status: 429 });

  const { data, error } = await admin.rpc("record_gift_view", { p_short_id: shortId, p_viewer_hash: await viewerHash(ip, ua, shortId), p_device: device(ua) });
  const recorded = parseRecordGiftViewResult(data);
  if (error || !recorded) return NextResponse.json({ ok: false }, { status: 404 });

  let giftId = recorded.giftId;
  if (!giftId) {
    const { data: view } = await admin.from("gift_views").select("gift_id").eq("id", recorded.viewId).single();
    giftId = view?.gift_id ?? null;
  }
  if (giftId && recorded.isFirstOpen) void notifyFirstOpen(giftId).catch(() => {});
  if (giftId && (recorded.isFirstOpen || recorded.isNewView)) void pruneOpenedGiftStorage(giftId).catch(() => {});

  return NextResponse.json({ ok: true, viewId: recorded.viewId });
}

const progressInput = z.object({ viewId: z.uuid(), pct: z.number().int().min(0).max(100) });

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/gift/[shortId]/view">) {
  const { shortId } = await ctx.params;
  if (!isShortId(shortId)) return NextResponse.json({ ok: false }, { status: 404 });
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ ok: false }, { status: 503 });
  const parsed = progressInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  await admin.rpc("update_gift_view_progress", { p_view_id: parsed.data.viewId, p_pct: parsed.data.pct });
  return NextResponse.json({ ok: true });
}
