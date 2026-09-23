import { PACK_IDS } from "@/lib/games/packs";
import { EVERY_PACK, EVERY_TEMPLATE, type Currency } from "@/lib/pricing/products";
import type { Pass } from "./passes";
import { isRunning, paidUntil } from "./passes";
import { UPGRADE_CREDITED, upgradeAmount, type PaidPurchase } from "./pricing";
import { iso } from "./db";

/** GET /api/entitlements (contract C3), plus the buyer's upgrade price when there is one to offer. */
export type Entitlements = {
  signedIn: boolean;
  /** Template unlock rows: slugs, "*" for every template. */
  templates: string[];
  /** Game pack ids; "*" (with every current id listed too) when all packs are covered. */
  packs: string[];
  pass: PassSummary | null;
  /** "Upgrade to Everything for the difference", for a buyer who paid for singles, pick-threes or extras. */
  upgrade: { amount: number; currency: Currency } | null;
};

export type PassSummary = { endsAt: string; isOwner: boolean; partnerJoined: boolean; inviteUrl?: string };

export const SIGNED_OUT: Entitlements = { signedIn: false, templates: [], packs: [], pass: null, upgrade: null };

export function templatesFromRows(rows: string[]): string[] {
  return rows.filter((row) => !row.startsWith("pack:"));
}

export function packsFromRows(rows: string[]): string[] {
  if (rows.includes(EVERY_PACK)) return ["*", ...PACK_IDS];
  return rows.filter((row) => row.startsWith("pack:")).map((row) => row.slice("pack:".length));
}

/**
 * The pass the user holds right now, as owner first, then as partner. `endsAt` counts renewals the
 * owner already bought, so it is the day access really ends. Only the owner gets the invite link,
 * and only while the partner's place is empty.
 */
export function summarisePass(passes: Pass[], userId: string, now: number, invite: (code: string) => string): PassSummary | null {
  const running = passes.filter((pass) => isRunning(pass, now));
  const current = running.find((pass) => pass.owner_user_id === userId) ?? running.find((pass) => pass.partner_user_id === userId);
  if (!current) return null;
  const sameOwner = passes.filter((pass) => pass.owner_user_id === current.owner_user_id);
  const isOwner = current.owner_user_id === userId;
  const partnerJoined = Boolean(current.partner_user_id);
  return {
    endsAt: iso(paidUntil(sameOwner, now) ?? Date.parse(current.ends_at)),
    isOwner,
    partnerJoined,
    ...(isOwner && !partnerJoined ? { inviteUrl: invite(current.invite_code) } : {}),
  };
}

/** The upgrade price to show, or null when there is nothing to upgrade from (or Everything is owned). */
export function upgradeOffer(ownedForever: string[], purchases: PaidPurchase[], currency: Currency): Entitlements["upgrade"] {
  if (ownedForever.includes(EVERY_TEMPLATE)) return null;
  const credited = purchases.some((p) => p.status === "paid" && (UPGRADE_CREDITED as readonly string[]).includes(p.product));
  return credited ? { amount: upgradeAmount(currency, purchases), currency } : null;
}
