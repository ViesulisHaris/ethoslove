import { z } from "zod";

export const fieldsSchema = z.object({
  /** The storm. */
  look: z.enum(["storm", "blood", "swamp", "violet"]).default("storm"),
  /** The tag hanging on the gate. Defaults to "for {name}". */
  tag: z.string().trim().max(18).optional(),
});

export type HauntedHouseFields = z.infer<typeof fieldsSchema>;
