import type { z } from "zod";
import type { GiftData } from "@/lib/gift/schema";
import type { TemplateManifest } from "@/templates/types";
import { isStoragePath } from "./assets";
import { isKnownMusic } from "./music";

export type Entitlement = {
  /** User owns this template (or Everything). */
  unlocked: boolean;
};

export type PublishDecision =
  | { ok: true; watermark: boolean; isPremium: boolean }
  | { ok: false; reason: "payment_required" | "not_ready"; problems?: string[] };

/**
 * Pure publish rules — unit tested, shared by the server action and the publish sheet.
 *
 * Free templates publish for free with a watermark. Any unlock (the template or "Everything")
 * removes the watermark and lifts limits. Premium templates need an unlock, except for a free reply:
 * someone who received a paid premium gift sends one back in that template for free, and it then
 * goes out like a free template, footer on, extras still paid (`freeReply` is only ever set once the
 * server has checked the reply's token, lib/commerce/free-reply.ts).
 */
export function decidePublish(
  manifest: TemplateManifest,
  data: GiftData,
  entitlement: Entitlement,
  options: { removeWatermark: boolean; schedule: boolean; password: boolean; freeReply?: boolean; fieldsSchema?: z.ZodType },
): PublishDecision {
  const problems = readinessProblems(manifest, data, options.fieldsSchema);
  if (problems.length > 0) return { ok: false, reason: "not_ready", problems };

  const premiumTemplate = manifest.tier === "premium" && !options.freeReply;
  const needsUnlock = premiumTemplate || options.removeWatermark || options.schedule || options.password || premiumExtras(data).length > 0;

  if (needsUnlock && !entitlement.unlocked) return { ok: false, reason: "payment_required" };

  return { ok: true, watermark: !entitlement.unlocked, isPremium: manifest.tier === "premium" };
}

/**
 * "song" is no longer the real song: Apple's previews may not be sold, so a song from the catalogue
 * is free on every gift (see ./music). It now stands only for music from somewhere that is none of
 * ours — not our library, not the sender's upload, not an Apple preview — which the editor never
 * produces, so hosting someone else's audio behind a free gift still takes an unlock.
 */
export type PremiumExtra = "song" | "video" | "voiceNote" | "morePhotos" | "unwrap";

/**
 * Content-level extras that need an unlock on any template (the free tier stays a real gift, these are the upsell).
 * "unwrap" is a date or a trip wrapped inside the gift: on a premium template it comes with the
 * template's unlock like everything else, and on The Letter or Constellations "Make it special" adds it.
 */
export function premiumExtras(data: Pick<GiftData, "music" | "video" | "voiceNote" | "photos" | "unwrap">): PremiumExtra[] {
  const extras: PremiumExtra[] = [];
  if (data.music && !isKnownMusic(data.music)) extras.push("song");
  if (data.video) extras.push("video");
  if (data.voiceNote) extras.push("voiceNote");
  if (data.photos.length > 10) extras.push("morePhotos");
  if (data.unwrap) extras.push("unwrap");
  return extras;
}

/**
 * Editing a gift that is already live or scheduled must not sneak premium content past the
 * paywall: anything that would have needed an unlock at publish time needs one now too. A free
 * reply (`freeReply`, from the free_replies row it holds) may be edited in its own template.
 */
export function liveEditNeedsUnlock(
  manifest: TemplateManifest,
  data: Pick<GiftData, "music" | "video" | "voiceNote" | "photos" | "unwrap">,
  row: { hasSchedule: boolean; hasPassword: boolean; watermark: boolean; freeReply?: boolean },
): boolean {
  return (manifest.tier === "premium" && !row.freeReply) || premiumExtras(data).length > 0 || row.hasSchedule || row.hasPassword || !row.watermark;
}

/**
 * Human-readable blockers, keyed for translation on the client. With the template's `fieldsSchema`,
 * its own fields count too, as "fields.<key>": publishing parses the whole gift with that schema
 * (app/actions/gift.ts), so a Fortune Cookie with no fortunes could be paid for and then refused.
 */
export function readinessProblems(manifest: TemplateManifest, data: GiftData, fieldsSchema?: z.ZodType): string[] {
  const problems: string[] = [];
  if (!data.recipientName.trim()) problems.push("recipientName");
  if (!data.senderName.trim()) problems.push("senderName");
  if (!data.message.trim()) problems.push("message");
  if (fieldsSchema) problems.push(...fieldProblems(fieldsSchema, data.fields).map((problem) => `fields.${problem.key}`));
  if (data.photos.length < manifest.features.photos.min) problems.push("photosMin");
  if (data.photos.length > manifest.features.photos.max) problems.push("photosMax");
  if (data.photos.some((p) => !isStoragePath(p.url) && !p.url.startsWith("http"))) problems.push("uploadsPending");
  if (data.music?.source === "upload" && !isStoragePath(data.music.url) && !data.music.url.startsWith("http")) problems.push("uploadsPending");
  if (data.video && !isStoragePath(data.video.url) && !data.video.url.startsWith("http")) problems.push("uploadsPending");
  if (data.voiceNote && !isStoragePath(data.voiceNote.url) && !data.voiceNote.url.startsWith("http")) problems.push("uploadsPending");
  return Array.from(new Set(problems));
}

/**
 * What one of the template's own fields still needs, the way the checklist says it: `more` (a list
 * under its minimum, `count` being that minimum), `fewer` (over its maximum), `fill` (left empty),
 * `emptyItem` (a blank line in a list) or `fix` (anything else). One per field: its first issue.
 */
export type FieldProblem = { key: string; need: "more" | "fewer" | "fill" | "emptyItem" | "fix"; count?: number };

type Issue = z.ZodError["issues"][number];

function needOf(issue: Issue): Pick<FieldProblem, "need" | "count"> {
  const whole = issue.path.length <= 1;
  if (issue.code === "too_small" && issue.origin === "array" && whole) return { need: "more", count: Number(issue.minimum) };
  if (issue.code === "too_big" && issue.origin === "array" && whole) return { need: "fewer", count: Number(issue.maximum) };
  if (issue.code === "too_small" && issue.origin === "string") return { need: whole ? "fill" : "emptyItem" };
  if (issue.code === "invalid_type" && whole) return { need: "fill" };
  return { need: "fix" };
}

/** The template's own fields that its schema refuses, as publishing would (see readinessProblems). */
export function fieldProblems(fieldsSchema: z.ZodType, fields: unknown): FieldProblem[] {
  const parsed = fieldsSchema.safeParse(fields ?? {});
  if (parsed.success) return [];
  const found = new Map<string, FieldProblem>();
  for (const issue of parsed.error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "";
    if (!found.has(key)) found.set(key, { key, ...needOf(issue) });
  }
  return [...found.values()];
}

/**
 * The template's must-haves: what a new gift of it doesn't meet yet (Fortune Cookie's three
 * fortunes, Text Thread's two messages), so the checklist lists them from the start and ticks them
 * off. Zod 4 hands a default back without checking it, so the defaults are parsed a second time.
 */
export function fieldMustHaves(fieldsSchema: z.ZodType): FieldProblem[] {
  const blank = fieldsSchema.safeParse({});
  return fieldProblems(fieldsSchema, blank.success ? blank.data : {});
}
