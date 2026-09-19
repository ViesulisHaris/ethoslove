import { z } from "zod";

export const fieldsSchema = z.object({
  /** Their age: written on the big polaroid, and one guest has opinions about it. */
  age: z.number().int().min(1).max(120).optional(),
  look: z.enum(["linen", "bubblegum", "lime", "midnight"]).default("linen"),
  /** The cut-out letters across the top. Defaults to "happy birthday". */
  banner: z.string().trim().max(24).optional(),
  /** The word in handwriting on the wide polaroid. Defaults to "happiness." */
  word: z.string().trim().max(18).optional(),
  /** What the animals yell when tapped, one line each. Empty lines fall back to the house ones. */
  shouts: z.array(z.string().trim().max(40)).max(10).default([]),
});

export type PartyAnimalsFields = z.infer<typeof fieldsSchema>;
