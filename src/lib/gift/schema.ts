import { z } from "zod";
import { isSongThumbnail, parseSongLink } from "./song-link";

export const GIFT_LOCALES = ["en", "es"] as const;
export type GiftLocale = (typeof GIFT_LOCALES)[number];

export const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

export const giftPhotoSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  caption: z.string().max(140).optional(),
  alt: z.string().max(200).optional(),
});

export const giftMusicSchema = z.object({
  /** upload = the sender's file · library = bundled track · catalog = 30-second preview of a real song */
  source: z.enum(["upload", "library", "catalog"]),
  url: z.string().min(1),
  trackId: z.string().optional(),
  title: z.string().max(120).optional(),
  artist: z.string().max(120).optional(),
  artwork: z.string().max(500).optional(),
  provider: z.enum(["itunes"]).optional(),
  /** Where the recipient can find the full song. */
  externalUrl: z.string().max(500).optional(),
  /** Seconds into the track to start from. */
  startAt: z.number().min(0).default(0),
});

/** A short spoken message from the sender, played at the end. Premium. */
export const giftVoiceNoteSchema = z.object({
  url: z.string().min(1),
  /** Seconds. */
  duration: z.number().min(0).max(180).optional(),
});

export const giftVideoSchema = z.object({
  url: z.string().min(1),
  poster: z.string().optional(),
});

export const giftCountdownSchema = z.object({
  /** Absolute instant (ISO 8601 with offset). */
  targetAt: z.iso.datetime({ offset: true }),
  /** IANA zone, used for editing/display only. */
  timezone: z.string().min(1),
  label: z.string().max(80).optional(),
});

export const giftSurpriseSchema = z.object({
  text: z.string().min(1).max(600),
  reveal: z.enum(["tap", "hold", "shake"]).default("tap"),
});

/** "This song reminds me of you": a link out to the full song, shown on the end screen. Free. */
export const giftDedicationSchema = z.object({
  url: z.string().max(500).refine((url) => parseSongLink(url) !== null, "unsupported_link"),
  title: z.string().max(120).optional(),
  artist: z.string().max(120).optional(),
  /** The provider's cover or video thumbnail, saved in the editor so recipients never wait on a lookup. */
  thumbnail: z.string().max(500).refine(isSongThumbnail, "unsupported_thumbnail").optional(),
  /** The line above the song. Defaults to "this song reminds me of you". */
  note: z.string().max(80).optional(),
});

export const FONT_PAIRINGS = ["editorial", "modern", "handwritten"] as const;

/** The screen a recipient taps to open the gift. "classic" is the plain name-and-hairline intro. */
/**
 * The order is the order they are offered in. The first six are the collage covers, made of real
 * cut-outs; the rest are the drawn set. A published gift stores its id, so ids are only ever added.
 */
export const COVER_IDS = ["lilies", "kisses", "cats", "party", "bluebell", "pressed", "gingham", "picnic", "polka", "birthday", "lovecore", "pearl", "garden", "mocha", "harvest", "starry", "snow", "spooky", "classic"] as const;
export type CoverId = (typeof COVER_IDS)[number];
export type FontPairing = (typeof FONT_PAIRINGS)[number];

/**
 * Fields every template understands. Template-specific data lives under `fields`
 * and is validated by the template's own schema (see createGiftSchema).
 */
export const giftDataBaseSchema = z.object({
  version: z.literal(1).default(1),
  templateSlug: z.string().min(1),
  locale: z.enum(GIFT_LOCALES).default("en"),
  title: z.string().max(80).default(""),
  recipientName: z.string().trim().min(1).max(40),
  senderName: z.string().trim().min(1).max(40),
  /** Constrained markdown: **bold**, *italic*, blank line = paragraph. */
  message: z.string().max(4000).default(""),
  messageStyle: z.enum(["typewriter", "fade"]).default("typewriter"),
  photos: z.array(giftPhotoSchema).max(20).default([]),
  music: giftMusicSchema.optional(),
  voiceNote: giftVoiceNoteSchema.optional(),
  video: giftVideoSchema.optional(),
  countdown: giftCountdownSchema.optional(),
  surprise: giftSurpriseSchema.optional(),
  dedication: giftDedicationSchema.optional(),
  accentColor: z.string().regex(HEX_COLOR).default("#E8604C"),
  fontPairing: z.enum(FONT_PAIRINGS).default("editorial"),
  cover: z.enum(COVER_IDS).optional(),
  showReactionCta: z.boolean().default(true),
  /** Set server-side from entitlements. Client-supplied values are ignored. */
  watermark: z.boolean().default(true),
  fields: z.record(z.string(), z.unknown()).default({}),
});

export type GiftPhoto = z.infer<typeof giftPhotoSchema>;
export type GiftMusic = z.infer<typeof giftMusicSchema>;
export type GiftVideo = z.infer<typeof giftVideoSchema>;
export type GiftCountdown = z.infer<typeof giftCountdownSchema>;
export type GiftSurprise = z.infer<typeof giftSurpriseSchema>;
export type GiftDedication = z.infer<typeof giftDedicationSchema>;
export type GiftDataBase = z.infer<typeof giftDataBaseSchema>;

export type GiftData<TFields = Record<string, unknown>> = Omit<GiftDataBase, "fields"> & {
  fields: TFields;
};

/** Full schema for one template: base fields + that template's `fields`. */
export function createGiftSchema<TFields extends z.ZodType>(fields: TFields) {
  return giftDataBaseSchema.extend({ fields });
}

/** Parse untrusted JSON (localStorage draft, DB row) into GiftData, or null. */
export function parseGiftData<TFields extends z.ZodType>(
  fields: TFields,
  input: unknown,
): GiftData<z.output<TFields>> | null {
  const result = createGiftSchema(fields).safeParse(input);
  return result.success ? (result.data as GiftData<z.output<TFields>>) : null;
}
