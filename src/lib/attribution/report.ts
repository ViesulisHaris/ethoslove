import { DAY_MS, iso, type Db } from "@/lib/commerce/db";
import type { Channel } from "./source";

/**
 * Revenue by where buyers came from, over the last 7 and 28 days: by channel, by landing page and by
 * source, with the checkouts each started. Read by the cloud SEO routine through
 * GET /api/internal/sales (docs/blog/SEO-DATA.md), so it can work on the pages that sell, not only
 * the ones that are seen. The same numbers as the SQL in docs/marketing/REVENUE-BY-SOURCE.md.
 *
 * Website sales only (Stripe): Etsy and the App Store bring their own buyers. A sale is counted on
 * the day its purchase row was made; refunded sales are left out. Counts and sums only: no buyer,
 * purchase or gift appears in it.
 */

/** Fixed rates, only to rank pages by one number; the sums in each currency are given as well. */
export const EUR_RATES: Readonly<Record<string, number>> = { eur: 1, usd: 0.86, gbp: 1.16 };
export const REPORT_WINDOWS = [7, 28] as const;

/** For a sale whose checkout has no record: from before 0019, or a page opened before it shipped. */
export const NOT_RECORDED = "(not recorded)";

export type PaidSale = { id: string; amount: number; currency: string; created_at: string; store?: string | null };
export type SourceRecord = { purchase_id: string; created_at: string; landing: string | null; channel: string; source: string };

export type Line = { orders: number; revenueEur: number; checkouts: number };
export type SalesWindow = {
  days: number;
  since: string;
  orders: number;
  revenueEur: number;
  /** Major units, by currency. */
  revenue: Record<string, number>;
  /** Sales whose checkout recorded where the buyer came from. */
  recorded: number;
  /** Checkouts started in the window that recorded it, paid or not. */
  checkouts: number;
  byChannel: ({ channel: Channel | typeof NOT_RECORDED } & Line)[];
  byLanding: ({ landing: string; channels: Partial<Record<Channel, number>> } & Line)[];
  bySource: ({ source: string } & Line)[];
};
export type SalesReport = {
  generatedAt: string;
  /** The oldest checkout record read: while it is younger than a window, that window is partly unrecorded. */
  recordedSince: string | null;
  rates: Readonly<Record<string, number>>;
  windows: SalesWindow[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const eur = (sale: PaidSale) => (sale.amount / 100) * (EUR_RATES[sale.currency.toLowerCase()] ?? 0);

function tally<K extends string>(map: Map<K, Line>, key: K): Line {
  let line = map.get(key);
  if (!line) map.set(key, (line = { orders: 0, revenueEur: 0, checkouts: 0 }));
  return line;
}

const ranked = <T extends Line>(lines: T[]) =>
  lines.map((line) => ({ ...line, revenueEur: round2(line.revenueEur) })).sort((a, b) => b.revenueEur - a.revenueEur || b.orders - a.orders || b.checkouts - a.checkouts);

/** The report from the rows themselves (pure, for the tests and the route alike). */
export function summarize(sales: PaidSale[], sources: SourceRecord[], now: number, options: { landings?: number; sources?: number } = {}): SalesReport {
  const website = sales.filter((sale) => !sale.store || sale.store === "stripe");
  const byPurchase = new Map(sources.map((record) => [record.purchase_id, record]));
  const windows = REPORT_WINDOWS.map((days): SalesWindow => {
    const since = iso(now - days * DAY_MS);
    const channels = new Map<string, Line>();
    const landings = new Map<string, Line>();
    const landingChannels = new Map<string, Partial<Record<Channel, number>>>();
    const sourceLines = new Map<string, Line>();
    const revenue: Record<string, number> = {};
    let orders = 0;
    let revenueEur = 0;
    let recorded = 0;
    for (const sale of website) {
      if (sale.created_at < since) continue;
      const record = byPurchase.get(sale.id);
      const value = eur(sale);
      orders += 1;
      revenueEur += value;
      const currency = sale.currency.toLowerCase();
      revenue[currency] = round2((revenue[currency] ?? 0) + sale.amount / 100);
      if (record) recorded += 1;
      for (const [map, key] of [
        [channels, record?.channel ?? NOT_RECORDED],
        [landings, record ? (record.landing ?? NOT_RECORDED) : NOT_RECORDED],
        [sourceLines, record?.source ?? NOT_RECORDED],
      ] as const) {
        const line = tally(map, key);
        line.orders += 1;
        line.revenueEur += value;
      }
      if (record) {
        const split = landingChannels.get(record.landing ?? NOT_RECORDED) ?? {};
        split[record.channel as Channel] = (split[record.channel as Channel] ?? 0) + 1;
        landingChannels.set(record.landing ?? NOT_RECORDED, split);
      }
    }
    let checkouts = 0;
    for (const record of sources) {
      if (record.created_at < since) continue;
      checkouts += 1;
      tally(channels, record.channel).checkouts += 1;
      tally(landings, record.landing ?? NOT_RECORDED).checkouts += 1;
      tally(sourceLines, record.source).checkouts += 1;
    }
    return {
      days,
      since,
      orders,
      revenueEur: round2(revenueEur),
      revenue,
      recorded,
      checkouts,
      byChannel: ranked([...channels].map(([channel, line]) => ({ channel: channel as Channel, ...line }))),
      byLanding: ranked([...landings].map(([landing, line]) => ({ landing, channels: landingChannels.get(landing) ?? {}, ...line }))).slice(0, options.landings ?? 40),
      bySource: ranked([...sourceLines].map(([source, line]) => ({ source, ...line }))).slice(0, options.sources ?? 25),
    };
  });
  const first = sources.reduce<string | null>((min, record) => (min === null || record.created_at < min ? record.created_at : min), null);
  return { generatedAt: iso(now), recordedSince: first, rates: EUR_RATES, windows };
}

export class ReportError extends Error {}

const PAGE = 1000;

/** Every row a query has, a page at a time: PostgREST answers at most 1,000 rows a request. */
async function everyRow<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < 100 * PAGE; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new ReportError(error.message);
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE) break;
  }
  return rows;
}

/**
 * The report from the database. Throws ReportError when a table can't be read (before migration
 * 0019, checkout_sources). A checkout is started up to a day before it is paid, so records are read
 * from two days before the longest window.
 */
export async function salesReport(admin: Db, now: number): Promise<SalesReport> {
  const longest = Math.max(...REPORT_WINDOWS);
  const [sales, sources] = await Promise.all([
    everyRow<PaidSale>((from, to) =>
      admin
        .from("purchases")
        .select("id, amount, currency, created_at, store")
        .eq("status", "paid")
        .gte("created_at", iso(now - longest * DAY_MS))
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    ),
    everyRow<SourceRecord>((from, to) =>
      admin
        .from("checkout_sources")
        .select("purchase_id, created_at, landing, channel, source")
        .gte("created_at", iso(now - (longest + 2) * DAY_MS))
        .order("created_at", { ascending: true })
        .order("purchase_id", { ascending: true })
        .range(from, to),
    ),
  ]);
  return summarize(sales, sources, now);
}
