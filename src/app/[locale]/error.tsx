"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { isStaleBuild } from "@/lib/stale-build";

/**
 * A page open while we deploy is holding the old build's HTML, and every template is a lazy chunk
 * whose filename changed underneath it. The next import 404s, React throws, and this boundary
 * catches it — which is how "I tried to open Jar of Reasons" ends on an error screen for something
 * that is not broken. One reload fixes that, so do the reload instead of showing the screen. Once
 * per tab, so an error that is genuinely ours can never put the page in a loop.
 */
const RELOADED = "ethos:stale-chunk-reload";

function shouldReload(error: Error): boolean {
  if (typeof window === "undefined" || !isStaleBuild(error)) return false;
  try {
    return !sessionStorage.getItem(RELOADED);
  } catch {
    return true; // private window, no storage: one reload still beats the error screen
  }
}

export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("error");
  const reloading = shouldReload(error);

  useEffect(() => {
    if (!reloading) {
      console.error(error);
      return;
    }
    try {
      sessionStorage.setItem(RELOADED, "1");
    } catch {
      // nothing to remember it with; the reload below still happens
    }
    window.location.reload();
  }, [reloading, error]);

  // Showing the error screen for the length of a reload looks worse than showing nothing.
  if (reloading) return null;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="display-lg">{t("title")}</h1>
      <p className="mt-4 max-w-md text-muted-foreground">{t("detail")}</p>
      <Button onClick={reset} className="mt-8 rounded-full">
        {t("retry")}
      </Button>
    </div>
  );
}
