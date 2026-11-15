import { z } from "zod";

/** What the six slices are made of, in the order they come out: the recipe's ingredients. */
export const DEFAULT_INGREDIENTS = [
  "two cups of you humming while you cook",
  "a pinch of you stealing the blanket",
  "the way you save me the corner piece",
  "a spoonful of your terrible puns",
  "every early morning coffee run",
  "a whole lot of patience (yours)",
];

export const fieldsSchema = z.object({
  /** Up to six, one under each slice. */
  ingredients: z.array(z.string().trim().max(48)).max(6).default(DEFAULT_INGREDIENTS),
  /** The table. */
  look: z.enum(["linen", "farmhouse", "check", "candlelit"]).default("linen"),
});

export type ThankfulPieFields = z.infer<typeof fieldsSchema>;
