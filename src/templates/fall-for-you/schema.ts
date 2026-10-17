import { z } from "zod";

export const fieldsSchema = z.object({
  look: z.enum(["gingham", "sage", "cranberry"]).default("gingham"),
  /** What the wooden letter blocks spell. Defaults to their name. */
  blocks: z.string().trim().max(12).optional(),
  /** The line on the kraft tag. Defaults to "fall for you". */
  tag: z.string().trim().max(24).optional(),
  /** The recipe card's line, in handwriting. */
  note: z.string().trim().max(90).optional(),
});

export type FallForYouFields = z.infer<typeof fieldsSchema>;
