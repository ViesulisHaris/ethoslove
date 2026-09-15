import { BRAND } from "./brand";

const nonEmpty = (v: string | undefined) => (v && v.trim().length > 0 ? v.trim() : undefined);

/**
 * Public origin. Explicit NEXT_PUBLIC_SITE_URL wins; on Vercel the stable production domain
 * is used, then the per-deployment URL (previews); locally, the dev server.
 */
export const SITE_URL =
  nonEmpty(process.env.NEXT_PUBLIC_SITE_URL)?.replace(/\/$/, "") ??
  (nonEmpty(process.env.VERCEL_PROJECT_PRODUCTION_URL) ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined) ??
  (nonEmpty(process.env.VERCEL_URL) ? `https://${process.env.VERCEL_URL}` : undefined) ??
  "http://localhost:3000";

export const SITE = {
  name: BRAND.name,
  url: SITE_URL,
  /** Base path for shareable gift links. Keep short: it goes on QR codes. */
  giftPath: "/g",
  ogImage: "/og-default.png",
  twitterHandle: "@tryethos",
} as const;

/** Length of the public short id on gift links (base58, ~52 bits of entropy). */
export const SHORT_ID_LENGTH = 9;

export const LIMITS = {
  free: { maxPhotos: 10, maxGifts: Infinity },
  premium: { maxPhotos: 20, maxGifts: Infinity },
  /** Client-side compression target before upload. */
  photoMaxBytes: 0.6 * 1024 * 1024,
  photoMaxEdgePx: 1600,
  audioMaxBytes: 12 * 1024 * 1024,
  /** Supabase Storage's project-wide ceiling (fileSizeLimit). The gifts bucket says 60 MB, but the lower limit wins. */
  uploadMaxBytes: 50 * 1024 * 1024,
  videoMaxBytes: 50 * 1024 * 1024,
  messageMaxChars: 4000,
  captionMaxChars: 140,
  voiceNoteMaxSeconds: 20,
  /** The sender's voice message inside a gift (premium). */
  senderVoiceMaxSeconds: 60,
} as const;
