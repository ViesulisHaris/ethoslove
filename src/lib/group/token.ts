import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";

/**
 * A group card's link: https://tryethos.io/c/<token>. The token is 22 characters (about 132 bits),
 * made from the group's id, the link's version and the server's own secret, so it is short enough
 * for a chat message and can be made again whenever the sender's panel asks for it. Nothing stores
 * it: the database keeps only its SHA-256, which finds the group and opens nothing, so a leaked
 * table holds no working link. "Reset the link" raises the version; the old token then finds nothing.
 * It names no gift.
 */
export const TOKEN_LENGTH = 22;

export function groupToken(groupId: string, version: number, secret: string): string {
  return createHmac("sha256", secret).update(`group-link:${groupId}:${version}`).digest("base64url").slice(0, TOKEN_LENGTH);
}

/** What the page's address may hold: exactly the characters a token is made of. */
export function isGroupToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{22}$/.test(value);
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** Random lower-case letters and digits: a contribution's key in the gift (10), a report's reference (8). */
export function randomRef(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** The secret a contributor's browser keeps to take its note back; only its SHA-256 is stored. */
export function withdrawSecret(): string {
  return randomBytes(24).toString("base64url");
}
