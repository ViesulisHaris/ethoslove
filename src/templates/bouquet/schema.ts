import { z } from "zod";
import { DEFAULT_STEMS, FLOWER_IDS, MAX_STEMS } from "./catalogue";

export const stemSchema = z.object({
  flower: z.enum(FLOWER_IDS),
  color: z.string().regex(/^[a-z]+$/).max(16),
  count: z.number().int().min(1).max(12),
});

export type Stem = z.infer<typeof stemSchema>;

export const fieldsSchema = z.object({
  stems: z
    .array(stemSchema)
    .min(1)
    .max(12)
    .refine((stems) => stems.reduce((n, s) => n + s.count, 0) <= MAX_STEMS, `At most ${MAX_STEMS} stems`)
    .default(DEFAULT_STEMS),
  wrap: z.enum(["kraft", "tissue", "blush", "noir"]).default("kraft"),
  ribbon: z.enum(["cream", "red", "sage", "black", "pink"]).default("cream"),
  backdrop: z.enum(["linen", "sage", "blush", "night"]).default("linen"),
  /** Picks the arrangement; the sender shuffles it until it looks right. */
  seed: z.number().int().min(0).max(99999).default(1),
  cardNote: z.string().max(30).optional(),
});

export type BouquetFields = z.infer<typeof fieldsSchema>;
