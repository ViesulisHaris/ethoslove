import { z } from "zod";

/** How long one line on a tag may be: three short lines of handwriting on a tag the size of a strawberry. */
export const LABEL_MAX = 48;

export const fieldsSchema = z.object({
  /** One short line per thing in the basket, in the order they come out. */
  labels: z.array(z.string().trim().min(1).max(LABEL_MAX)).min(3).max(8).default([]),
  blanket: z.enum(["pink", "blue", "red", "lilac"]).default("pink"),
});

export type PicnicFields = z.infer<typeof fieldsSchema>;
export type BlanketId = PicnicFields["blanket"];
