import { z } from "zod";

export const fieldsSchema = z.object({
  theme: z.enum(["blossom", "leopard", "seaside", "sunshine", "film"]).default("blossom"),
  /** The cut-out-letter title at the top of the page. Defaults to the theme's own. */
  headline: z.string().trim().max(28).optional(),
  /** One line in handwriting on the torn note. */
  quote: z.string().trim().max(90).optional(),
  /** A few typewritten words on the pinned note; "·" starts a new line. */
  tag: z.string().trim().max(40).optional(),
});

export type ScrapbookFields = z.infer<typeof fieldsSchema>;
