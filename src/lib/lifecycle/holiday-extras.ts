/**
 * The extras a holiday gives the gifts made for it, each with a last day that is real: a gift made by
 * then has it, one made after does not, and a gift that has it keeps it. Pure: no React, no database.
 *
 * "Made" is the gift's first publish. The gifts table keeps no first-publish time (`published_at` is
 * written again on every publish, `created_at` is when the draft began, which can be long before), so
 * the extra is decided at a publish and stamped on the gift's data (`data.holidayExtra`,
 * src/app/actions/gift.ts publishGift), and kept from then on. The print page, the share screen and
 * the gift's dashboard page read that stamp; only a gift sent while the switch was off, with no stamp,
 * is worked out from its row (sentWithExtra).
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

/**
 * The extra a gift paid for now would come with, to say so before paying (the paywall): inside the
 * extra's days and with the switch on. Whether the gift is then sent inside the days is the publish's
 * to decide (holidayExtraAtPublish); the line says "made by 20 December" for that.
 */
export function extraOnOffer(now: number = Date.now(), on: boolean = holidayExtrasOn()): HolidayExtra | null {
  return on ? extraFor({ madeAt: now, paid: true }) : null;
}

/** The stamp a gift's stored data carries, read without trusting its shape. */
export function stampedExtra(data: unknown): HolidayExtra | null {
  const value = data && typeof data === "object" ? (data as { holidayExtra?: unknown }).holidayExtra : undefined;
  return typeof value === "string" && IDS.includes(value) ? (value as HolidayExtra) : null;
}

/** A gift's data with its stamp taken off, for a copy of it (duplicateGift): a copy is a new gift. */
export function withoutHolidayExtra<T>(data: T): T {
  if (!data || typeof data !== "object" || Array.isArray(data) || !("holidayExtra" in data)) return data;
  const copy = { ...(data as Record<string, unknown>) };
  delete copy.holidayExtra;
  return copy as T;
}

/** Whether a draft begun at `createdAt` was begun inside the extra's days (on or after its first day). */
function begunInside(extra: HolidayExtra, createdAt: string | null | undefined): boolean {
  const begun = createdAt ? Date.parse(createdAt) : NaN;
  const days = HOLIDAY_EXTRAS.find((e) => e.id === extra);
  return Boolean(days) && !Number.isNaN(begun) && begun >= Date.parse(days!.from);
}

/** What a gift's row says about its last send: when it began, when it was last sent, and whether that send carried the footer. */
export type SentRow = { created_at?: string | null; published_at?: string | null; watermark?: boolean | null };

/**
 * The extra a gift sent with no stamp (while the switch was off) came with, worked out from its row: it
 * was begun inside the days (`created_at`), last sent before they ended (`published_at`), so its first
 * send lies inside them, and that send was paid (`watermark` false: the server drops the footer only for
 * an owner who holds the template's unlock, lib/gift/publish.ts). A gift sent free is not offered it later
 * because its owner buys the unlock after; only sending it again, paid, inside the days decides that.
 */
export function sentWithExtra(row: SentRow): HolidayExtra | null {
  if (row.watermark !== false || !row.published_at) return null;
  const sent = Date.parse(row.published_at);
  const extra = HOLIDAY_EXTRAS.find((e) => begunInside(e.id, row.created_at) && sent < Date.parse(e.until));
  return extra ? extra.id : null;
}

/**
 * The stamp a publish writes. A gift that has the extra keeps it, whatever happens after: its stamp, or,
 * sent while the switch was off, what its row says (sentWithExtra). A stamp is only ever kept by a gift
 * that has been out: a draft copied from a stamped gift (duplicateGift) carries the stamp in its data but
 * is decided at its own first publish. A gift's first publish is decided now. A later publish of a gift
 * with no stamp is decided now too, but only for a gift begun inside the days (`createdAt`): one sent
 * free on 1 December and paid for and sent again on the 5th gets it; a gift from before 24 November
 * re-sent inside the days does not. What the browser sends is never read.
 */
export function holidayExtraAtPublish(
  row: { publishedBefore: boolean; stored: unknown; createdAt?: string | null; publishedAt?: string | null; watermark?: boolean | null },
  now: number,
  paid: boolean,
  on: boolean = holidayExtrasOn(),
): HolidayExtra | undefined {
  const kept = row.publishedBefore ? stampedExtra(row.stored) : null;
  if (kept) return kept;
  if (!on) return undefined;
  // Sent while the switch was off with what gives it the extra: it has it, so it keeps it now.
  const had = row.publishedBefore ? sentWithExtra({ created_at: row.createdAt, published_at: row.publishedAt, watermark: row.watermark }) : null;
  if (had) return had;
  const extra = extraFor({ madeAt: now, paid });
  if (!extra) return undefined;
  if (row.publishedBefore && !begunInside(extra, row.createdAt)) return undefined;
  return extra;
}

/**
 * Whether a gift shows its extra at `now`: it is out (not a draft), it has the extra, the extra is still
 * offered, and the build gives extras. It has the extra when it carries the stamp, or, for a gift sent
 * while the switch was off and not sent since, when its row says so (sentWithExtra). Whether the owner
 * still holds the unlock is the caller's to ask (lib/gift/dashboard.ts holidayExtraOf).
 */
export function showsExtra(gift: { status: string; data: unknown } & SentRow, now: number = Date.now(), on: boolean = holidayExtrasOn()): HolidayExtra | null {
  if (!on || gift.status === "draft") return null;
  const id = stampedExtra(gift.data) ?? sentWithExtra(gift);
  const extra = id ? HOLIDAY_EXTRAS.find((e) => e.id === id) : undefined;
  return extra && now < Date.parse(extra.offeredUntil) ? extra.id : null;
}
