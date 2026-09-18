"use client";

import { useEffect } from "react";
import { isOwnError, reportClientError } from "@/lib/client-error";

/** Enough to learn what broke; a page stuck in a loop of errors can't fill the logs. */
const MAX_PER_PAGE_LOAD = 5;

/**
 * Errors that break something without ever reaching an error screen: an event handler that throws,
 * a promise nobody catches. Until now they were visible only in Clarity, as a message with no
 * stack and no browser — "Maximum call stack size exceeded." six times from one iPhone on iOS 27,
 * with nothing to say where. They go to the same log line as the error screens' reports
 * (`[client-error]`, with `where: "window"` or `"promise"`), filtered to our own code.
 */
export function ErrorReporter() {
  useEffect(() => {
    let reported = 0;
    const origin = window.location.origin;
    const report = (error: { name?: string; message?: string; stack?: string }, where: "window" | "promise") => {
      if (reported >= MAX_PER_PAGE_LOAD) return;
      reported++;
      reportClientError(error, where);
    };
    const onError = (event: ErrorEvent) => {
      const error = event.error instanceof Error ? event.error : undefined;
      const message = error?.message ?? event.message;
      if (!isOwnError({ message, filename: event.filename, stack: error?.stack }, origin)) return;
      report(error ?? { name: "Error", message, stack: `at ${event.filename}:${event.lineno}:${event.colno}` }, "window");
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason: unknown = event.reason;
      // A rejection with no Error in it (IndexedDB rejects with null) carries nothing to act on.
      if (!(reason instanceof Error) || !isOwnError(reason, origin)) return;
      report(reason, "promise");
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
