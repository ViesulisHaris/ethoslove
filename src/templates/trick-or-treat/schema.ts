import { z } from "zod";

export const fieldsSchema = z.object({
  palette: z.enum(["midnight", "pumpkin", "witch", "candy"]).default("midnight"),
  /** Who answers the door. */
  host: z.enum(["ghost", "cat", "pumpkin"]).default("ghost"),
  /** What the host says when the bell rings. Defaults to "trick or treat?". */
  doorLine: z.string().trim().max(40).optional(),
  /** The sign on the door. Defaults to "happy halloween". */
  sign: z.string().trim().max(24).optional(),
});

export type TrickOrTreatFields = z.infer<typeof fieldsSchema>;
