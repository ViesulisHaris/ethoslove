import { z } from "zod";

export const TRIP_KINDS = ["flight", "road", "train"] as const;
export type TripKind = (typeof TRIP_KINDS)[number];

/** As many as the suitcase and the road on the pass have room for. */
export const MAX_STOPS = 5;
export const MAX_CLUES = 5;

export const fieldsSchema = z.object({
  trip: z.enum(TRIP_KINDS).default("flight"),
  fromCity: z.string().min(1).max(40).default("Riga"),
  toCity: z.string().min(1).max(40).default("Lisbon"),
  /** Optional "lat, lng" overrides, as on the passport, for towns the built-in list doesn't know. */
  fromCoords: z.string().max(40).optional(),
  toCoords: z.string().max(40).optional(),
  /** Places on the way, in order. */
  stops: z.array(z.string().trim().min(1).max(40)).max(MAX_STOPS).default([]),
  /** What the ticket says for the date, e.g. "Fri 10 Oct". */
  when: z.string().max(40).default(""),
  nights: z.number().int().min(1).max(30).default(3),
  /** The packing list. Empty means a built-in list for that kind of trip, in the gift's language. */
  clues: z.array(z.string().trim().min(1).max(40)).max(MAX_CLUES).default([]),
});

export type PackYourBagsFields = z.infer<typeof fieldsSchema>;
