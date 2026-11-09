import { z } from "zod";

export const fieldsSchema = z.object({
  /** Your year in numbers, one present each: a number first, then what it counts. */
  stats: z.array(z.string().trim().max(48)).max(8).default([]),
  /** The wrapping paper. */
  look: z.enum(["red", "kraft", "plaid", "pink"]).default("red"),
});

export type UnwrappedFields = z.infer<typeof fieldsSchema>;
