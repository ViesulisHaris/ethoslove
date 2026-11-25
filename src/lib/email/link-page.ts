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
  /**
   * A button that POSTs to `action` (the page's own address, token included), with `fields` sent as
   * hidden form fields: a route may move its token there to keep it out of the address it POSTs to.
   */
  confirm?: { label: string; action: string; fields?: Record<string, string> };
  /** A plain link onward, drawn as the button is (a page that has already acted: "Make it"). */
  next?: { label: string; href: string };
  home: string;
  status?: number;
};

/** The seal and its heart, as components/shared/logo.tsx draws them (this page loads no script or stylesheet). */
const SEAL =
  "M16 2.05C17.22 2.05 18.22 3.44 19.29 3.73C20.36 4.01 21.92 3.31 22.97 3.92C24.03 4.53 24.2 6.23 24.98 7.02C25.77 7.8 27.47 7.97 28.08 9.03C28.69 10.08 27.99 11.64 28.27 12.71C28.56 13.78 29.95 14.78 29.95 16C29.95 17.22 28.56 18.22 28.27 19.29C27.99 20.36 28.69 21.92 28.08 22.97C27.47 24.03 25.77 24.2 24.98 24.98C24.2 25.77 24.03 27.47 22.97 28.08C21.92 28.69 20.36 27.99 19.29 28.27C18.22 28.56 17.22 29.95 16 29.95C14.78 29.95 13.78 28.56 12.71 28.27C11.64 27.99 10.08 28.69 9.03 28.08C7.97 27.47 7.8 25.77 7.02 24.98C6.23 24.2 4.53 24.03 3.92 22.97C3.31 21.92 4.01 20.36 3.73 19.29C3.44 18.22 2.05 17.22 2.05 16C2.05 14.78 3.44 13.78 3.73 12.71C4.01 11.64 3.31 10.08 3.92 9.03C4.53 7.97 6.23 7.8 7.02 7.02C7.8 6.23 7.97 4.53 9.03 3.92C10.08 3.31 11.64 4.01 12.71 3.73C13.78 3.44 14.78 2.05 16 2.05Z";
const HEART = "M16 12.09c-1.9-2.4-5.6-1.8-6.4 1.2-.6 2.3.9 4.2 2.7 5.8l3.7 3.3 3.7-3.3c1.8-1.6 3.3-3.5 2.7-5.8-.8-3-4.5-3.6-6.4-1.2Z";

/**
 * Drawn as the site is: its paper, one card, the name with its seal, and the rendered lily lying
 * across the card's corner (the one picture; the page is whole without it). The colours are the
 * site's own (globals.css `--brand-*`), written out because nothing is loaded here.
 */
export function linkPageHtml({ locale, title, body, confirm, next, home }: Omit<LinkPage, "status">, site = siteUrl()): string {
  const homeHref = `${site}${locale === "es" ? "/es" : ""}/`;
  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="light dark">
<title>${escape(title)} · Ethos</title>
<style>
  :root { --paper: #f3e1d5; --card: #fbf1e9; --ink: #24121b; --muted: #5d4652; --line: #e3cbbd; --rose: #bd2a5e; --rose-deep: #a31f52; --on-rose: #fff8f4; --seal-heart: #fbf6ee; --shade: rgba(120, 52, 74, 0.14); }
  @media (prefers-color-scheme: dark) { :root { --paper: #14110e; --card: #1e1a16; --ink: #faf7f2; --muted: #b8aea5; --line: rgba(255, 255, 255, 0.12); --rose: #d6336c; --rose-deep: #bd2a5e; --shade: rgba(0, 0, 0, 0.4); } }
  * { box-sizing: border-box; }
  html { overflow-x: hidden; }
  body { margin: 0; min-height: 100vh; min-height: 100dvh; display: grid; place-items: center; background: var(--paper); color: var(--ink); font: 16px/1.6 Inter, -apple-system, "Segoe UI", sans-serif; padding: 72px 16px 40px; }
  main { width: 100%; max-width: 440px; }
  .card { position: relative; background: var(--card); border: 1px solid var(--line); border-radius: 28px; padding: 28px 28px 30px; box-shadow: 0 18px 40px -24px var(--shade); }
  .lily { position: absolute; top: -64px; right: -8px; width: 172px; height: auto; transform: rotate(-8deg); pointer-events: none; user-select: none; }
  .brand { display: inline-flex; align-items: center; gap: 7px; margin: 0 0 22px; color: var(--ink); text-decoration: none; font: italic 400 25px/1 Georgia, "Iowan Old Style", serif; letter-spacing: -0.5px; }
  .brand svg { width: 28px; height: 28px; flex: none; }
  .brand span { position: relative; top: 2px; }
  h1 { font: italic 400 31px/1.15 Georgia, "Iowan Old Style", serif; letter-spacing: -0.4px; margin: 0 0 12px; text-wrap: balance; }
  p { margin: 0 0 24px; color: var(--muted); text-wrap: pretty; }
  button, .next { appearance: none; border: 0; border-radius: 999px; background: var(--rose); color: var(--on-rose); font-family: inherit; font-weight: 600; font-size: 16px; line-height: 1.2; min-height: 48px; padding: 10px 26px; text-align: center; cursor: pointer; box-shadow: 0 10px 22px -12px var(--rose); }
  button:hover, .next:hover { background: var(--rose-deep); }
  button:focus-visible, a:focus-visible { outline: 2px solid var(--rose); outline-offset: 3px; }
  .next { display: flex; width: fit-content; align-items: center; text-decoration: none; }
  .home { display: inline-flex; align-items: center; min-height: 44px; margin: 10px 0 0 28px; font-size: 14px; color: var(--muted); text-underline-offset: 3px; }
  @media (max-width: 360px) { .card { padding: 24px 22px 26px; } .home { margin-left: 22px; } .lily { width: 150px; top: -56px; } h1 { font-size: 28px; } }
</style>
</head>
<body>
<main>
  <div class="card">
    <img class="lily" src="${escape(site)}/art/pages/lily-side-blush-1x.webp" width="449" height="344" alt="">
    <a class="brand" href="${escape(homeHref)}" aria-label="Ethos"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="${SEAL}" fill="var(--rose)"/><path d="${HEART}" fill="var(--seal-heart)" opacity="0.95"/></svg><span>Ethos</span></a>
    <h1>${escape(title)}</h1>
    <p>${escape(body)}</p>
    ${confirm ? `<form method="post" action="${escape(confirm.action)}">${Object.entries(confirm.fields ?? {}).map(([name, value]) => `<input type="hidden" name="${escape(name)}" value="${escape(value)}">`).join("")}<button type="submit">${escape(confirm.label)}</button></form>` : ""}
    ${next ? `<a class="next" href="${escape(next.href)}">${escape(next.label)}</a>` : ""}
  </div>
  <a class="home" href="${escape(homeHref)}">${escape(home)}</a>
</main>
</body>
</html>`;
}

export function linkPage({ status = 200, ...page }: LinkPage): Response {
  const html = linkPageHtml(page);
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
