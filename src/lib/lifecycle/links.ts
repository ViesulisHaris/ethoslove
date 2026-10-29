/**
 * Signed links for emails that need to act without a sign-in: "remove this reminder", "no more
 * of these emails" and "turn off reminders for this date". The link carries what it acts on plus an
 * HMAC of it, so nobody can make one for a reminder or an address that isn't theirs. Each purpose
 * signs a different message, so a token made for one can never be used for another.
 *
 * Nothing personal goes in a link: a reminder is named by its random id, and an address by a
 * SHA-256 of it, which is also all the opt-out list stores.
 */

export type TokenPurpose =
  | "reminder-remove"
  | "email-optout"
  | "saved-date-reminder-off"
  | "monthsary-yes"
  | "monthsary-stop"
  | "keep-confirm"
  | "keep-stop"
  | "keep-never"
  | "keep-reminder-off"
  | "reaction-private"
  | "publish-finish";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const VALUE: Record<TokenPurpose, RegExp> = {
  "reminder-remove": UUID,
  "email-optout": /^[0-9a-f]{64}$/,
  // "Turn off reminders for this date", in the day-before email of a saved date: its row's id.
  "saved-date-reminder-off": UUID,
  // "Yes, remind me", in a monthsary's check-in: the account's id and the day it asks about, so a yes
  // from an old email can't confirm a later month.
  "monthsary-yes": /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:\d{4}-\d{2}-\d{2}$/,
  // "Stop these", in every monthsary email: the account's id, so it outlives the row it came with.
  "monthsary-stop": UUID,
  // "Yes, email me the link", in a kept gift's confirmation: the keep's id.
  "keep-confirm": UUID,
  // "Unsubscribe", in every email a kept gift brings once confirmed: the keep's id. It ends the lot.
  "keep-stop": UUID,
  // "Never email me", in the confirmation, for an address someone else typed in: its hash.
  "keep-never": /^[0-9a-f]{64}$/,
  // "Remove this reminder", in a keeper's reminder: that reminder's id.
  "keep-reminder-off": UUID,
  // "Keep it private", in the email telling a sender about a reaction they may see on the site: its id.
  "reaction-private": UUID,
  // "Publish my gift", in the reminder for a gift paid for and never published: the purchase's id and
  // when the link stops signing anyone in (Unix seconds), so a forwarded email doesn't open the
  // account for good.
  "publish-finish": /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:\d{10}$/,
};

const encoder = new TextEncoder();

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

/**
 * The server secret the links are signed with: VIEWER_HASH_SECRET if set, else the service key,
 * the same order as the viewer hash (lib/crypto.ts). Null when neither is set, and then no link is
 * made or honoured.
 */
export function linkSecret(): string | null {
  return process.env.VIEWER_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

export async function signToken(purpose: TokenPurpose, value: string, secret: string): Promise<string> {
  if (!VALUE[purpose].test(value)) throw new Error(`bad ${purpose} token value`);
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(`${purpose}:${value}`));
  return `${value}.${Buffer.from(signature).toString("base64url")}`;
}

/** The value a token was made for, or null when it wasn't made by us for this purpose. */
export async function verifyToken(purpose: TokenPurpose, token: string | null | undefined, secret: string): Promise<string | null> {
  if (!token || token.length > 200) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const value = token.slice(0, dot).toLowerCase();
  if (!VALUE[purpose].test(value)) return null;
  const signature = Buffer.from(token.slice(dot + 1), "base64url");
  // crypto.subtle.verify compares in constant time, so the signature can't be guessed byte by byte.
  const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), signature, encoder.encode(`${purpose}:${value}`));
  return ok ? value : null;
}

/** How the opt-out list knows an address without keeping it: SHA-256 of the address, lower case. */
export async function emailKey(email: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(email.trim().toLowerCase()));
  return Buffer.from(digest).toString("hex");
}
