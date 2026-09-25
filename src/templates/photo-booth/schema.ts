import { z } from "zod";

export const fieldsSchema = z.object({
  /** The booth's lacquer. */
  booth: z.enum(["cherry", "blush", "noir", "mint"]).default("cherry"),
  /** How the strip prints. */
  filter: z.enum(["color", "bw", "sepia"]).default("color"),
  /** A few words in handwriting on the wall, next to the strip. Defaults to "my favourite person". */
  line: z.string().trim().max(40).optional(),
  /** The lit sign on top of the booth; "·" starts its second line. Defaults to "PHOTOS · 4 POSES". */
  sign: z.string().trim().max(24).optional(),
});

export type PhotoBoothFields = z.infer<typeof fieldsSchema>;
