import { z } from "zod";

export const fieldsSchema = z.object({
  /** The light the table is in. */
  look: z.enum(["candle", "moon", "blood", "toxic"]).default("candle"),
  /** What the spirit spells, letter by letter. Capitals and numbers only on the board; defaults to "I love you". */
  spell: z.string().trim().max(22).optional(),
});

export type SeanceFields = z.infer<typeof fieldsSchema>;
