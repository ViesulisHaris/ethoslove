import { z } from "zod";

/**
 * What an error screen sends home. Until this existed the screen said "we've been notified" and
 * nothing was: a crash in someone's browser left no trace on our side, so the only way to learn
 * what broke was to reproduce it. Trimmed hard, so a report can never carry a page of text.
 */
export const clientErrorSchema = z.object({
  /** Which boundary caught it: a page, the root layout, or a gift inside its own frame. */
  where: z.enum(["page", "root", "gift"]),
  code: z.string().max(12),
  name: z.string().max(80),
  message: z.string().max(500),
  digest: z.string().max(80).optional(),
  stack: z.string().max(2000).optional(),
  /** Path only: a query string can hold a token, and a hash is never ours. */
  path: z.string().max(300),
  template: z.string().max(40).optional(),
  /** The deployment the tab was loaded from, which is how an old tab shows itself. */
  build: z.string().max(64).optional(),
});

export type ClientErrorReport = z.infer<typeof clientErrorSchema>;
export type ErrorLike = { name?: string; message?: string; stack?: string; digest?: string };

const STACK_LINES = 12;

/**
 * A short code for the error screen, the same for the same error, so a screenshot someone sends
 * us finds its log line. FNV-1a over name and message; no randomness, so it can be drawn during
 * render and matches what was reported.
 */
export function errorCode(error: ErrorLike | null | undefined): string {
  const text = `${error?.name ?? ""}|${error?.digest ?? error?.message ?? ""}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(6, "0").slice(-6);
}

export function buildClientErrorReport(
  error: ErrorLike | null | undefined,
  where: ClientErrorReport["where"],
  context: { path: string; template?: string; build?: string },
): ClientErrorReport {
  const stack = error?.stack?.split("\n").slice(0, STACK_LINES).join("\n").slice(0, 2000);
  return {
    where,
    code: errorCode(error),
    name: (error?.name || "Error").slice(0, 80),
    message: (error?.message ?? "").slice(0, 500),
    ...(error?.digest ? { digest: error.digest.slice(0, 80) } : {}),
    ...(stack ? { stack } : {}),
    path: context.path.split(/[?#]/)[0].slice(0, 300),
    ...(context.template ? { template: context.template.slice(0, 40) } : {}),
    ...(context.build ? { build: context.build.slice(0, 64) } : {}),
  };
}

/** One report per error per page load: React can render a boundary more than once for the same crash. */
const sent = new Set<string>();

export function reportClientError(error: ErrorLike | null | undefined, where: ClientErrorReport["where"], template?: string): void {
  if (typeof window === "undefined") return;
  const report = buildClientErrorReport(error, where, {
    path: window.location.pathname,
    template,
    build: process.env.NEXT_DEPLOYMENT_ID || undefined,
  });
  const key = `${where}|${report.code}|${report.path}`;
  if (sent.has(key)) return;
  sent.add(key);
  const body = JSON.stringify(report);
  try {
    // A beacon still goes out if the person closes the tab on the error screen.
    if (navigator.sendBeacon?.("/api/client-error", new Blob([body], { type: "application/json" }))) return;
  } catch {
    // fall through to fetch
  }
  void fetch("/api/client-error", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
}
