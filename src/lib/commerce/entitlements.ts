import { PACK_IDS } from "@/lib/games/packs";
import { EVERY_PACK, EVERY_TEMPLATE, FREE_SAVED_DATES, type Currency } from "@/lib/pricing/products";
import type { MembershipSummary } from "@/lib/membership/types";
import type { Pass } from "./passes";
import { currentMembership, personOf, summariseMembership, type Person } from "./memberships";
import { UPGRADE_CREDITED, upgradeAmount, type PaidPurchase } from "./pricing";
import { MissingMigrationError, inviteUrl, type Db, type Locale } from "./db";
import { splitUnlocks } from "./unlocks";

/** GET /api/entitlements (contract C3), plus the buyer's upgrade price when there is one to offer. */
export type Entitlements = {
  signedIn: boolean;
  /** Template unlock rows: slugs, "*" for every template. */
  templates: string[];
  /** Game pack ids; "*" (with every current id listed too) when all packs are covered. */
  packs: string[];
  /** The pass as the iPhone app's current build reads it: filled for any running membership. */
  pass: PassSummary | null;
  /** Ethos for Two as it is now (docs/MEMBERSHIP.md 2.8): running, or a subscription whose payment failed. */
  membership: MembershipSummary | null;
  /** How many dates and trips the account can save: FREE_SAVED_DATES, or null (no limit) while a membership runs. */
  savedDatesLimit: number | null;
  /** "Upgrade to Everything for the difference", for a buyer who paid for singles, pick-threes or extras. */
  upgrade: { amount: number; currency: Currency } | null;
};

export type PassSummary = { endsAt: string; isOwner: boolean; partnerJoined: boolean; inviteUrl?: string };

export const SIGNED_OUT: Entitlements = { signedIn: false, templates: [], packs: [], pass: null, membership: null, savedDatesLimit: FREE_SAVED_DATES, upgrade: null };

/**
 * The old `pass` field, from the membership, for app builds that only know the pass: any running
 * membership reads as a pass that ends when the membership would (its period end while it renews).
 */
export function passFromMembership(membership: MembershipSummary | null): PassSummary | null {
  if (!membership?.running) return null;
  return {
    endsAt: membership.endsAt ?? membership.periodEnd,
    isOwner: membership.isOwner,
    partnerJoined: membership.partnerJoined,
    ...(membership.inviteUrl ? { inviteUrl: membership.inviteUrl } : {}),
  };
}

export function templatesFromRows(rows: string[]): string[] {
  return rows.filter((row) => !row.startsWith("pack:"));
}

export function packsFromRows(rows: string[]): string[] {
  if (rows.includes(EVERY_PACK)) return ["*", ...PACK_IDS];
  return rows.filter((row) => row.startsWith("pack:")).map((row) => row.slice("pack:".length));
}

/**
 * Rows read before migration 0014 have none of its columns. What a user can use comes from their
 * unlock rows, which don't depend on it, and this read serves every page: it keeps answering, with
 * the rows as 0014's defaults will make them (every existing row is a one-time year, active), and says
 * loudly what is missing. Everything that decides or writes on these columns refuses instead
 * (lib/commerce/db.ts).
 */
const AFTER_0014 = {
  provider: "stripe_pass",
  plan: "yearly",
  status: "active",
  stripe_customer_id: null,
  stripe_subscription_id: null,
  store_original_transaction_id: null,
  current_period_end: null,
  cancel_at_period_end: false,
  pending_plan: null,
  provider_event_at: null,
  renewal_reminded_for: null,
  payment_failed_invoice: null,
  ended_notified_at: null,
} satisfies Partial<Pass>;

function asAfter0014(passes: Pass[]): Pass[] {
  if (!passes.some((pass) => pass.provider === undefined)) return passes;
  console.error(`[db] ${new MissingMigrationError("entitlements read couple_passes without its membership columns, as one-time years").message}`);
  return passes.map((pass) => ({ ...AFTER_0014, ...pass }));
}

/** The upgrade price to show, or null when there is nothing to upgrade from (or Everything is owned). */
export function upgradeOffer(ownedForever: string[], purchases: PaidPurchase[], currency: Currency): Entitlements["upgrade"] {
  if (ownedForever.includes(EVERY_TEMPLATE)) return null;
  const credited = purchases.some((p) => p.status === "paid" && (UPGRADE_CREDITED as readonly string[]).includes(p.product));
  return credited ? { amount: upgradeAmount(currency, purchases), currency } : null;
}

/**
 * What a signed-in user can use right now, read with `db`: the user's own session (row-level
 * security decides, as GET /api/entitlements reads it) or the service role for that user id (the
 * app's purchase routes, right after they have written). The other person's name in the membership
 * is read with `names` (the service role: profiles are own-row only), or `db` when it is the service
 * role already. Before migration 0009 the pass table doesn't exist: that reads as "no pass", not an
 * error.
 */
export async function readEntitlements(db: Db, userId: string, options: { locale: Locale; currency: Currency; now: number; names?: Db | null }): Promise<Entitlements> {
  const [unlocks, owned, joined, purchases] = await Promise.all([
    db.from("template_unlocks").select("template_slug, purchase_id").eq("user_id", userId),
    db.from("couple_passes").select("*").eq("owner_user_id", userId),
    db.from("couple_passes").select("*").eq("partner_user_id", userId),
    db.from("purchases").select("product, amount, currency, status").eq("user_id", userId).eq("status", "paid"),
  ]);
  const rows = unlocks.data ?? [];
  const passes = asAfter0014([...(owned.data ?? []), ...(joined.data ?? [])].filter((pass, i, all) => all.findIndex((other) => other.id === pass.id) === i));
  const slugs = rows.map((row) => row.template_slug);
  const forever = splitUnlocks(rows, passes.map((pass) => pass.purchase_id)).forever;
  const current = currentMembership(passes, userId, options.now);
  const other = current ? (current.owner_user_id === userId ? current.partner_user_id : current.owner_user_id) : null;
  let partner: Person | null = null;
  if (other) {
    const { data } = await (options.names ?? db).from("profiles").select("name, email").eq("id", other).maybeSingle();
    partner = personOf(data) ?? { name: null, initial: "?" };
  }
  const membership = summariseMembership(passes, userId, options.now, { invite: (code) => inviteUrl(code, options.locale), partner });
  return {
    signedIn: true,
    templates: templatesFromRows(slugs),
    packs: packsFromRows(slugs),
    pass: passFromMembership(membership),
    membership,
    savedDatesLimit: membership?.running ? null : FREE_SAVED_DATES,
    upgrade: upgradeOffer(forever, purchases.data ?? [], options.currency),
  };
}
