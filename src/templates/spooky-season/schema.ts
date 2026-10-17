import { z } from "zod";

export const fieldsSchema = z.object({
  look: z.enum(["pumpkin", "midnight", "cozy"]).default("pumpkin"),
  /** The few words on the postcard, in handwriting. */
  note: z.string().trim().max(90).optional(),
  /** The words torn out of a page, next to the film strip. */
  label: z.string().trim().max(28).optional(),
  /** What the ticket admits them to. Defaults to "admit two: haunted house". */
  ticket: z.string().trim().max(26).optional(),
});

export type SpookySeasonFields = z.infer<typeof fieldsSchema>;
