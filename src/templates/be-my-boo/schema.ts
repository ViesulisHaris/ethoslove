import { z } from "zod";

export const fieldsSchema = z.object({
  look: z.enum(["pumpkin", "pink", "midnight"]).default("pumpkin"),
  /** Under their name at the top of the collage. Defaults to "be my boo?". */
  sign: z.string().trim().max(24).optional(),
  /** A line or two in handwriting on the page. */
  note: z.string().trim().max(90).optional(),
});

export type BeMyBooFields = z.infer<typeof fieldsSchema>;
