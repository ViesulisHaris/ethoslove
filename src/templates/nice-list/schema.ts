import { z } from "zod";

export const fieldsSchema = z.object({
  /** What the stamp says. */
  verdict: z.enum(["nice", "naughty", "both"]).default("nice"),
  /** The good deeds on the list, a line each. */
  nice: z.array(z.string().trim().max(50)).max(4).default([]),
  /** The crimes on the list, a line each. */
  naughty: z.array(z.string().trim().max(50)).max(4).default([]),
  /** The room and the scroll's colours. */
  look: z.enum(["red", "pink", "blue", "green"]).default("red"),
});

export type NiceListFields = z.infer<typeof fieldsSchema>;
