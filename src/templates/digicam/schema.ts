import { z } from "zod";

/** The camera's body. Four, so the editor draws them as buttons. */
export const BODIES = ["pink", "silver", "lilac", "black"] as const;
export type Body = (typeof BODIES)[number];

export const fieldsSchema = z.object({
  /** A birthday gift: the title wishes it, and so does the camera when it says hello. */
  birthday: z.boolean().default(true),
  /** The line in cut-out letters above the camera. Empty: "happy birthday", or their name when it isn't. */
  headline: z.string().trim().max(24).optional(),
  body: z.enum(BODIES).default("pink"),
  /** The orange date in the corner of every photo. */
  stamp: z.boolean().default(true),
  /** The date on the photos, "2026-09-25". Empty: the day of the countdown, or the day they open it. */
  stampDate: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).optional(),
});

export type DigicamFields = z.infer<typeof fieldsSchema>;
