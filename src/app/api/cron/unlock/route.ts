import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyUnlocked } from "@/lib/email/notify";
import { pruneOpenedGiftStorage } from "@/lib/gift/storage-cleanup";
import { runStorageRetention } from "@/lib/gift/retention";

export const runtime = "nodejs";
// The storage sweep takes most of this; Hobby allows up to 60 s.
export const maxDuration = 60;

/**
 * Backstop for scheduled gifts: flips any whose unlock time passed to live and emails the
 * sender. Recipients never wait on it (the public RPC checks unlock_at itself and the gift
 * page promotes on first open). Vercel Hobby only allows daily crons, so vercel.json runs it
 * once a day; on Pro you can switch the schedule back to every few minutes.
 *
 * The same run prunes leftovers of opened gifts and sweeps orphaned uploads and stale drafts
 * (lib/gift/retention.ts).
 */
export async function GET(request: NextRequest) {
  // Fail closed: without a configured secret nobody can trigger the cron.
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const { data: due } = await admin.from("gifts").select("id").eq("status", "scheduled").lte("unlock_at", new Date().toISOString()).limit(200);
  let flipped = 0;
  for (const g of due ?? []) {
    const { error } = await admin.from("gifts").update({ status: "live" }).eq("id", g.id).eq("status", "scheduled");
    if (!error) {
      flipped += 1;
      await notifyUnlocked(g.id).catch(() => {});
    }
  }

  const { data: pruneDue } = await admin
    .from("gifts")
    .select("id")
    .eq("status", "live")
    .is("storage_pruned_at", null)
    .order("updated_at", { ascending: true })
    .limit(25);
  let pruned = 0;
  for (const gift of pruneDue ?? []) {
    const result = await pruneOpenedGiftStorage(gift.id).catch(() => null);
    pruned += result?.deleted ?? 0;
  }

  const retention = await runStorageRetention(admin, { budgetMs: 40_000 });

  return NextResponse.json({ ok: true, flipped, pruned, retention });
}
