import { getManifest } from "@/templates/manifests";
import { reminderOccasionFor } from "./reminders";

/** "Pack your bags" (lib/trips/trip-gift.ts, TRIP_GIFT_SLUG). Written out: that module brings the trips with it, and this one runs in the editor. */
const TRIP_GIFT = "pack-your-bags";

/**
 * Whether the share screen offers date ideas under the reminders: a gift whose template is an
 * anniversary one, by the reminder card's own rule (its first occasion), so the line and the row
 * above it ("Your anniversary") agree. Not the trip gift: its screen already has the trip to book.
 */
export const showsAnniversaryDates = (templateSlug: string): boolean => templateSlug !== TRIP_GIFT && reminderOccasionFor(getManifest(templateSlug)?.occasions) === "anniversary";
