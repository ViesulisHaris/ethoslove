import "server-only";

import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, isConfigured } from "@/lib/env";
import { parseBearer } from "@/lib/auth/bearer";
import type { Database } from "./types";

/**
 * The Supabase access token the iPhone app sent as `Authorization: Bearer <jwt>`, or null (a
 * browser, or a header that is not a Supabase token: see lib/auth/bearer.ts).
 */
export async function bearerToken(): Promise<string | null> {
  return parseBearer((await headers()).get("authorization"));
}

/**
 * Request-scoped Supabase client for Server Components, Server Actions and Route Handlers.
 * Returns null when Supabase is not configured.
 *
 * A request from the app carries its own access token: the client then speaks as that user
 * (row-level security sees auth.uid()) and keeps no session of its own. Everything else is the
 * browser's cookie session, as before.
 */
export async function getSupabaseServerClient(): Promise<SupabaseClient<Database> | null> {
  if (!isConfigured.supabase) return null;
  const token = await bearerToken();
  if (token)
    return createClient<Database>(env.supabaseUrl!, env.supabaseAnonKey!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

  const cookieStore = await cookies();
  return createServerClient<Database>(env.supabaseUrl!, env.supabaseAnonKey!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component: cookies are read-only there. The proxy
          // refreshes sessions, so this is safe to ignore.
        }
      },
    },
  });
}
