"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { MakeGiftLink } from "./make-gift-link";
import { hasSessionCookie } from "@/lib/supabase/session-cookie";
import { cn } from "@/lib/utils";

/**
 * Login / My gifts affordance for the (static) marketing pages.
 * Resolves auth on the client so marketing routes stay fully static and cacheable.
 */
export function AuthStatus({ onNavigate, block, tone = "light" }: { onNavigate?: () => void; block?: boolean; tone?: "light" | "dark" }) {
  const t = useTranslations("common");
  const [authed, setAuthed] = useState(false);
  const dark = tone === "dark";
  const ghost = cn(block && "h-11", dark && "text-cream/85 hover:bg-white/10 hover:text-cream");

  useEffect(() => {
    // Most visitors have never signed in, and without a session cookie there is no one to ask
    // about — so they never download the Supabase client (60 KB) at all.
    if (!hasSessionCookie()) return;
    let active = true;
    let unsubscribe = () => {};
    void import("@/lib/supabase/client").then(({ getSupabaseBrowserClient }) => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase || !active) return;
      supabase.auth.getUser().then(({ data }) => {
        if (active) setAuthed(Boolean(data.user));
      });
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        setAuthed(Boolean(session?.user));
      });
      unsubscribe = () => sub.subscription.unsubscribe();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return (
    <div className={cn("flex items-center gap-2", block && "flex-col items-stretch")}>
      {authed ? (
        <Button asChild variant="ghost" size="lg" className={ghost}>
          <Link href="/dashboard" onClick={onNavigate}>
            {t("dashboard")}
          </Link>
        </Button>
      ) : (
        <Button asChild variant="ghost" size="lg" className={ghost}>
          <Link href="/login" onClick={onNavigate}>
            {t("login")}
          </Link>
        </Button>
      )}
      <Button
        asChild
        size="lg"
        className={cn("rounded-full px-5", dark ? "bg-cream font-semibold text-forest hover:bg-cream/90" : "bg-ink text-paper hover:bg-ink/90", block && "h-11")}
      >
        <MakeGiftLink onClick={onNavigate}>{t("createGift")}</MakeGiftLink>
      </Button>
    </div>
  );
}
