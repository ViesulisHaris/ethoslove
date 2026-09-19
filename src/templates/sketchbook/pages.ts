import type { GiftPhoto } from "@/lib/gift/schema";

/**
 * What goes on each page of the sketchbook, from the photos there are. Pure, so the order of
 * the pages is the same everywhere and a test can hold it to account.
 */
export type Page =
  | { kind: "cake" }
  | { kind: "photos"; photos: GiftPhoto[]; index: number }
  | { kind: "letter" };

/** Two photos a page, the first page's pair drawn the largest; the cake before, the letter after. */
export function buildPages(photos: GiftPhoto[]): Page[] {
  const pages: Page[] = [{ kind: "cake" }];
  const list = photos.slice(0, 12);
  for (let i = 0; i < list.length; i += 2) pages.push({ kind: "photos", photos: list.slice(i, i + 2), index: pages.length - 1 });
  pages.push({ kind: "letter" });
  return pages;
}

/** How far through the book a page is, as the progress a gift reports. */
export function pageProgress(index: number, total: number): number {
  if (total <= 1) return 100;
  return Math.round((index / (total - 1)) * 100);
}
