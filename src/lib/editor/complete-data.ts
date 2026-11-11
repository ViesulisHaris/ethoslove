import { COVER_IDS, FONT_PAIRINGS, GIFT_LOCALES, HEX_COLOR, type GiftData, type GiftPhoto } from "@/lib/gift/schema";

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isPhoto = (p: unknown): p is GiftPhoto => isObject(p) && typeof p.id === "string" && typeof p.url === "string";
const oneOf = <T extends string>(options: readonly T[], value: unknown): value is T =>
  typeof value === "string" && (options as readonly string[]).includes(value);

/** A gift's optional pieces: a song, a voice message, a video and the like. */
const EXTRAS = ["music", "voiceNote", "video", "countdown", "surprise", "dedication", "unwrap"] as const;

/**
 * A gift the editor opens, made whole on top of a blank one of its template. A draft's row is made
 * empty (`data: {}`) and only filled by its first save, so a draft left before then came back as
 * `{}`, and the editor stopped on its very first line: "undefined is not an object (evaluating
 * 'd.data.photos.map')", three times on 9 Nov 2026, on iPhones. A draft kept in this browser by an
 * older version can miss pieces too.
 *
 * Nothing saved at all reads as the blank gift, exactly as a new one starts. Otherwise the gift is
 * kept exactly as saved, and only what the editor can't work without, missing or of the wrong
 * shape, comes from the blank one: the photo list, the names and texts, the switches, the look and
 * the settings object (whose missing settings the gift page and the editor already fill in). An
 * optional piece stays as saved, absent stays absent, and one of the wrong shape is dropped.
 */
export function completeGiftData(blank: GiftData, stored: unknown): GiftData {
  if (!isObject(stored) || Object.keys(stored).length === 0) return blank;
  const s = stored;
  const text = (value: unknown, fallback: string) => (typeof value === "string" ? value : fallback);
  const flag = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);
  const done: Record<string, unknown> = {
    ...s,
    version: 1,
    templateSlug: blank.templateSlug,
    locale: oneOf(GIFT_LOCALES, s.locale) ? s.locale : blank.locale,
    title: text(s.title, blank.title),
    recipientName: text(s.recipientName, blank.recipientName),
    senderName: text(s.senderName, blank.senderName),
    message: text(s.message, blank.message),
    messageStyle: oneOf(["typewriter", "fade"] as const, s.messageStyle) ? s.messageStyle : blank.messageStyle,
    photos: Array.isArray(s.photos) ? s.photos.filter(isPhoto) : blank.photos,
    accentColor: typeof s.accentColor === "string" && HEX_COLOR.test(s.accentColor) ? s.accentColor : blank.accentColor,
    fontPairing: oneOf(FONT_PAIRINGS, s.fontPairing) ? s.fontPairing : blank.fontPairing,
    showReactionCta: flag(s.showReactionCta, blank.showReactionCta),
    watermark: flag(s.watermark, blank.watermark),
    fields: isObject(s.fields) ? s.fields : blank.fields,
  };
  if ("cover" in s && !oneOf(COVER_IDS, s.cover)) delete done.cover;
  for (const key of EXTRAS) if (key in s && !isObject(s[key])) delete done[key];
  return done as GiftData;
}
