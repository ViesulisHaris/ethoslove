"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MakeGiftLink } from "./make-gift-link";
import { hasSessionCookie } from "@/lib/supabase/session-cookie";
import { cn } from "@/lib/utils";

/**
 * Login / My gifts (and My dates) affordance for the (static) marketing pages.
 * Resolves auth on the client so marketing routes stay fully static and cacheable.
 *
 * In the bar it is a quiet text button and the rose "Make a gift", both 44px tall; in the menu
 * (`block`) they stack full width, the rose one last, where a thumb rests.
 */
export function AuthStatus({ onNavigate, block, tone = "light" }: { onNavigate?: () => void; block?: boolean; tone?: "light" | "dark" }) {
  const t = useTranslations("common");
  const [authed, setAuthed] = useState(false);
  const dark = tone === "dark";

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

  const quiet = cn(
    "inline-flex items-center justify-center rounded-full font-medium whitespace-nowrap transition-[background-color,color,scale] duration-200 active:scale-[0.98]",
    block
      ? "h-12 bg-white text-[15px] text-forest ring-1 ring-forest/10 hover:bg-white/70"
      : cn("h-11 px-3.5 text-[14.5px]", dark ? "text-cream/85 hover:bg-white/10 hover:text-cream" : "text-forest/75 hover:bg-rose-mist hover:text-forest"),
  );

  return (
    <div className={cn("flex items-center gap-1", block && "flex-col items-stretch gap-2.5")}>
      {/* In the bar only from xl: at 1024px the Spanish bar is full already. */}
      {authed ? (
        <Link href="/my-dates" onClick={onNavigate} className={cn(quiet, !block && "hidden xl:inline-flex")}>
          {t("myDates")}
        </Link>
      ) : null}
      <Link href={authed ? "/dashboard" : "/login"} onClick={onNavigate} className={quiet}>
        {authed ? t("dashboard") : t("login")}
      </Link>
      <MakeGiftLink
        onClick={onNavigate}
        className={cn(
          "inline-flex items-center justify-center rounded-full font-semibold whitespace-nowrap",
          block ? "h-12 text-[15px]" : "h-11 px-5 text-[14.5px]",
          dark ? "bg-cream text-forest transition-[background-color,scale] duration-200 hover:bg-cream/90 active:scale-[0.98]" : "btn-rose",
        )}
      >
        {t("createGift")}
      </MakeGiftLink>
    </div>
  );
}
