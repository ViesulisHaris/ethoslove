"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";

const noStore = () => () => {};

/**
 * Puts an attribute on <html> or <body> for as long as this is on the page, so the stylesheet can
 * style the whole document by what page is open: a themed page's footer and header button, a gift
 * route's colours, a page with a button docked at the bottom.
 *
 * These were `:root:has([data-…])` and `body:has([data-…])` rules. A `:has()` on the root makes
 * the browser check the whole document again each time anything is added anywhere in it, and every
 * press that opens or fills something adds something: on the front page that was most of the half
 * second the menu took to open on a slow phone (performance pass, 24 Nov 2026). An attribute costs
 * nothing to look up.
 *
 * In the server's HTML a one-line script sets it as the page is read, before anything below it is
 * drawn; after a move between pages the effect sets it before the new page is painted, and takes
 * it away when the page that wanted it goes.
 */
export function DocumentMark({ on, name, value = "" }: { on: "html" | "body"; name: `data-${string}`; value?: string }) {
  useLayoutEffect(() => {
    const el = on === "html" ? document.documentElement : document.body;
    el.setAttribute(name, value);
    return () => {
      if (el.getAttribute(name) === value) el.removeAttribute(name);
    };
  }, [on, name, value]);
  // The script is for the server's HTML only. Drawn by a move between pages it would never run (the
  // effect above does its work there), and React warns of a script tag rendered in the browser.
  const fromServer = useSyncExternalStore(noStore, () => false, () => true);
  if (!fromServer) return null;
  const target = on === "html" ? "document.documentElement" : "document.body";
  return <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: `${target}.setAttribute(${JSON.stringify(name)},${JSON.stringify(value).replace(/</g, "\\u003c")})` }} />;
}
