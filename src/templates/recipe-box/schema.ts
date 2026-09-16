import { z } from "zod";
import { MAX_INGREDIENTS } from "./pour";

/** The counter she'd stand at. Each one sets the wood, the wall and the shadows together. */
export const COUNTER_IDS = ["oak", "walnut", "marble", "sage"] as const;
export type CounterId = (typeof COUNTER_IDS)[number];

/** The gingham cloth under the bowl, and the band across the top of the card. */
export const CLOTH_IDS = ["tomato", "butter", "rosemary"] as const;
export type ClothId = (typeof CLOTH_IDS)[number];

export const fieldsSchema = z.object({
  /** What the recipe is called. Left empty, it takes her name. */
  recipeName: z.string().trim().max(48).default(""),
  /** Her, in ingredients. Left empty, three of ours go in instead. */
  ingredients: z.array(z.string().trim().min(1).max(64)).max(MAX_INGREDIENTS).default([]),
  /** The line under the title: "Makes one …". */
  makes: z.string().trim().max(90).default(""),
  counter: z.enum(COUNTER_IDS).default("oak"),
  cloth: z.enum(CLOTH_IDS).default("tomato"),
});

export type RecipeBoxFields = z.infer<typeof fieldsSchema>;
