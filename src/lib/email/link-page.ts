import "server-only";

import { siteUrl } from "./urls";

/**
 * The small page behind a link in an email ("remove this reminder", "unsubscribe"). It is served by
 * the route itself, so it works signed out, in any mail app's browser, with nothing to load.
 *
 * A link opened from an email only ever shows a button: mail scanners open links to check them, and
 * a GET that acted would remove things nobody asked to remove. The button POSTs back to the same
 * address, which is also what a mail app's own one-click unsubscribe does (RFC 8058).
 */

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export type LinkPage = {
  locale: "en" | "es";
  title: string;
  body: string;
  /** A button that POSTs to `action` (the page's own address, token included). */
  confirm?: { label: string; action: string };
  home: string;
  status?: number;
};

export function linkPage({ locale, title, body, confirm, home, status = 200 }: LinkPage): Response {
  const homeHref = `${siteUrl()}${locale === "es" ? "/es" : ""}/`;
  const html = `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="light dark">
<title>${escape(title)} · Ethos</title>
<style>
  :root { --paper: #FAF7F2; --ink: #1A1614; --muted: #6F665F; --line: #E6DFD4; --coral: #E8604C; --on-coral: #FFF8F4; }
  @media (prefers-color-scheme: dark) { :root { --paper: #1A1614; --ink: #FAF7F2; --muted: #B8AEA5; --line: #3A332F; } }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--paper); color: var(--ink); font: 16px/1.6 Inter, -apple-system, "Segoe UI", sans-serif; padding: 24px 16px; }
  main { width: 100%; max-width: 440px; }
  h1 { font: italic 400 30px/1.15 Georgia, "Iowan Old Style", serif; letter-spacing: -0.3px; margin: 0 0 14px; }
  p { margin: 0 0 24px; color: var(--muted); }
  button { appearance: none; border: 0; border-radius: 999px; background: var(--coral); color: var(--on-coral); font-family: inherit; font-weight: 600; font-size: 15px; line-height: 1; min-height: 44px; padding: 0 22px; cursor: pointer; }
  a { color: var(--ink); }
  .home { display: inline-block; margin-top: 20px; font-size: 14px; color: var(--muted); }
</style>
</head>
<body>
<main>
  <h1>${escape(title)}</h1>
  <p>${escape(body)}</p>
  ${confirm ? `<form method="post" action="${escape(confirm.action)}"><button type="submit">${escape(confirm.label)}</button></form>` : ""}
  <a class="home" href="${escape(homeHref)}">${escape(home)}</a>
</main>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
      // The token is in this page's address: it must not travel on to the next site as a referrer.
      "referrer-policy": "no-referrer",
      "x-robots-tag": "noindex",
    },
  });
}
