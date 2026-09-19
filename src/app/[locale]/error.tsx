"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { errorCode, reportClientError } from "@/lib/client-error";
import { shouldAutoReload } from "@/lib/stale-build";

/**
 * A tab that outlived its build asks for a chunk the current one doesn't have, and lands here for
 * something that is not broken. A reload fixes that, so reload instead of showing the screen —
 * unless this tab reloaded itself moments ago, which would make it a loop (see shouldAutoReload).
 * Anything else is a real crash: it goes to the logs, and the screen shows a code to match it by.
 */
const RELOADED_AT = "ethos:stale-chunk-reload";

/** When this tab last reloaded itself; null if never, undefined if there is no storage to ask. */
function lastAutoReload(): number | null | undefined {
  try {
    const value = sessionStorage.getItem(RELOADED_AT);
    return value === null ? null : Number(value);
  } catch {
    return undefined;
  }
}

export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("error");
  // Decided once, when the screen mounts (each new error mounts it afresh), so a re-render while
  // the reload is under way can't flash the screen. With no storage to remember a reload by, one
  // that didn't help would repeat forever: don't.
  const [reloading] = useState(() => {
    if (typeof window === "undefined") return false;
    const last = lastAutoReload();
    return last !== undefined && shouldAutoReload(error, last, Date.now());
  });

  useEffect(() => {
    if (!reloading) {
      console.error(error);
      reportClientError(error, "page");
      return;
    }
    try {
      sessionStorage.setItem(RELOADED_AT, String(Date.now()));
    } catch {
      // unreachable: reloading is only chosen when storage answered
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
      {/* Untranslated, so the code in a customer's screenshot is the one in our logs. */}
      <p translate="no" className="mt-6 text-xs text-muted-foreground/70">{t("code", { code: errorCode(error) })}</p>
    </div>
  );
}
