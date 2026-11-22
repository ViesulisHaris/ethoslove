import { z } from "zod";

export const fieldsSchema = z.object({
  /** The house's paint. */
  look: z.enum(["evergreen", "nordic", "midnight"]).default("evergreen"),
});

export type AdventCalendarFields = z.infer<typeof fieldsSchema>;
