import { OCCASIONS, OCCASION_META, type Occasion } from "@/config/occasions";
import { SEASONS, occasionsInSeason, type FinderDay } from "@/lib/gift/finder";

/**
 * The order of the gallery's row of occasions on a day. The row was the catalogue's own order,
 * which put Christmas seventh and Thanksgiving ninth in the last week of November, out of sight on
 * a phone, while the finder already led with the season (the review of 22 Nov 2026).
 *
 * First what the finder says is in season (lib/gift/finder.ts: Christmas from 15 Nov, Valentine's
 * from 25 Jan, each to its day). Then a day that has no dated season there but falls in this month
 * (config/occasions.ts, `peakMonth`: Thanksgiving in November, Halloween in October, Mother's Day in
 * May). Then the rest as the catalogue lists them. A day with a dated season is not led by its
 * month as well: Christmas does not stay first from the 26th to the 31st.
 *
 * `day` is the date the page was rendered with ("2026-11-22"), so the server and the browser agree.
 * Without one the row is the catalogue's order.
 */
export function occasionRow(day?: FinderDay): Occasion[] {
  if (!day) return [...OCCASIONS];
  const season = occasionsInSeason(day);
  const month = Number(day.split("-")[1]);
  const dated = SEASONS.map((s) => s.occasion);
  const thisMonth = OCCASIONS.filter((o) => OCCASION_META[o].peakMonth === month && !dated.includes(o));
  const first = [...season, ...thisMonth];
  return [...first, ...OCCASIONS.filter((o) => !first.includes(o))];
}
