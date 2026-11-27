/**
 * The link in "Email me this gift" (app/api/gift/later). A guest typed an address and has no account,
 * so there is no id to name them by, and nothing about them is stored until they open the link. The
 * link therefore carries the address itself, sealed (AES-256-GCM under a key made from the server's
 * link secret): nobody reading the address bar, a log or a forwarded email can tell whose it is, and
 * nobody can make or alter one. Inside: the address, the template the gift is on, and when the link
 * stops working (Unix seconds).
 */

export type LaterLink = { email: string; slug: string; until: number };

/** How long the link opens the gift: as long as an unsent draft is kept. */
export const LATER_LINK_SECONDS = 7 * 86_400;

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SLUG = /^[a-z0-9][a-z0-9-]{0,59}$/;
/** Loose on purpose: Resend decides what it can deliver to; this only keeps junk out of a link. */
export const EMAIL_SHAPE = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,180}\.[^\s@<>"'.]{2,24}$/;

async function key(secret: string): Promise<CryptoKey> {
  const material = await crypto.subtle.digest("SHA-256", encoder.encode(`later-open:${secret}`));
  return crypto.subtle.importKey("raw", material, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function sealLater(link: LaterLink, secret: string): Promise<string> {
  const email = link.email.trim().toLowerCase();
  if (!EMAIL_SHAPE.test(email) || !SLUG.test(link.slug) || !Number.isInteger(link.until)) throw new Error("bad later link");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(secret), encoder.encode(JSON.stringify([email, link.slug, link.until])));
  return Buffer.concat([Buffer.from(iv), Buffer.from(sealed)]).toString("base64url");
}

/** What a link was made for, or null when we didn't make it. Its time is the caller's to check. */
export async function openLater(token: string | null | undefined, secret: string): Promise<LaterLink | null> {
  if (!token || token.length > 600 || !/^[A-Za-z0-9_-]+$/.test(token)) return null;
  const bytes = Buffer.from(token, "base64url");
  if (bytes.length < 12 + 16 + 8) return null;
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.subarray(0, 12) }, await key(secret), bytes.subarray(12));
    const [email, slug, until] = JSON.parse(decoder.decode(plain)) as [unknown, unknown, unknown];
    if (typeof email !== "string" || typeof slug !== "string" || typeof until !== "number") return null;
    if (!EMAIL_SHAPE.test(email) || !SLUG.test(slug) || !Number.isInteger(until)) return null;
    return { email, slug, until };
  } catch {
    return null;
  }
}
