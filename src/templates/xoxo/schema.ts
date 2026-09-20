import { z } from "zod";

export const fieldsSchema = z.object({
  look: z.enum(["cream", "noir", "blush"]).default("cream"),
  /** What you call them, in cut-out newspaper letters. Defaults to "my person". */
  headline: z.string().trim().max(16).optional(),
  /** The lines you would underline, on the card under the first photo. */
  lines: z.string().trim().max(220).optional(),
  /** One word in script on the second polaroid. Defaults to "Love". */
  word: z.string().trim().max(10).optional(),
});

export type XoxoFields = z.infer<typeof fieldsSchema>;
