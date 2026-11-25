"use client";

import { useEffect } from "react";

/**
 * Opens the closed row an address's #hash names: on a trip's page, `#flights`, `#stay`, `#tickets`
 * and `#car` under "Before you go". The release's hero linked to `#flights`, and links and
 * bookmarks to it are out there; they should land on the flight search, not on a closed line. On
 * load and on every later change of the hash (site-motion.tsx tells a pushed hash by hand).
 */
export function OpenByHash({ ids }: { ids: readonly string[] }) {
  const key = ids.join(" ");
  useEffect(() => {
    const wanted = key.split(" ");
    const open = () => {
      // Read raw, never decoded: the ids are plain ASCII, and decoding a link cut after a `%`
      // (`#flights%`, from a chat app or a hand-typed address) throws and takes the page down.
      const id = window.location.hash.slice(1);
      if (!wanted.includes(id)) return;
      const el = document.getElementById(id);
      if (el instanceof HTMLDetailsElement && !el.open) el.open = true;
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, [key]);
  return null;
}
