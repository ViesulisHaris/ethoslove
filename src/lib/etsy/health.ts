import type { Db } from "@/lib/commerce/db";
import { EtsyError, accessToken, type EtsyConfig } from "./api";

type Check = { ok: boolean; detail?: string };
export type EtsyHealth = { ok: boolean; checks: Record<string, Check> };

const API = "https://openapi.etsy.com";

/**
 * Whether every link in the Etsy chain holds, without buying anything (/api/etsy/status): the keys
 * and secrets are set, migration 0018 is in, the shop is connected, its sign-in renews, Etsy answers
 * for our shop, and the token may read orders (the one thing a claim needs). Nothing personal comes
 * back: counts and names of checks only.
 */
export async function etsyHealth(db: Db, config: EtsyConfig, env: { cronSecret: boolean }, now: number, doFetch: typeof fetch = fetch): Promise<EtsyHealth> {
  const checks: Record<string, Check> = {
    keys: { ok: true },
    connectSecret: { ok: config.connectSecret !== null },
    cronSecret: { ok: env.cronSecret, detail: env.cronSecret ? undefined : "CRON_SECRET is unset: refunds won't be checked" },
  };
  const { data: row, error } = await db.from("etsy_connection").select("shop_id, expires_at, updated_at").eq("id", 1).maybeSingle();
  checks.database = error ? { ok: false, detail: "etsy_connection unreadable: is migration 0018 applied?" } : { ok: true };
  checks.connected = row ? { ok: config.shopId === null || row.shop_id === config.shopId, detail: `shop ${row.shop_id}` } : { ok: false, detail: "open /api/etsy/connect?key=… signed in as the shop's owner" };

  if (row && checks.connected.ok) {
    let token: string | null = null;
    try {
      token = (await accessToken(db, config, now, { doFetch })).token;
      checks.signIn = { ok: true };
    } catch (e) {
      checks.signIn = { ok: false, detail: e instanceof EtsyError ? e.code : "failed" };
    }
    if (token) {
      const headers = { "x-api-key": `${config.keystring}:${config.sharedSecret}`, authorization: `Bearer ${token}` };
      const get = (path: string) => doFetch(`${API}${path}`, { headers, cache: "no-store" }).catch(() => null);
      const shop = await get(`/v3/application/shops/${row.shop_id}`);
      const shopJson = shop?.ok ? ((await shop.json().catch(() => null)) as { shop_name?: string; listing_active_count?: number } | null) : null;
      checks.shop = shop?.ok ? { ok: true, detail: `${shopJson?.shop_name ?? "?"}, ${shopJson?.listing_active_count ?? 0} active listings` } : { ok: false, detail: `Etsy answered ${shop?.status ?? "nothing"}` };
      const orders = await get(`/v3/application/shops/${row.shop_id}/receipts?limit=1`);
      const ordersJson = orders?.ok ? ((await orders.json().catch(() => null)) as { count?: number } | null) : null;
      checks.readOrders = orders?.ok ? { ok: true, detail: `${ordersJson?.count ?? 0} orders` } : { ok: false, detail: `Etsy answered ${orders?.status ?? "nothing"}: the sign-in lacks transactions_r?` };
    }
  }
  return { ok: Object.values(checks).every((c) => c.ok), checks };
}
