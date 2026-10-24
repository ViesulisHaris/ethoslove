import { z } from "zod";
import { REMINDER_NAME_MAX, REMINDER_OCCASIONS, isRealDay } from "@/lib/lifecycle/reminders";
import { MONTHSARY_NAME_MAX } from "@/lib/lifecycle/monthsaries";

/*
 * Apart from ./reminders on purpose, like dates/review-input: the reminder list and the share
 * screen's "Remind me next year" import the dates and labels from there, and zod beside them put
 * the whole library on /account/reminders to check a body only the server ever reads.
 */

/**
 * Characters that show nothing (zero-width spaces and joiners, the byte-order mark) or turn the text
 * round (bidirectional controls): a name made of them alone would be an empty-looking reminder, and
 * one with them inside would print backwards in its email.
 */
const UNSEEN = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;

/** The name the way a reminder keeps it: nothing unseen, spaces squeezed and trimmed, so "Ana" and " Ana " are one. */
const squeezed = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(UNSEEN, "").replace(/\s+/g, " ").trim())
    .pipe(z.string().min(1).max(max));

/** What POST /api/reminders takes. The name is cleaned and squeezed so "Ana" and " Ana " are one reminder. */
export const reminderInput = z
  .object({
    recipientName: squeezed(REMINDER_NAME_MAX),
    occasion: z.enum(REMINDER_OCCASIONS),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
    locale: z.enum(["en", "es"]).default("en"),
    templateSlug: z.string().regex(/^[a-z0-9-]{1,60}$/).optional(),
    /** The day the gift counts down to (countdownDay), so the occasion it was made for isn't reminded about. */
    giftDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    /**
     * Whether this is the occasion the gift was just made for (the default, as every page before the
     * share screen's fuller card sends it): then this year's email is skipped when the day is near.
     * The card's other rows (their birthday, your anniversary, Valentine's Day, someone else) are
     * other days, and get this year's email whenever there is still time for it.
     */
    forThisGift: z.boolean().default(true),
  })
  .refine((r) => isRealDay(r), { message: "not_a_day", path: ["day"] });
export type ReminderInput = z.input<typeof reminderInput>;

/** What POST /api/monthsaries takes. Whether `since` is a real day, and not to come, is the route's to check (it knows today). */
export const monthsaryInput = z.object({
  partnerName: squeezed(MONTHSARY_NAME_MAX),
  since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  locale: z.enum(["en", "es"]).default("en"),
});
export type MonthsaryInput = z.input<typeof monthsaryInput>;
