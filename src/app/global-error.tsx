"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { errorCode, reportClientError } from "@/lib/client-error";
import { isConnectionError, lastAutoReload, markAutoReload, retryAction, shouldAutoReload, subscribeOnline } from "@/lib/stale-build";
// Nothing heavier than these small, import-free files: every module this screen pulls in is one
// more chunk that can fail on the same dropped connection, and then there is no screen at all.
import { pathLocale } from "@/i18n/path-locale";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/locales";

/**
 * Its own words rather than the message catalogue's: this screen renders when the root layout
 * itself has failed, so next-intl is not there to ask. The same lines as the `error` namespace in
 * messages/*.json; keep the two in step.
 */
const COPY: Record<Locale, { title: string; detail: string; retry: string; connectionTitle: string; connectionDetail: string; reload: string; code: string }> = {
  en: {
    title: "Something broke on our side",
    detail: "We've been notified. Try again in a moment.",
    retry: "Try again",
    connectionTitle: "This page didn't finish loading",
    connectionDetail: "Usually the signal dropped for a moment. Reload once you're connected.",
    reload: "Reload",
    code: "Error code",
  },
  es: {
    title: "Algo falló de nuestro lado",
    detail: "Ya lo sabemos. Inténtalo de nuevo en un momento.",
    retry: "Reintentar",
    connectionTitle: "Esta página no terminó de cargar",
    connectionDetail: "Casi siempre es que se cortó la señal un momento. Recarga cuando vuelvas a tener conexión.",
    reload: "Recargar",
    code: "Código de error",
  },
};

const BODY = { fontFamily: "system-ui, sans-serif", background: "#FAF7F2", color: "#1A1614", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 } as const;

const never = () => () => {};

/**
 * Last-resort error boundary. Must render its own <html>/<body>.
 *
 * A chunk that fails to load while the page first hydrates always lands here, not in
 * [locale]/error.tsx: the root layout's own client code is what failed, and that boundary needs the
 * same chunk to render. That is a phone losing signal mid-download as often as a deploy, so, like
 * the page boundary, this reloads by itself (once online) instead of blaming the server.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // The prerendered copy of this screen is in the default language; the address bar says which
  // one the visitor was reading, and React swaps it in right after hydrating.
  const locale = useSyncExternalStore(never, () => pathLocale(window.location.pathname), () => DEFAULT_LOCALE);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  // Decided once, as in [locale]/error.tsx: both share the loop guard in sessionStorage.
  const [reloading] = useState(() => {
    if (typeof window === "undefined") return false;
    const last = lastAutoReload();
    return last !== undefined && shouldAutoReload(error, last, Date.now());
  });

  useEffect(() => {
    if (!reloading) {
      console.error(error);
      reportClientError(error, "root");
      return;
    }
    const reload = () => {
      markAutoReload();
      window.location.reload();
    };
    if (navigator.onLine) {
      reload();
      return;
    }
    window.addEventListener("online", reload, { once: true });
    return () => window.removeEventListener("online", reload);
  }, [reloading, error]);

  const copy = COPY[locale];
  const connection = isConnectionError(error, online);
  // `reset` re-renders the same tree, which throws the same cached chunk error straight away.
  const retry = retryAction(error) === "reload" ? () => window.location.reload() : reset;

  return (
    <html lang={locale}>
      <body style={BODY}>
        {/* Blank for the length of the reload, rather than a flash of an error that isn't one. */}
        {reloading && online ? null : (
          <div style={{ textAlign: "center", padding: 24, maxWidth: 420 }}>
            <h1 style={{ fontSize: 28, margin: 0 }}>{connection ? copy.connectionTitle : copy.title}</h1>
            <p style={{ opacity: 0.7 }}>{connection ? copy.connectionDetail : copy.detail}</p>
            <button onClick={retry} style={{ marginTop: 16, minHeight: 44, padding: "10px 20px", borderRadius: 999, border: 0, background: "#E8604C", color: "#fff", fontWeight: 600 }}>
              {connection ? copy.reload : copy.retry}
            </button>
            <p translate="no" style={{ marginTop: 20, fontSize: 12, opacity: 0.5 }}>
              {copy.code} {errorCode(error)}
            </p>
          </div>
        )}
      </body>
    </html>
  );
}
