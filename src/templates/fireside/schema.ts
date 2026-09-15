import { z } from "zod";

export const fieldsSchema = z.object({
  /** The colour of the room once the candle is lit. */
  mood: z.enum(["amber", "maple", "moss"]).default("amber"),
  /** What falls past the window. */
  outside: z.enum(["leaves", "snow"]).default("leaves"),
  drink: z.enum(["cocoa", "tea", "coffee"]).default("cocoa"),
  /** Written on the tag tied to the candle. Defaults to "for {name}". */
  tag: z.string().trim().max(24).optional(),
});

export type FiresideFields = z.infer<typeof fieldsSchema>;
