import { z } from "zod";

/** The tassel colours the cap can be drawn with; each sets the cord, the band and the fringe. */
export const TASSEL_IDS = ["gold", "crimson", "sky", "white"] as const;
export type TasselId = (typeof TASSEL_IDS)[number];

/** Gown and sky together: a navy evening or a black one. */
export const GOWN_IDS = ["navy", "black"] as const;
export type GownId = (typeof GOWN_IDS)[number];

export const fieldsSchema = z.object({
  /** On the banner and on the diploma: "Class of 2026", "Promoción 2026". */
  year: z.string().trim().max(12).default("2026"),
  /** The course, the school, the year group — whatever goes under the year. */
  school: z.string().trim().max(60).default(""),
  /** The line on the diploma, after "Awarded for". */
  awardedFor: z.string().trim().max(90).default(""),
  tassel: z.enum(TASSEL_IDS).default("gold"),
  gown: z.enum(GOWN_IDS).default("navy"),
});

export type CapTossFields = z.infer<typeof fieldsSchema>;
