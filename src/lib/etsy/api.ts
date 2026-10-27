import { createHash, randomBytes } from "node:crypto";
import type { Db } from "@/lib/commerce/db";
import type { EtsyReceipt } from "./receipt";

/*
 * Etsy's Open API v3, for the one thing we ask it: is this order of our shop paid, and for what.
 * The shop signs in once (OAuth 2.0 with PKCE, /api/etsy/connect); the tokens live in
 * etsy_connection (0018) and are renewed here as they expire. Every call carries the app's key as
 * "keystring:shared_secret" and the shop's token. https://developers.etsy.com/documentation/
 */

const API = "https://openapi.etsy.com";
export const ETSY_AUTHORIZE_URL = "https://www.etsy.com/oauth/connect";
const TOKEN_URL = `${API}/v3/public/oauth/token`;
/** Reading orders is all we need. */
export const ETSY_SCOPE = "transactions_r";
/** Carries the PKCE verifier and the state from /api/etsy/connect to /api/etsy/callback. */
export const ETSY_OAUTH_COOKIE = "etsy_oauth";

export type EtsyConfig = { keystring: string; sharedSecret: string; shopId: number | null; connectSecret: string | null };

/**
 * The app's credentials from the environment; null until both are set. ETSY_SHOP_ID is optional: the
 * shop is the one owned by whoever connects (/api/etsy/callback), and when it is set, only that shop
 * can be connected.
 */
export function etsyConfig(): EtsyConfig | null {
  const keystring = process.env.ETSY_KEYSTRING?.trim();
  const sharedSecret = process.env.ETSY_SHARED_SECRET?.trim();
  if (!keystring || !sharedSecret) return null;
  const shopId = Number(process.env.ETSY_SHOP_ID);
  return { keystring, sharedSecret, shopId: Number.isSafeInteger(shopId) && shopId > 0 ? shopId : null, connectSecret: process.env.ETSY_CONNECT_SECRET?.trim() || null };
}

export class EtsyError extends Error {
  constructor(readonly code: "not_connected" | "unauthorized" | "unavailable") {
    super(code);
  }
}

type Tokens = { access_token: string; refresh_token: string; expires_in: number };

function isTokens(json: unknown): json is Tokens {
  const t = json as Partial<Tokens> | null;
  return typeof t?.access_token === "string" && typeof t.refresh_token === "string" && typeof t.expires_in === "number";
}

/** PKCE: a random verifier, and the challenge Etsy is shown first (S256). */
export function pkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(48).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
}

export function etsyAuthorizeUrl(config: EtsyConfig, args: { redirectUri: string; state: string; challenge: string }): string {
  const url = new URL(ETSY_AUTHORIZE_URL);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: config.keystring,
    redirect_uri: args.redirectUri,
    scope: ETSY_SCOPE,
    state: args.state,
    code_challenge: args.challenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

async function tokenRequest(body: Record<string, string>, doFetch: typeof fetch): Promise<Tokens> {
  let res: Response;
  try {
    res = await doFetch(TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body).toString(), cache: "no-store" });
  } catch {
    throw new EtsyError("unavailable");
  }
  const json: unknown = await res.json().catch(() => null);
  if (res.ok && isTokens(json)) return json;
  throw new EtsyError(res.status >= 500 ? "unavailable" : "unauthorized");
}

/** The code Etsy sent back to /api/etsy/callback, swapped for the shop's tokens. */
export function exchangeCode(config: EtsyConfig, args: { code: string; verifier: string; redirectUri: string }, doFetch: typeof fetch = fetch): Promise<Tokens> {
  return tokenRequest({ grant_type: "authorization_code", client_id: config.keystring, redirect_uri: args.redirectUri, code: args.code, code_verifier: args.verifier }, doFetch);
}

/** An access token is "<Etsy user id>.<token>". */
export function tokenUserId(accessToken: string): number | null {
  const id = Number(accessToken.split(".")[0]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function apiGet(config: EtsyConfig, path: string, accessToken: string, doFetch: typeof fetch): Promise<Response> {
  try {
    return await doFetch(`${API}${path}`, {
      headers: { "x-api-key": `${config.keystring}:${config.sharedSecret}`, authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch {
    throw new EtsyError("unavailable");
  }
}

/** The shop the signed-in Etsy user owns, if any: the shop whose orders we may then read. */
export async function ownedShopId(config: EtsyConfig, accessToken: string, doFetch: typeof fetch = fetch): Promise<number | null> {
  const userId = tokenUserId(accessToken);
  if (!userId) return null;
  const res = await apiGet(config, `/v3/application/users/${userId}/shops`, accessToken, doFetch);
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as { shop_id?: unknown; user_id?: unknown } | null;
  return typeof json?.shop_id === "number" && json.user_id === userId ? json.shop_id : null;
}

export async function saveConnection(db: Db, shopId: number, tokens: Tokens, now: number): Promise<{ error?: string }> {
  const { error } = await db.from("etsy_connection").upsert(
    { id: 1, shop_id: shopId, access_token: tokens.access_token, refresh_token: tokens.refresh_token, expires_at: new Date(now + tokens.expires_in * 1000).toISOString(), updated_at: new Date(now).toISOString() },
    { onConflict: "id" },
  );
  return error ? { error: error.message } : {};
}

/**
 * A working access token, renewed when it has under a minute left (Etsy's last an hour). Etsy issues
 * a new refresh token with each renewal and the old one stops working, so two servers renewing at
 * once can't both win: the loser reads back the winner's token instead of failing.
 */
export async function accessToken(db: Db, config: EtsyConfig, now: number, options: { force?: boolean; doFetch?: typeof fetch } = {}): Promise<{ token: string; shopId: number }> {
  const { data: row } = await db.from("etsy_connection").select("access_token, refresh_token, expires_at, shop_id").eq("id", 1).maybeSingle();
  if (!row || (config.shopId !== null && row.shop_id !== config.shopId)) throw new EtsyError("not_connected");
  const shopId = row.shop_id;
  if (!options.force && Date.parse(row.expires_at) - now > 60_000) return { token: row.access_token, shopId };
  try {
    const tokens = await tokenRequest({ grant_type: "refresh_token", client_id: config.keystring, refresh_token: row.refresh_token }, options.doFetch ?? fetch);
    const { data: saved } = await db
      .from("etsy_connection")
      .update({ access_token: tokens.access_token, refresh_token: tokens.refresh_token, expires_at: new Date(now + tokens.expires_in * 1000).toISOString(), updated_at: new Date(now).toISOString() })
      .eq("id", 1)
      .eq("refresh_token", row.refresh_token)
      .select("access_token");
    if ((saved ?? []).length > 0) return { token: tokens.access_token, shopId };
  } catch (e) {
    if (!(e instanceof EtsyError) || e.code === "unavailable") throw e;
  }
  const { data: again } = await db.from("etsy_connection").select("access_token, expires_at").eq("id", 1).maybeSingle();
  if (again && again.access_token !== row.access_token && Date.parse(again.expires_at) > now) return { token: again.access_token, shopId };
  throw new EtsyError("unauthorized");
}

/**
 * One order of our shop, as Etsy has it now; null when our shop has no such order. Asked of Etsy
 * every time: nothing the buyer's browser sends says what was paid.
 */
export async function fetchReceipt(db: Db, config: EtsyConfig, receiptId: number, now: number, doFetch: typeof fetch = fetch): Promise<EtsyReceipt | null> {
  const first = await accessToken(db, config, now, { doFetch });
  const path = `/v3/application/shops/${first.shopId}/receipts/${receiptId}`;
  let res = await apiGet(config, path, first.token, doFetch);
  if (res.status === 401) res = await apiGet(config, path, (await accessToken(db, config, now, { force: true, doFetch })).token, doFetch);
  if (res.status === 404 || res.status === 400) return null;
  if (res.status === 401 || res.status === 403) throw new EtsyError("unauthorized");
  if (!res.ok) throw new EtsyError("unavailable");
  const json = (await res.json().catch(() => null)) as EtsyReceipt | null;
  if (!json || typeof json.receipt_id !== "number" || json.receipt_id !== receiptId || !Array.isArray(json.transactions)) throw new EtsyError("unavailable");
  return json;
}
