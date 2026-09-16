import { z } from "zod";

export const fieldsSchema = z.object({
  /** The world the walk happens in: its sky, its light, its ground. */
  garden: z.enum(["blush", "wild", "dusk", "moonlit"]).default("blush"),
  /** What is growing in the beds. */
  blooms: z.enum(["wildflowers", "roses", "peonies", "sunflowers"]).default("wildflowers"),
  /** Someone small who walks the whole way with them. */
  companion: z.enum(["butterfly", "bee", "cat", "none"]).default("butterfly"),
  /** The words burnt into the sign hanging on the gate. Empty: their name. */
  sign: z.string().max(24).optional(),
  /** The tag tied to the bouquet at the end. Empty: "For {name}". */
  tag: z.string().max(60).optional(),
});

export type GardenFields = z.infer<typeof fieldsSchema>;
