import { z } from "zod";

export const fieldsSchema = z.object({
  pack: z.enum(["chaos", "cats", "party", "soft"]).default("chaos"),
  surface: z.enum(["mat", "paper", "holo", "night"]).default("mat"),
  /** The label-maker strips stuck under some of the stickers. Empty falls back to the house ones. */
  labels: z.array(z.string().trim().max(28)).max(6).default([]),
  /** The line in the middle of the empty page. Defaults to "{name}, slap some stickers". */
  prompt: z.string().trim().max(40).optional(),
});

export type StickerBombFields = z.infer<typeof fieldsSchema>;
