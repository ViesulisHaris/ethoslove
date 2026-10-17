"use client";

/* eslint-disable @next/next/no-img-element */
import type { ComponentProps } from "react";

/**
 * A plain <img>, drawn from the client side of the RSC boundary on purpose.
 *
 * React's server renderer turns every non-lazy <img> a Server Component renders into a preload
 * hint in the RSC payload, and Next's router applies the hints of every <Link> prefetch the moment
 * it arrives — navigating or not. The header's logo prefetches "/" on every page, so every page
 * was downloading the homepage's hero and lilies. As a client component the payload carries only a
 * reference and props, with nothing to hint; the server-rendered HTML of the page that shows the
 * picture still preloads it, so that page's first paint is unchanged.
 *
 * Only for eager, above-the-fold pictures in Server Components; a lazy one never makes a hint.
 */
export function EagerImg({ alt, ...props }: ComponentProps<"img"> & { alt: string }) {
  return <img alt={alt} {...props} />;
}
