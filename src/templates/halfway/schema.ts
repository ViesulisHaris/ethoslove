import { z } from "zod";

/** A place on the postcard: the name as the sender picked it, and where it really is. */
export const placeSchema = z.object({
  name: z.string().trim().min(1).max(60),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type MapPlace = z.infer<typeof placeSchema>;

export const MAX_STOPS = 4;

/** The colours an island can be; each sets its land, roof, bushes, ribbon and lettering together. */
export const ISLAND_IDS = ["pink", "peach", "mint", "lilac"] as const;
export type IslandId = (typeof ISLAND_IDS)[number];

export const fieldsSchema = z.object({
  from: placeSchema.default({ name: "Lisbon", lat: 38.7223, lng: -9.1393 }),
  to: placeSchema.default({ name: "Boston", lat: 42.3601, lng: -71.0589 }),
  /** Places they've met in the middle, in order: counted in the distance and stamped on the postcard. */
  stops: z.array(placeSchema).max(MAX_STOPS).default([]),
  /** Left empty, the distance is worked out from the places; set, it's the sender's own number. */
  distanceKm: z.number().int().min(1).max(40000).optional(),
  vehicle: z.enum(["plane", "balloon", "bird"]).default("plane"),
  yourIsland: z.enum(ISLAND_IDS).default("pink"),
  theirIsland: z.enum(ISLAND_IDS).default("peach"),
  palette: z.enum(["blush", "sea", "butter", "dusk"]).default("blush"),
  halfwayNote: z.string().max(120).optional(),
});

export type HalfwayFields = z.infer<typeof fieldsSchema>;
