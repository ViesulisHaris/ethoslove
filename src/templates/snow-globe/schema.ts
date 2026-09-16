import { z } from "zod";

/** What the sender put inside the glass. */
export const SCENES = ["homes", "tree", "cabin", "village"] as const;
export type SceneId = (typeof SCENES)[number];

export const MOODS = ["lamplit", "midnight", "frosted"] as const;
export type MoodId = (typeof MOODS)[number];

export const MAX_LINES = 4;

export const fieldsSchema = z.object({
  scene: z.enum(SCENES).default("homes"),
  /** The room the globe is standing in. */
  mood: z.enum(MOODS).default("lamplit"),
  /** How many times the snow flies before the plaque is engraved. */
  shakes: z.enum(["two", "three", "four"]).default("three"),
  /** Engraved on the brass plaque at the end. Left empty, the gift's title is engraved instead. */
  plaque: z.string().trim().max(44).default(""),
  /** The lines that appear in the snow, one per settling, in turn with the photos. */
  lines: z.array(z.string().trim().max(90)).max(MAX_LINES).default([]),
});

export type SnowGlobeFields = z.infer<typeof fieldsSchema>;

/** A blank globe: what a gift with no settings saved yet is made of. */
export const blankFields = (): SnowGlobeFields => fieldsSchema.parse({});

/**
 * The settings, out of whatever was saved. A draft written before a field changed shape still has
 * to open, so anything that no longer fits is dropped — key by key, because one stale setting
 * should not cost the sender the lines they wrote.
 */
export function parseFields(raw: unknown): SnowGlobeFields {
  const whole = fieldsSchema.safeParse(raw);
  if (whole.success) return whole.data;
  if (!raw || typeof raw !== "object") return blankFields();
  const kept: Record<string, unknown> = {};
  for (const key of Object.keys(blankFields())) {
    const value = (raw as Record<string, unknown>)[key];
    if (value === undefined) continue;
    const one = fieldsSchema.safeParse({ [key]: value });
    if (one.success) kept[key] = one.data[key as keyof SnowGlobeFields];
  }
  return fieldsSchema.parse(kept);
}
