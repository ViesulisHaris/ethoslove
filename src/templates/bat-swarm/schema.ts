import { z } from "zod";

export const fieldsSchema = z.object({
  /** The sky and the moon. */
  look: z.enum(["midnight", "harvest", "blood", "frost"]).default("midnight"),
  /** A few words the bats spell after the name and before the heart, such as "be mine". Optional. */
  line: z.string().trim().max(14).optional(),
});

export type BatSwarmFields = z.infer<typeof fieldsSchema>;
