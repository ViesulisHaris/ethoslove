import { z } from "zod";

export const fieldsSchema = z.object({
  flower: z.enum(["peony", "tulip", "daisy"]).default("peony"),
  /** Petal colour; defaults to the gift accent. */
  petalColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  sky: z.enum(["dawn", "dusk", "paper"]).default("dawn"),
  pollen: z.boolean().default(true),
  /** The die-cut stickers scattered around the flower. */
  stickers: z.boolean().default(true),
  /** The windowsill and the pot the stem rises out of; off leaves the flower in the light. */
  pot: z.boolean().default(true),
});

export type BloomFields = z.infer<typeof fieldsSchema>;
