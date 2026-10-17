import "server-only";

import type { GiftData } from "@/lib/gift/schema";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { GIFTS_BUCKET, REACTIONS_BUCKET, isStoragePath, storageObjectKey } from "./assets";
import type { Tables } from "@/lib/supabase/types";

export type DashboardGift = Tables<"gifts"> & {
  stats: { opens: number; uniqueViewers: number; avgWatchPct: number; reactions: number; lastOpenedAt: string | null };
  /** Signed URL for the first photo, if any. */
  thumbnail: string | null;
  recipientName: string;
};

export async function listMyGifts(userId: string): Promise<DashboardGift[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];
  const [{ data: gifts }, { data: stats }] = await Promise.all([
    supabase.from("gifts").select("*").eq("user_id", userId).neq("status", "archived").order("updated_at", { ascending: false }),
    supabase.from("gift_stats").select("*"),
  ]);
  if (!gifts) return [];
  const statMap = new Map((stats ?? []).map((s) => [s.gift_id, s]));

  const firstPaths = gifts.map((g) => {
    const d = g.data as unknown as Partial<GiftData>;
    const url = d?.photos?.[0]?.url;
    return url && isStoragePath(url) ? url : null;
  });
  const toSign = firstPaths.filter((p): p is string => Boolean(p));
  const signedMap: Record<string, string> = {};
  if (toSign.length) {
    const { data: signed } = await supabase.storage.from(GIFTS_BUCKET).createSignedUrls(toSign.map(storageObjectKey), 3600);
    signed?.forEach((row, i) => {
      if (row.signedUrl) signedMap[toSign[i]] = row.signedUrl;
    });
  }

  return gifts.map((g, i) => {
    const s = statMap.get(g.id);
    const d = g.data as unknown as Partial<GiftData>;
    return {
      ...g,
      stats: { opens: Number(s?.opens ?? 0), uniqueViewers: Number(s?.unique_viewers ?? 0), avgWatchPct: Number(s?.avg_watch_pct ?? 0), reactions: Number(s?.reactions ?? 0), lastOpenedAt: s?.last_opened_at ?? null },
      thumbnail: firstPaths[i] ? (signedMap[firstPaths[i]!] ?? null) : (d?.photos?.[0]?.url ?? null),
      recipientName: d?.recipientName ?? "",
    };
  });
}

export type ReactionRow = Tables<"reactions"> & { audioUrl: string | null };

export async function getGiftDetail(userId: string, giftId: string) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data: gift } = await supabase.from("gifts").select("*").eq("id", giftId).eq("user_id", userId).single();
  if (!gift) return null;
  const [{ data: stat }, { data: reactions }, { data: views }] = await Promise.all([
    supabase.from("gift_stats").select("*").eq("gift_id", giftId).maybeSingle(),
    supabase.from("reactions").select("*").eq("gift_id", giftId).order("created_at", { ascending: false }).limit(100),
    supabase.from("gift_views").select("opened_at, device, watch_pct").eq("gift_id", giftId).order("opened_at", { ascending: false }).limit(2000),
  ]);
  const audioPaths = (reactions ?? []).map((r) => r.audio_path).filter((p): p is string => Boolean(p));
  const audioMap: Record<string, string> = {};
  if (audioPaths.length) {
    const { data: signed } = await supabase.storage.from(REACTIONS_BUCKET).createSignedUrls(audioPaths.map((p) => p.replace(`${REACTIONS_BUCKET}/`, "")), 3600);
    signed?.forEach((row, i) => {
      if (row.signedUrl) audioMap[audioPaths[i]] = row.signedUrl;
    });
  }
  return {
    gift,
    stats: { opens: Number(stat?.opens ?? 0), uniqueViewers: Number(stat?.unique_viewers ?? 0), avgWatchPct: Number(stat?.avg_watch_pct ?? 0), reactions: Number(stat?.reactions ?? 0) },
    reactions: (reactions ?? []).map((r) => ({ ...r, audioUrl: r.audio_path ? (audioMap[r.audio_path] ?? null) : null })) as ReactionRow[],
    views: views ?? [],
  };
}

/**
 * The account page's purchases list is what was paid, and what was refunded since (docs/MEMBERSHIP.md
 * 4.2: each paid invoice is a line). A checkout left without paying stays a pending row for good,
 * since nothing marks it expired, and listed it read as a second charge waiting under the paid one.
 */
const LISTED_PURCHASES = ["paid", "refunded"] as const;

export async function listMyPurchases(userId: string) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { purchases: [], unlocks: [] };
  const [{ data: purchases }, { data: unlocks }] = await Promise.all([
    supabase.from("purchases").select("*").eq("user_id", userId).in("status", [...LISTED_PURCHASES]).order("created_at", { ascending: false }),
    supabase.from("template_unlocks").select("*").eq("user_id", userId),
  ]);
  return { purchases: purchases ?? [], unlocks: unlocks ?? [] };
}
