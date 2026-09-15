import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { env, isConfigured } from "@/lib/env";

/**
 * Refreshes the Supabase auth session on every matched request and copies the refreshed
 * cookies onto the outgoing response (which may be an i18n redirect or rewrite).
 */
export async function refreshSupabaseSession(request: NextRequest, response: NextResponse) {
  if (!isConfigured.supabase) return response;
  if (!hasSupabaseAuthCookie(request)) return response;

  const supabase = createServerClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Do not remove: this call is what triggers a token refresh when the access token expired.
  await supabase.auth.getUser();
  return response;
}

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
}
