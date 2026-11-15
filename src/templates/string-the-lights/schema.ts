import { z } from "zod";

export const fieldsSchema = z.object({
  /** What comes on in lights on the board in the garden, once the switch is thrown. */
  sign: z.string().trim().max(28).optional(),
  /** The house. */
  look: z.enum(["red", "navy", "sage"]).default("red"),
});

export type StringTheLightsFields = z.infer<typeof fieldsSchema>;
