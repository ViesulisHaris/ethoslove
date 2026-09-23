import { z } from "zod";
import { REMINDER_NAME_MAX, REMINDER_OCCASIONS, isRealDay } from "@/lib/lifecycle/reminders";

/*
 * Apart from ./reminders on purpose, like dates/review-input: the reminder list and the share
 * screen's "Remind me next year" import the dates and labels from there, and zod beside them put
 * the whole library on /account/reminders to check a body only the server ever reads.
 */

/** What POST /api/reminders takes. The name is trimmed and squeezed so "Ana" and " Ana " are one reminder. */
export const reminderInput = z
  .object({
    recipientName: z
      .string()
      .transform((s) => s.replace(/\s+/g, " ").trim())
      .pipe(z.string().min(1).max(REMINDER_NAME_MAX)),
    occasion: z.enum(REMINDER_OCCASIONS),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
    locale: z.enum(["en", "es"]).default("en"),
    templateSlug: z.string().regex(/^[a-z0-9-]{1,60}$/).optional(),
    /** The day the gift counts down to (countdownDay), so the occasion it was made for isn't reminded about. */
    giftDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .refine((r) => isRealDay(r), { message: "not_a_day", path: ["day"] });
export type ReminderInput = z.input<typeof reminderInput>;
