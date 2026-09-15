import "server-only";

import type { GiftData, GiftLocale } from "@/lib/gift/schema";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { GIFTS_BUCKET, storageObjectKey, storagePathsOf } from "./assets";

export type PublicGift = {
  id: string;
  shortId: string;
  templateSlug: string;
  locale: GiftLocale;
  status: "live" | "scheduled";
  unlockAt: string | null;
  timezone: string | null;
  watermark: boolean;
  unlocked: boolean;
  requiresPassword: boolean;
  passwordOk: boolean;
  recipientName: string;
  senderName: string;
  /** Only present when unlocked and the password (if any) matched. Asset paths already signed. */
  data: GiftData | null;
};

const SIGNED_TTL = 60 * 60 * 24 * 7;

/** The one server-side read path for recipients. Goes through the SECURITY DEFINER RPC. */
export async function fetchPublicGift(shortId: string, password?: string | null): Promise<PublicGift | null> {
  const admin = getSupabaseAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.rpc("get_public_gift", { p_short_id: shortId, p_password: password ?? null });
  if (error || !data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const gift: PublicGift = {
    id: String(row.id),
    shortId: String(row.shortId),
    templateSlug: String(row.templateSlug),
    locale: (row.locale === "es" ? "es" : "en") as GiftLocale,
    status: row.status === "scheduled" ? "scheduled" : "live",
    unlockAt: (row.unlockAt as string | null) ?? null,
    timezone: (row.timezone as string | null) ?? null,
    watermark: Boolean(row.watermark),
    unlocked: Boolean(row.unlocked),
    requiresPassword: Boolean(row.requiresPassword),
    passwordOk: Boolean(row.passwordOk),
    recipientName: String(row.recipientName ?? ""),
    senderName: String(row.senderName ?? ""),
    data: null,
  };
  // Render the row's template, the one the paywall checked, never a slug written inside the data.
  if (row.data && typeof row.data === "object")
    gift.data = await signAssets({ ...(row.data as GiftData), templateSlug: gift.templateSlug }, gift.watermark);
  return gift;
}

async function signAssets(data: GiftData, watermark: boolean): Promise<GiftData> {
  const admin = getSupabaseAdminClient()!;
  const paths = storagePathsOf(data);
  const map: Record<string, string> = {};
  if (paths.length) {
    const { data: signed } = await admin.storage.from(GIFTS_BUCKET).createSignedUrls(paths.map(storageObjectKey), SIGNED_TTL);
    signed?.forEach((row, i) => {
      if (row.signedUrl) map[paths[i]] = row.signedUrl;
    });
  }
  return {
    ...data,
    watermark,
    photos: data.photos.map((p) => ({ ...p, url: map[p.url] ?? p.url })),
    music: data.music ? { ...data.music, url: map[data.music.url] ?? data.music.url } : undefined,
    video: data.video ? { url: map[data.video.url] ?? data.video.url, poster: data.video.poster ? (map[data.video.poster] ?? data.video.poster) : undefined } : undefined,
    voiceNote: data.voiceNote ? { ...data.voiceNote, url: map[data.voiceNote.url] ?? data.voiceNote.url } : undefined,
  };
}

export function passwordCookieName(shortId: string): string {
  return `ethos_gift_${shortId}`;
}
