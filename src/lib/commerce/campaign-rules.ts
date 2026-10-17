/**
 * The creator campaign: creators who have the campaign password make gifts in four premium templates
 * for free, to post on TikTok and Instagram (the creators' brief is the "Ethos — TikTok Creator
 * Campaign" doc). What keeps it from becoming a free pass is in these rules, and the server holds
 * every one of them at publish time (lib/commerce/campaign.ts, app/actions/gift.ts):
 *
 * - one window per account, started by the password and never restarted by typing it again;
 * - a cap on the gifts published through it, counted at publish, so deleting one doesn't free a slot;
 * - the Ethos footer stays on, and nothing that costs extra comes with it (a video, a voice note, more
 *   photos, a schedule, a password, no footer): what a paying client would want is still paid.
 *
 * The grant lives in the account's app_metadata, which only the service role can write. Pure and
 * shared with the browser: the campaign page and the publish sheet read the same rules.
 */

/** Coquette, XOXO, Bouquet, and the best-selling premium template (Birthday Cinema, Oct 2026). */
export const CAMPAIGN_TEMPLATES = ["coquette", "xoxo", "bouquet", "birthday-cinema"] as const;
export type CampaignTemplate = (typeof CAMPAIGN_TEMPLATES)[number];

/** How long a new grant lets someone publish, from the moment the password is accepted. */
export const CAMPAIGN_DAYS = 3;
/** Gifts one account may publish through the campaign, ever. */
export const CAMPAIGN_GIFT_LIMIT = 20;

const DAY_MS = 86_400_000;

/**
 * What app_metadata.campaign holds. `endsAt` null = no end: the owner extends a creator who has
 * earned their $6 (scripts/campaign.mjs). `published` counts gifts published through the campaign.
 */
export type CampaignGrant = {
  grantedAt: string;
  endsAt: string | null;
  published: number;
  revokedAt?: string | null;
};

export type CampaignState = "active" | "ended" | "revoked";

export function isCampaignTemplate(slug: string): slug is CampaignTemplate {
  return (CAMPAIGN_TEMPLATES as readonly string[]).includes(slug);
}

export function newCampaignGrant(now: number): CampaignGrant {
  return { grantedAt: new Date(now).toISOString(), endsAt: new Date(now + CAMPAIGN_DAYS * DAY_MS).toISOString(), published: 0 };
}

const isIso = (value: unknown): value is string => typeof value === "string" && !Number.isNaN(Date.parse(value));

/** The grant in an account's app_metadata, or null when there is none (or it's malformed). */
export function parseCampaignGrant(appMetadata: unknown): CampaignGrant | null {
  const raw = (appMetadata as { campaign?: unknown } | null | undefined)?.campaign as Partial<Record<keyof CampaignGrant, unknown>> | undefined;
  if (!raw || typeof raw !== "object" || !isIso(raw.grantedAt)) return null;
  if (raw.endsAt !== null && !isIso(raw.endsAt)) return null;
  const published = typeof raw.published === "number" && Number.isFinite(raw.published) && raw.published > 0 ? Math.floor(raw.published) : 0;
  return {
    grantedAt: raw.grantedAt,
    endsAt: raw.endsAt as string | null,
    published,
    revokedAt: isIso(raw.revokedAt) ? raw.revokedAt : null,
  };
}

export function campaignState(grant: CampaignGrant, now: number): CampaignState {
  if (grant.revokedAt) return "revoked";
  if (grant.endsAt !== null && Date.parse(grant.endsAt) <= now) return "ended";
  return "active";
}

/** Gifts the grant still allows. */
export function campaignGiftsLeft(grant: CampaignGrant): number {
  return Math.max(0, CAMPAIGN_GIFT_LIMIT - grant.published);
}

/** Whether a new gift in this template may be published through the campaign right now. */
export function campaignCoversNewGift(grant: CampaignGrant | null, slug: string, now: number): boolean {
  return Boolean(grant) && isCampaignTemplate(slug) && campaignState(grant!, now) === "active" && campaignGiftsLeft(grant!) > 0;
}

/** Whether a gift already published in this template may still be edited through the campaign. */
export function campaignCoversEdit(grant: CampaignGrant | null, slug: string, now: number): boolean {
  return Boolean(grant) && isCampaignTemplate(slug) && campaignState(grant!, now) === "active";
}
