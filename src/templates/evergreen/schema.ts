import { z } from "zod";

export const fieldsSchema = z.object({
  look: z.enum(["sage", "olive", "mint"]).default("sage"),
  /** The words written across the record and the newsprint. Defaults to "my evergreen". */
  title: z.string().trim().max(22).optional(),
});

export type EvergreenFields = z.infer<typeof fieldsSchema>;
