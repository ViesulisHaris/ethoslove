import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import type { Db } from "./db";
import { campaignGiftsLeft, campaignState, newCampaignGrant, parseCampaignGrant, type CampaignGrant, type CampaignState } from "./campaign-rules";

/**
 * The server side of the creator campaign (rules in ./campaign-rules.ts). The password is compared by
 * its SHA-256, so the repository doesn't carry it in plain text; to change it, put the new hash here
 * (`printf '<password>' | shasum -a 256`) and deploy. Whoever has the old one keeps the grant they
 * already have, and nobody new gets one with it.
 */
const PASSWORD_SHA256 = "ed7f784cb497fca902071dbac4c0a957a72b153079f1f02dcba0987712022cc0";

const sha256 = (text: string) => createHash("sha256").update(text, "utf8").digest();

/** Case and surrounding spaces are forgiven: "EthosCampaign " is the same password. */
export function isCampaignPassword(input: string): boolean {
  return timingSafeEqual(sha256(input.trim().toLowerCase()), Buffer.from(PASSWORD_SHA256, "hex"));
}

export type CampaignStatus = {
  state: CampaignState;
  grantedAt: string;
  endsAt: string | null;
  published: number;
  left: number;
};

export function campaignStatusOf(user: Pick<User, "app_metadata">, now: number): CampaignStatus | null {
  const grant = parseCampaignGrant(user.app_metadata);
  if (!grant) return null;
  return { state: campaignState(grant, now), grantedAt: grant.grantedAt, endsAt: grant.endsAt, published: grant.published, left: campaignGiftsLeft(grant) };
}

/**
 * Starts the account's campaign window, once: an account that already has a grant gets it back as
 * it is (typing the password again never restarts the days or the count). The rest of app_metadata
 * is sent back untouched, since an update replaces what it is given.
 */
export async function grantCampaign(admin: Db, user: Pick<User, "id" | "app_metadata">, now: number): Promise<{ grant: CampaignGrant; created: boolean } | { error: string }> {
  const existing = parseCampaignGrant(user.app_metadata);
  if (existing) return { grant: existing, created: false };
  const grant = newCampaignGrant(now);
  const { error } = await admin.auth.admin.updateUserById(user.id, { app_metadata: { ...user.app_metadata, campaign: grant } });
  return error ? { error: error.message } : { grant, created: true };
}

/**
 * Counts one more gift published through the campaign. Read fresh from Auth rather than from the
 * request's copy, so two gifts published back to back both count.
 */
export async function countCampaignGift(admin: Db, userId: string): Promise<void> {
  const { data } = await admin.auth.admin.getUserById(userId);
  const user = data.user;
  const grant = user ? parseCampaignGrant(user.app_metadata) : null;
  if (!user || !grant) return;
  await admin.auth.admin.updateUserById(userId, { app_metadata: { ...user.app_metadata, campaign: { ...grant, published: grant.published + 1 } } });
}
