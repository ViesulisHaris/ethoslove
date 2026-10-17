import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * POST /api/app/web-session: a Supabase session for the app's web view, of its own. The app keeps
 * its session in the Keychain; the pages it opens (the editor, the games, a gift's stats) sign in
 * with cookies. Handing them the app's own refresh token would have the two refresh one token
 * family and log each other out, so the web view gets a separate session instead: a one-time
 * magic-link token made with the service key (generateLink sends no email) and verified at once,
 * with the cookies it sets collected rather than set, and returned for the app to install in the
 * web view. Contract: Ethos app docs/ARCHITECTURE.md §2.6.7.
 */
export type WebSessionCookie = {
  name: string;
  value: string;
  path: string;
  /** Seconds; 0 deletes the cookie (a chunk left over from a longer session). */
  maxAge: number | null;
  sameSite: "lax" | "strict" | "none" | null;
  httpOnly: boolean;
  secure: boolean;
};

type Collected = { name: string; value: string; options?: Record<string, unknown> };

const SAME_SITE = new Set(["lax", "strict", "none"]);

export function webSessionCookie({ name, value, options = {} }: Collected): WebSessionCookie {
  const sameSite = options.sameSite === true ? "strict" : typeof options.sameSite === "string" && SAME_SITE.has(options.sameSite.toLowerCase()) ? (options.sameSite.toLowerCase() as WebSessionCookie["sameSite"]) : null;
  return {
    name,
    value,
    path: typeof options.path === "string" && options.path.startsWith("/") ? options.path : "/",
    maxAge: typeof options.maxAge === "number" && Number.isFinite(options.maxAge) ? Math.max(0, Math.floor(options.maxAge)) : null,
    sameSite,
    httpOnly: options.httpOnly === true,
    secure: options.secure === true,
  };
}

/** A client whose cookie writes are only written down: nothing reaches a response. */
export type CollectingClient = (collect: (cookies: Collected[]) => void) => Pick<SupabaseClient<Database>, "auth">;

export const collectingClient =
  (url: string, anonKey: string): CollectingClient =>
  (collect) =>
    createServerClient<Database>(url, anonKey, {
      cookies: {
        getAll: () => [],
        setAll: (cookies) => collect(cookies),
      },
    });

export type WebSessionResult = { ok: true; cookies: WebSessionCookie[] } | { ok: false; error: "link_failed" | "verify_failed" | "wrong_user" };

export async function webSessionCookies(admin: Pick<SupabaseClient<Database>, "auth">, user: { id: string; email: string }, client: CollectingClient): Promise<WebSessionResult> {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: user.email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) return { ok: false, error: "link_failed" };
  const collected: Collected[] = [];
  const supabase = client((cookies) => collected.push(...cookies));
  const verified = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  if (verified.error || !verified.data.session) return { ok: false, error: "verify_failed" };
  // The email names one account, but the session handed over must be the caller's own, never another's.
  if (verified.data.user?.id !== user.id) return { ok: false, error: "wrong_user" };
  // The session's cookies are written when the client hears SIGNED_IN; let that finish.
  await new Promise((resolve) => setTimeout(resolve, 0));
  return collected.length > 0 ? { ok: true, cookies: collected.map(webSessionCookie) } : { ok: false, error: "verify_failed" };
}
