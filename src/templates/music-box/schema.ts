import { z } from "zod";

export const fieldsSchema = z.object({
  /** Who turns inside: a ballerina, or two swans who meet as a heart. */
  figurine: z.enum(["ballerina", "swans"]).default("ballerina"),
  /** What the comb plays when the key is wound. */
  tune: z.enum(["swan-lake", "lullaby", "fur-elise"]).default("swan-lake"),
  /** The lacquer, and the room around it. */
  box: z.enum(["blush", "ivory", "lilac", "sage"]).default("blush"),
});

export type MusicBoxFields = z.infer<typeof fieldsSchema>;

/** The fields as the template can use them: an old or half-made draft still opens, on the defaults. */
export function parseFields(input: unknown): MusicBoxFields {
  const parsed = fieldsSchema.safeParse(input ?? {});
  return parsed.success ? parsed.data : fieldsSchema.parse({});
}
