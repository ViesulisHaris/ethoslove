import { z } from "zod";

/** What is in the glasses. Four, so the editor draws them as buttons. */
export const POURS = ["champagne", "red", "white", "sparkling"] as const;
export type Pour = (typeof POURS)[number];

/** The shape on the table: a flute, a coupe, or a wine glass. */
export const GLASSES = ["flute", "coupe", "wine"] as const;
export type GlassShape = (typeof GLASSES)[number];

/** The evening behind the table. */
export const LIGHTS = ["candlelit", "golden", "midnight"] as const;
export type Light = (typeof LIGHTS)[number];

export const fieldsSchema = z.object({
  pour: z.enum(POURS).default("champagne"),
  glasses: z.enum(GLASSES).default("flute"),
  /** How the speech opens: "To Ana and Marco". Left empty, it's written from their name. */
  opening: z.string().max(70).default(""),
  /** The place, printed on the menu card. */
  venue: z.string().max(60).default(""),
  /** The date, printed under it. Free text, so "midsummer" is as good as a date. */
  dateLine: z.string().max(40).default(""),
  light: z.enum(LIGHTS).default("candlelit"),
});

export type ToastFields = z.infer<typeof fieldsSchema>;
