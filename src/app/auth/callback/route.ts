import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env, isConfigured } from "@/lib/env";
import { welcomeIfNew } from "@/lib/email/welcome";
import type { Database } from "@/lib/supabase/types";

function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

/** OAuth + magic-link (PKCE) landing: exchanges the code for a session cookie. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next") ?? request.cookies.get("auth_next")?.value);

  if (code && isConfigured.supabase) {
    // Set session cookies on the redirect response (cookieStore-only can drop them).
    const redirectTo = NextResponse.redirect(`${origin}${next}`);
    redirectTo.cookies.set("auth_next", "", { path: "/", maxAge: 0 });

    const supabase = createServerClient<Database>(env.supabaseUrl!, env.supabaseAnonKey!, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => redirectTo.cookies.set(name, value, options));
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      void welcomeIfNew(supabase).catch(() => {});
      return redirectTo;
    }
    console.error("[auth/callback] exchangeCodeForSession failed", error.message);
  }
  return NextResponse.redirect(`${origin}/login?error=callback`);
}
