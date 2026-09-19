import { z } from "zod";

export const fieldsSchema = z.object({
  /** What they stand accused of, after "charged with". Defaults to the house charge. */
  charge: z.string().trim().max(60).optional(),
  /** One finding per cat, read out in order. Empty falls back to the house findings. */
  findings: z.array(z.string().trim().max(90)).max(6).default([]),
  verdict: z.enum(["guilty", "approved", "certified", "pardoned"]).default("guilty"),
  bench: z.enum(["oak", "rose", "night"]).default("oak"),
});

export type CouncilFields = z.infer<typeof fieldsSchema>;
