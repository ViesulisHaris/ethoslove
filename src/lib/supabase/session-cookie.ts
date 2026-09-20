/**
 * Whether this browser holds a Supabase session, judged from its cookies alone: the same test
 * the proxy makes (src/lib/supabase/proxy.ts). Most visitors have never signed in, and for them
 * the client library — 60 KB — has nothing to ask about, so it stays unloaded until there is a
 * session, or a place to start one.
 */
export function hasSessionCookie(): boolean {
  if (typeof document === "undefined") return false;
  return /(?:^|;\s*)sb-[^=]*auth-token/.test(document.cookie);
}
