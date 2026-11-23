/**
 * The extras a holiday gives the gifts made for it, each with a last day that is real: a gift made by
 * then has it, one made after does not, and a gift that has it keeps it. One function decides, on the
 * print page, the share screen and the gift's dashboard page alike. Pure: no React, no database.
 *
 * "By 20 December" holds while it is still the 20th somewhere on earth: the last instant is noon UTC
 * on the 21st (the 20th ends last at UTC-12). The first instant is the start of 24 November, UTC.
 */
export const HOLIDAY_EXTRAS = [{ id: "tree-tag", from: "2026-11-24T00:00:00Z", until: "2026-12-21T12:00:00Z" }] as const;

export type HolidayExtra = (typeof HOLIDAY_EXTRAS)[number]["id"];

/**
 * The extra a gift came with, or null.
 *
 * "Made" is when the gift was first published. The gifts table keeps no first-publish time:
 * `published_at` is written again on every publish (an edit sent again moves it), and `created_at` is
 * when the draft began. The first publish lies between the two, so a gift counts when it was
 * published at or after the first day (`publishedAt`, the latest) and begun by the last instant
 * (`createdAt`). Every gift first published inside the window passes, and still passes after any
 * later edit: the rule never takes the extra back. `paid`: the gift's template is unlocked for its
 * owner; a free note gets nothing.
 */
export function extraFor(gift: { createdAt: string | null; publishedAt: string | null; paid: boolean }): HolidayExtra | null {
  if (!gift.paid || !gift.publishedAt) return null;
  const published = Date.parse(gift.publishedAt);
  const created = gift.createdAt ? Date.parse(gift.createdAt) : published;
  if (Number.isNaN(published) || Number.isNaN(created)) return null;
  for (const extra of HOLIDAY_EXTRAS) {
    if (published >= Date.parse(extra.from) && created <= Date.parse(extra.until)) return extra.id;
  }
  return null;
}
