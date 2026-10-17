import "server-only";

import { env } from "@/lib/env";

/** AES-GCM helpers for small server-side secrets (gift password cookies). */
async function key(): Promise<CryptoKey> {
  const material = env.supabaseServiceRoleKey;
  if (!material && process.env.NODE_ENV === "production") throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to seal cookies");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`ethos:cookie:${material ?? "dev-only-secret-change-me"}`));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

const b64 = {
  encode: (buf: ArrayBuffer) => Buffer.from(buf).toString("base64url"),
  decode: (s: string) => new Uint8Array(Buffer.from(s, "base64url")),
};

export async function seal(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(), new TextEncoder().encode(plain));
  return `${b64.encode(iv.buffer)}.${b64.encode(data)}`;
}

export async function unseal(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const [ivPart, dataPart] = token.split(".");
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64.decode(ivPart) }, await key(), b64.decode(dataPart));
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

/** Anonymous, rotating viewer identity: never stores the IP itself. */
export async function viewerHash(ip: string, userAgent: string, shortId: string): Promise<string> {
  const day = new Date().toISOString().slice(0, 10);
  // Keyed with a server secret: a plain hash of an IPv4 address can be reversed by hashing all four
  // billion of them. VIEWER_HASH_SECRET if set, else the service key, which is server-only already.
  const secret = process.env.VIEWER_HASH_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "ethos-viewer";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ip}|${userAgent}|${shortId}|${day}`));
  return Buffer.from(digest).toString("hex").slice(0, 32);
}
