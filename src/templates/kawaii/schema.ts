import { z } from "zod";

export const fieldsSchema = z.object({
  theme: z.enum(["pink", "lavender", "mint", "cherry"]).default("pink"),
  character: z.enum(["bunny", "bear", "kitten"]).default("bunny"),
  /** Written on the ribbon banner under the character. */
  banner: z.string().trim().max(24).optional(),
  /** What the character says before the box opens. */
  greeting: z.string().trim().max(60).optional(),
});

export type KawaiiFields = z.infer<typeof fieldsSchema>;
