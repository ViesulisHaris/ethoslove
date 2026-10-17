import { z } from "zod";

/**
 * What a review looks like on the way in. Short on purpose: it is a line for the next couple, not
 * an essay. Apart from ./reviews on purpose, like client-error-schema: the place sheet imports the
 * labels from there, and zod beside them put 85 KB (gzipped) of script on /dates to build an
 * object only the server ever uses.
 */
export const reviewInput = z.object({
  placeId: z.string().regex(/^(node|way|relation)\/\d{1,15}$/),
  stars: z.number().int().min(1).max(5),
  cost: z.number().int().min(0).max(3).nullable().optional(),
  wentAs: z.enum(["first", "date", "anniversary", "birthday", "friends"]).nullable().optional(),
  body: z.string().trim().max(400).optional(),
  placeName: z.string().trim().min(1).max(120),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  locale: z.enum(["en", "es"]).optional(),
});
export type ReviewInput = z.infer<typeof reviewInput>;
