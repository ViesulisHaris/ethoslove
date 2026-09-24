import type { GiftData } from "@/lib/gift/schema";
import type { DashboardGift } from "@/lib/gift/dashboard";

/**
 * GET /api/app/gifts: the signed-in user's gifts for the app's "My gifts", as the dashboard lists
 * them (lib/gift/dashboard.ts), without the gift's contents or anything about its password: only
 * what the list shows. Contract: Ethos app docs/ARCHITECTURE.md §2.6.5.
 */
export type AppGift = {
  id: string;
  shortId: string;
  templateSlug: string;
  status: "draft" | "scheduled" | "live";
  title: string;
  recipientName: string;
  locale: "en" | "es";
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  unlockAt: string | null;
  url: string;
  /** The first photo: a signed URL good for an hour, a site path, or null. */
  thumbnail: string | null;
  stats: { opens: number; uniqueViewers: number; avgWatchPct: number; reactions: number; lastOpenedAt: string | null };
};

export function appGift(gift: DashboardGift, origin: string): AppGift | null {
  // The dashboard leaves archived gifts out already; anything else unexpected is left out here too.
  if (gift.status !== "draft" && gift.status !== "scheduled" && gift.status !== "live") return null;
  const data = (gift.data ?? {}) as Partial<GiftData>;
  return {
    id: gift.id,
    shortId: gift.short_id,
    templateSlug: gift.template_slug,
    status: gift.status,
    title: typeof data.title === "string" ? data.title : "",
    recipientName: gift.recipientName,
    locale: gift.locale === "es" ? "es" : "en",
    createdAt: gift.created_at,
    updatedAt: gift.updated_at,
    publishedAt: gift.published_at,
    unlockAt: gift.unlock_at,
    url: `${origin}/g/${gift.short_id}`,
    thumbnail: gift.thumbnail,
    stats: gift.stats,
  };
}
