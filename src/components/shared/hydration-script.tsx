"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * An inline script that has to run from the server's HTML, before the page paints (a mark set on
 * its parent, say). It is in the HTML and in the hydration that follows, and nowhere else.
 *
 * A plain `<script>` in a page's JSX is also handed to the browser when the page is reached by a
 * click from another page: React then creates the element itself, never runs it, and says so
 * ("Encountered a script tag while rendering React component"), which a development server shows
 * as a red error over the page. The owner met that on the gift finder on 23 Nov 2026. Reached by a
 * click there is no first paint of server HTML to get ahead of, so there is nothing for the script
 * to do, and this renders nothing.
 */
export function HydrationScript({ html }: { html: string }) {
  // True on the server and while its HTML is being hydrated; false on any later render and on a page reached by a click.
  const fromServer = useSyncExternalStore(subscribe, () => false, () => true);
  return fromServer ? <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} /> : null;
}
