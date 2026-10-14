import { z } from "zod";

export const fieldsSchema = z.object({
  look: z.enum(["rust", "espresso", "olive"]).default("rust"),
  /** The line in words cut out of a book. Defaults to "and if my wishes came true, it would've been you". */
  wish: z.string().trim().max(60).optional(),
  /** What the cinema ticket admits them to. Defaults to "admit two: autumn matinee". */
  ticket: z.string().trim().max(26).optional(),
});

export type AutumnReelFields = z.infer<typeof fieldsSchema>;
