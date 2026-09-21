import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { env, isConfigured } from "@/lib/env";
import { welcomeIfNew } from "@/lib/email/welcome";
import type { Database } from "@/lib/supabase/types";

function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

/**
 * The magic-link landing. The email links here with a token hash, not a PKCE code, so the link
 * works in whichever browser opens it — the Gmail app, Instagram's browser, a laptop — where the
 * code flow needed the cookie of the browser that asked for it and failed a few times a day.
 * The return path was put in a cookie when the link was requested; in a different browser that
 * cookie is missing and the dashboard is the sensible place to land.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next") ?? request.cookies.get("auth_next")?.value);

  if (tokenHash && type && isConfigured.supabase) {
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

    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      void welcomeIfNew(supabase).catch(() => {});
      return redirectTo;
    }
    console.error("[auth/confirm] verifyOtp failed", error.message);
  }
  return NextResponse.redirect(`${origin}/login?error=callback`);
}
