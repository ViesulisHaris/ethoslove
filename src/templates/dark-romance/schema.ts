import { z } from "zod";

export const fieldsSchema = z.object({
  look: z.enum(["bordeaux", "noir", "parchment"]).default("bordeaux"),
  /** The cut-out letters at the top: a word or three. Defaults to "only you". */
  headline: z.string().trim().max(18).optional(),
  /** The name on the tarot card the second photo is printed on. Defaults to "the lovers". */
  card: z.string().trim().max(18).optional(),
  /** The words torn out of a page beside the cards. Defaults to "i'd bet on us". */
  bet: z.string().trim().max(26).optional(),
});

export type DarkRomanceFields = z.infer<typeof fieldsSchema>;
