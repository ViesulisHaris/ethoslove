import { z } from "zod";

export const fieldsSchema = z.object({
  theme: z.enum(["vanilla", "midnight", "kraft", "cherry"]).default("vanilla"),
  /** Their age: the number on the cake's topper, and how many candles up to five. */
  age: z.number().int().min(1).max(120).optional(),
  /** The line on the pennants over the cake. Defaults to "happy birthday". */
  banner: z.string().trim().max(20).optional(),
  /** How the candles go out. "auto" tries the microphone first, then falls back to a swipe. */
  flames: z.enum(["auto", "swipe"]).default("auto"),
});

export type PopupCardFields = z.infer<typeof fieldsSchema>;
