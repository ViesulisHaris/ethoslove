import { z } from "zod";

export const fieldsSchema = z.object({
  look: z.enum(["blush", "lilac", "peach"]).default("blush"),
  /** The words on the torn note in the middle of the page. Defaults to "favorite person". */
  title: z.string().trim().max(22).optional(),
  /** The words written at the foot of the bouquet. Defaults to "love you". */
  signoff: z.string().trim().max(18).optional(),
});

export type FavoritePersonFields = z.infer<typeof fieldsSchema>;
