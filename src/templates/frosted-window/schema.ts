import { z } from "zod";

export const fieldsSchema = z.object({
  /** What the snowman's blackboard says, outside, once the frost is wiped away. */
  sign: z.string().trim().max(36).optional(),
  /** The room. */
  look: z.enum(["cottage", "cabin", "midnight"]).default("cottage"),
});

export type FrostedWindowFields = z.infer<typeof fieldsSchema>;
