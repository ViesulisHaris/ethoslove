/**
 * The extras a holiday gives the gifts made for it, each with a last day that is real: a gift made by
 * then has it, one made after does not, and a gift that has it keeps it. Pure: no React, no database.
 *
 * "Made" is the gift's first publish. The gifts table keeps no first-publish time (`published_at` is
 * written again on every publish, `created_at` is when the draft began, which can be long before), so
 * the extra is decided at a publish and stamped on the gift's data (`data.holidayExtra`,
 * src/app/actions/gift.ts publishGift), and kept from then on. The print page, the share screen and
 * the gift's dashboard page read that stamp; only a gift sent while the switch was off, with no stamp,
 * is worked out from its two dates (showsExtra).
 *
 * "By 20 December" holds while it is still the 20th somewhere on earth: the 20th ends last at UTC-12,
 * at noon UTC on the 21st, so that instant is the first one *after* the days. The first instant is the
 * start of 24 November, UTC.
 *
 * It ships switched off: nothing is stamped or offered until NEXT_PUBLIC_TREE_TAG is "1" (the owner's
 * call, docs/marketing/holiday-emails/README.md). Gifts stamped while it was on keep the stamp; with it
 * off again they are offered nothing.
 *
 * `offeredUntil` is when the gifts that have it stop being offered it: a tag to scan on Christmas morning
 * is no use after Christmas, so the row and the print shape go once the 25th has ended everywhere.
 */
export const HOLIDAY_EXTRAS = [{ id: "tree-tag", from: "2026-11-24T00:00:00Z", until: "2026-12-21T12:00:00Z", offeredUntil: "2026-12-26T12:00:00Z" }] as const;

export type HolidayExtra = (typeof HOLIDAY_EXTRAS)[number]["id"];

const IDS: readonly string[] = HOLIDAY_EXTRAS.map((e) => e.id);

/** Whether this build gives holiday extras at all: NEXT_PUBLIC_TREE_TAG=1. Unset is off. */
export function holidayExtrasOn(raw: string | undefined = process.env.NEXT_PUBLIC_TREE_TAG): boolean {
  return raw === "1";
}

/**
 * The extra a gift first published at `madeAt` gets, or null: `from` <= madeAt < `until`. `paid`: the
 * gift's template is unlocked for its owner; a free gift gets nothing.
 */
export function extraFor(gift: { madeAt: string | number | null; paid: boolean }): HolidayExtra | null {
  if (!gift.paid || gift.madeAt === null) return null;
  const made = typeof gift.madeAt === "number" ? gift.madeAt : Date.parse(gift.madeAt);
  if (Number.isNaN(made)) return null;
  for (const extra of HOLIDAY_EXTRAS) {
    if (made >= Date.parse(extra.from) && made < Date.parse(extra.until)) return extra.id;
  }
  return null;
}

/** The stamp a gift's stored data carries, read without trusting its shape. */
export function stampedExtra(data: unknown): HolidayExtra | null {
  const value = data && typeof data === "object" ? (data as { holidayExtra?: unknown }).holidayExtra : undefined;
  return typeof value === "string" && IDS.includes(value) ? (value as HolidayExtra) : null;
}

/** Whether a draft begun at `createdAt` was begun inside the extra's days (on or after its first day). */
function begunInside(extra: HolidayExtra, createdAt: string | null | undefined): boolean {
  const begun = createdAt ? Date.parse(createdAt) : NaN;
  const days = HOLIDAY_EXTRAS.find((e) => e.id === extra);
  return Boolean(days) && !Number.isNaN(begun) && begun >= Date.parse(days!.from);
}

/**
 * The stamp a publish writes. A gift that has the extra keeps it, whatever happens after. A gift's
 * first publish (it has never been out: no `published_at`) is decided now. A later publish of a gift
 * with no stamp is decided now too, but only for a gift begun inside the days (`createdAt`): one sent
 * free on 1 December and paid for and sent again on the 5th gets it, and so does one sent before the
 * switch went on and sent again after; a gift from before 24 November re-sent inside the days does
 * not. What the browser sends is never read.
 */
export function holidayExtraAtPublish(
  row: { publishedBefore: boolean; stored: unknown; createdAt?: string | null },
  now: number,
  paid: boolean,
  on: boolean = holidayExtrasOn(),
): HolidayExtra | undefined {
  const kept = stampedExtra(row.stored);
  if (kept) return kept;
  if (!on) return undefined;
  const extra = extraFor({ madeAt: now, paid });
  if (!extra) return undefined;
  if (row.publishedBefore && !begunInside(extra, row.createdAt)) return undefined;
  return extra;
}

/**
 * Whether a gift shows its extra at `now`: it is out (not a draft), it has the extra, the extra is still
 * offered, and the build gives extras. It has the extra when it carries the stamp, or, for a gift sent
 * while the switch was off and not sent since, when it was begun inside the days (`created_at`) and last
 * sent before they ended (`published_at`): its first send lies between the two, so inside the days.
 * Whether it was paid is the caller's to ask (lib/gift/dashboard.ts holidayExtraOf).
 */
export function showsExtra(
  gift: { status: string; data: unknown; created_at?: string | null; published_at?: string | null },
  now: number = Date.now(),
  on: boolean = holidayExtrasOn(),
): HolidayExtra | null {
  if (!on || gift.status === "draft") return null;
  const stamp = stampedExtra(gift.data);
  const extra = stamp
    ? HOLIDAY_EXTRAS.find((e) => e.id === stamp)
    : HOLIDAY_EXTRAS.find((e) => begunInside(e.id, gift.created_at) && gift.published_at && Date.parse(gift.published_at) < Date.parse(e.until));
  return extra && now < Date.parse(extra.offeredUntil) ? extra.id : null;
}
