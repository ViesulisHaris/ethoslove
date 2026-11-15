import { z } from "zod";

export const fieldsSchema = z.object({
  /** The kitchen. */
  look: z.enum(["cosy", "midnight", "berry"]).default("cosy"),
});

export type GingerbreadHouseFields = z.infer<typeof fieldsSchema>;
