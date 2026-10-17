"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { errorCode, reportClientError } from "@/lib/client-error";
import { isConnectionError, lastAutoReload, markAutoReload, retryAction, shouldAutoReload, subscribeOnline } from "@/lib/stale-build";

/**
 * A tab that outlived its build asks for a chunk the current one doesn't have, and lands here for
 * something that is not broken. A reload fixes that, so reload instead of showing the screen —
 * unless this tab reloaded itself moments ago, which would make it a loop (see shouldAutoReload).
 * A phone that lost signal while a chunk was downloading lands here the same way; it reloads the
 * moment the connection is back. Anything else is a real crash: it goes to the logs, and the
 * screen shows a code to match it by.
 */
export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("error");
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
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
    const reload = () => {
      markAutoReload();
      window.location.reload();
    };
    // Offline, a reload would only fail again: wait for the connection, then reload by itself.
    if (navigator.onLine) {
      reload();
      return;
    }
    window.addEventListener("online", reload, { once: true });
    return () => window.removeEventListener("online", reload);
  }, [reloading, error]);

  // Showing the error screen for the length of a reload looks worse than showing nothing.
  if (reloading && online) return null;

  const connection = isConnectionError(error, online);
  const retry = retryAction(error) === "reload" ? () => window.location.reload() : reset;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="display-lg">{connection ? t("connectionTitle") : t("title")}</h1>
      <p className="mt-4 max-w-md text-muted-foreground">{connection ? t("connectionDetail") : t("detail")}</p>
      <Button onClick={retry} className="mt-8 rounded-full">
        {connection ? t("reload") : t("retry")}
      </Button>
      {/* Untranslated, so the code in a customer's screenshot is the one in our logs. */}
      <p translate="no" className="mt-6 text-xs text-muted-foreground/70">{t("code", { code: errorCode(error) })}</p>
    </div>
  );
}
