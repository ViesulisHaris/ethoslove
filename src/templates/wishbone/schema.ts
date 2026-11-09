import { z } from "zod";

export const fieldsSchema = z.object({
  /** Whose side keeps the big half. */
  winner: z.enum(["them", "me"]).default("them"),
  /** What you wished for. */
  wish: z.string().trim().max(120).optional(),
  /** The table. */
  look: z.enum(["gingham", "harvest", "sage", "candlelit"]).default("gingham"),
});

export type WishboneFields = z.infer<typeof fieldsSchema>;
