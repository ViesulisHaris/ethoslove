import { z } from "zod";

export const fieldsSchema = z.object({
  theme: z.enum(["white", "kraft", "night"]).default("white"),
  /** Their age: circled on the first page, and the candles on the cake, up to eight. */
  age: z.number().int().min(1).max(120).optional(),
  /** The hand-lettered line over the cake. Defaults to "happy birthday". */
  title: z.string().trim().max(24).optional(),
});

export type SketchbookFields = z.infer<typeof fieldsSchema>;
