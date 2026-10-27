import { getManifest } from "@/templates/manifests";
import { nextOccurrence, type MonthDay } from "./reminders";

/**
 * The days the success page's "every template, forever" talks about: the ones a couple keeps coming
 * back for. Words only: nothing here is sold or sent on a date.
 */
export type AheadOccasion = "birthday" | "anniversary" | "valentines" | "christmas" | "halloween";

const ON: Record<"valentines" | "christmas", MonthDay> = { valentines: { month: 2, day: 14 }, christmas: { month: 12, day: 25 } };
const SORTABLE: readonly string[] = ["birthday", "anniversary", "valentines", "christmas", "halloween"];

/**
 * The occasion the gift just bought is for, when its template leaves no doubt: one made for a
 * single occasion (Birthday Cinema, the Halloween ones). Most templates suit several, and the success
 * page knows nothing else about the gift (no gift ever reaches Stripe), so for those it says nothing.
 */
export function sortedOccasion(slugs: readonly string[]): AheadOccasion | null {
  if (slugs.length !== 1) return null;
  const occasions = getManifest(slugs[0])?.occasions ?? [];
  const only = occasions.length === 1 ? occasions[0] : null;
  return only && SORTABLE.includes(only) ? (only as AheadOccasion) : null;
}

/**
 * What is still ahead once that one is sorted: their birthday and your anniversary, whenever they
 * fall, then Christmas and Valentine's Day, the nearer one first. Halloween is never ahead: by the
 * time it is near, the Halloween templates are what bought it.
 */
export function occasionsAhead(sorted: AheadOccasion | null, today: Date): AheadOccasion[] {
  const dated = (["christmas", "valentines"] as const)
    .map((occasion) => ({ occasion, at: nextOccurrence(ON[occasion], today).getTime() }))
    .sort((a, b) => a.at - b.at)
    .map(({ occasion }) => occasion);
  return (["birthday", "anniversary", ...dated] as AheadOccasion[]).filter((occasion) => occasion !== sorted);
}
