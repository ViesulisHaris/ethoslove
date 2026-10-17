import { z } from "zod";

export const fieldsSchema = z.object({
  look: z.enum(["sunset", "lilac", "night"]).default("sunset"),
  /** The note on grid paper under the player. Defaults to "you're my favorite song". */
  note: z.string().trim().max(60).optional(),
  /** The playlist's name. Defaults to "our playlist". */
  playlist: z.string().trim().max(24).optional(),
});

export type OnRepeatFields = z.infer<typeof fieldsSchema>;
