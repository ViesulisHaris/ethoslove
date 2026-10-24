import { z } from "zod";

export const fieldsSchema = z.object({
  /** The colours the potion goes through. */
  look: z.enum(["witch", "love", "midnight", "gold"]).default("witch"),
  /** Up to three things they drop in, each in the sender's words. None means the three the template brings. */
  ingredients: z.array(z.string().trim().min(1).max(34)).max(3).default([]),
  /** The name on the bottle. Defaults to "Love Potion No. 9". */
  potion: z.string().trim().max(26).optional(),
});

export type CauldronFields = z.infer<typeof fieldsSchema>;
