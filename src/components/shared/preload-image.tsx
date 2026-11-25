"use client";

import { preload } from "react-dom";

/**
 * Asks for a picture from the page's <head>, at once, for the screens `media` names: for a lazy
 * picture in the first view that only some screens draw, so it is not waited for until the
 * stylesheet has laid the page out, and a screen that hides it never downloads it. The same
 * `srcSet` and `sizes` as the <img> it is for, or the browser picks another file and fetches twice.
 *
 * Not for a gift's demo photos: tried on 25 Nov 2026, they slowed the page's scripts, and a gift's
 * loading screen holds for its 1.6 s from when the scripts have run, so the gift opened later.
 *
 * A client component for the reason EagerImg is one (eager-img.tsx): a Server Component's preload
 * rides in its RSC payload, and Next applies the hints of every <Link> prefetch as it arrives, so
 * every page that links here would download the picture. Here it is in this page's HTML only.
 */
export function PreloadImage({ href, srcSet, sizes, media, high }: { href: string; srcSet?: string; sizes?: string; media?: string; /** The page's largest paint: ahead of the scripts. */ high?: boolean }) {
  preload(href, { as: "image", ...(srcSet ? { imageSrcSet: srcSet, imageSizes: sizes } : null), ...(media ? { media } : null), ...(high ? { fetchPriority: "high" as const } : null) });
  return null;
}
