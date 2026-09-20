import { z } from "zod";

export const fieldsSchema = z.object({
  look: z.enum(["blush", "blue"]).default("blush"),
  /** The few words on the postcard, in handwriting. */
  note: z.string().trim().max(90).optional(),
  /** The words torn out of a page, next to the photo strip. */
  label: z.string().trim().max(28).optional(),
  /** What the ticket admits them to. Defaults to "ticket to happiness". */
  ticket: z.string().trim().max(26).optional(),
});

export type CoquetteFields = z.infer<typeof fieldsSchema>;
