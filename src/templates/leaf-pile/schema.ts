import { z } from "zod";

export const fieldsSchema = z.object({
  /** Written on the card under the leaves, under the title. */
  line: z.string().trim().max(120).optional(),
  /** Where the card was left. */
  look: z.enum(["deck", "porch", "stone", "evening"]).default("deck"),
});

export type LeafPileFields = z.infer<typeof fieldsSchema>;
