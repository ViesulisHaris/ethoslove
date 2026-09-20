import { z } from "zod";

export const fieldsSchema = z.object({
  look: z.enum(["kraft", "ivory", "rose"]).default("kraft"),
  /** One word, torn out of a book. Defaults to "Happiness". */
  word: z.string().trim().max(14).optional(),
  /** What the ticket admits them to. Defaults to "ticket to happiness". */
  ticket: z.string().trim().max(26).optional(),
  /** Engraved inside the locket. Defaults to your two initials. */
  engraving: z.string().trim().max(18).optional(),
});

export type KeepsakeFields = z.infer<typeof fieldsSchema>;
