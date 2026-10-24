import { z } from "zod";

export const fieldsSchema = z.object({
  /** The pumpkin. */
  look: z.enum(["orange", "white", "purple", "pink"]).default("orange"),
  /** The face carved into it. */
  face: z.enum(["classic", "sweet", "cat"]).default("classic"),
  /** The words carved across its belly. Defaults to their name. */
  carving: z.string().trim().max(12).optional(),
});

export type JackOLanternFields = z.infer<typeof fieldsSchema>;
