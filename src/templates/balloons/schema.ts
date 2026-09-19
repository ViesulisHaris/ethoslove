import { z } from "zod";

export const fieldsSchema = z.object({
  /** Their age, as gold foil number balloons. Nothing shows without it. */
  age: z.number().int().min(1).max(120).optional(),
  palette: z.enum(["pastel", "sunset", "jewel", "cream"]).default("pastel"),
  /** The line on the bunting, a letter per pennant. Defaults to "happy birthday". */
  banner: z.string().trim().max(24).optional(),
  /** The line in handwriting on the wall, under the numbers. Defaults to their name. */
  wall: z.string().trim().max(30).optional(),
});

export type BalloonsFields = z.infer<typeof fieldsSchema>;
