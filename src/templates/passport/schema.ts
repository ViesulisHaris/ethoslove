import { z } from "zod";

export const fieldsSchema = z.object({
  fromCity: z.string().min(1).max(40).default("Riga"),
  toCity: z.string().min(1).max(40).default("Lisbon"),
  /** Optional "lat, lng" overrides for towns not in the built-in list. */
  fromCoords: z.string().max(40).optional(),
  toCoords: z.string().max(40).optional(),
  /** Stopover city names, in order. */
  stops: z.array(z.string().trim().min(1).max(40)).max(6).default([]),
  nationality: z.string().max(40).optional(),
  cover: z.enum(["navy", "burgundy", "forest", "black"]).default("navy"),
});

export type PassportFields = z.infer<typeof fieldsSchema>;
