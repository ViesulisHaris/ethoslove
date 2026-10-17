import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * The "send one back" token: proof, carried in the reply link, that its holder received a paid
 * premium gift, naming that gift and its template. A gift's id never goes into a URL (the link
 * travels through analytics and referrers), so the token is sealed as well as signed:
 * encrypt-then-MAC, AES-256-CTR under one key derived from the server secret and an HMAC-SHA256 tag
 * over the version, the IV and the ciphertext under another. Forging one, or reading the gift out
 * of one, needs the secret. It proves the right to a reply only; whether that free reply is still
 * unused is the database's to say (free_replies, lib/commerce/free-reply.ts).
 */
export type ReplyClaim = { giftId: string; templateSlug: string };

const VERSION = Buffer.from([1]);
const IV_BYTES = 16;
const TAG_BYTES = 16;
/** Longer than any token we make: a UUID and a template slug, sealed. */
export const REPLY_TOKEN_MAX_LENGTH = 256;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SLUG = /^[a-z0-9-]{1,80}$/;

/** A token's shape, for the browser, which can't open one: base64url, and not absurdly long. */
export const REPLY_TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,256}$/;

/** One key per job, both from the server secret, so neither is ever the secret itself or the other. */
function keys(secret: string): { enc: Buffer; mac: Buffer } {
  return {
    enc: createHmac("sha256", secret).update("ethos:reply-token:enc").digest(),
    mac: createHmac("sha256", secret).update("ethos:reply-token:mac").digest(),
  };
}

const tagOf = (mac: Buffer, iv: Buffer, ciphertext: Buffer) =>
  createHmac("sha256", mac).update(Buffer.concat([VERSION, iv, ciphertext])).digest().subarray(0, TAG_BYTES);

export function mintReplyToken(claim: ReplyClaim, secret: string): string {
  if (!UUID.test(claim.giftId) || !SLUG.test(claim.templateSlug)) throw new Error("bad reply claim");
  const { enc, mac } = keys(secret);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-ctr", enc, iv);
  const ciphertext = Buffer.concat([cipher.update(`${claim.giftId}:${claim.templateSlug}`, "utf8"), cipher.final()]);
  return Buffer.concat([VERSION, iv, ciphertext, tagOf(mac, iv, ciphertext)]).toString("base64url");
}

/** What a token names, or null when it wasn't made by us (or was altered on the way). */
export function readReplyToken(token: string | null | undefined, secret: string): ReplyClaim | null {
  if (!token || !REPLY_TOKEN_PATTERN.test(token)) return null;
  const raw = Buffer.from(token, "base64url");
  if (raw.length <= 1 + IV_BYTES + TAG_BYTES || raw[0] !== VERSION[0]) return null;
  const iv = raw.subarray(1, 1 + IV_BYTES);
  const ciphertext = raw.subarray(1 + IV_BYTES, raw.length - TAG_BYTES);
  const tag = raw.subarray(raw.length - TAG_BYTES);
  const { enc, mac } = keys(secret);
  // Checked before anything is decrypted, in constant time.
  if (!timingSafeEqual(tag, tagOf(mac, iv, ciphertext))) return null;
  const decipher = createDecipheriv("aes-256-ctr", enc, iv);
  const [giftId, templateSlug, ...rest] = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8").split(":");
  if (rest.length > 0 || !UUID.test(giftId ?? "") || !SLUG.test(templateSlug ?? "")) return null;
  return { giftId, templateSlug };
}
