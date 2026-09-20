"use client";

import type { ComponentProps, MouseEvent } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { GALLERY_ID } from "@/components/templates/gallery-id";

type Props = Omit<ComponentProps<typeof Link>, "href">;

/**
 * "Make a gift" leads to the gallery. On the gallery itself a link to the page you're already on
 * does nothing, and that was the most-tapped dead spot on the site's busiest page: 28% of its
 * dead taps in a week. There it scrolls to the templates instead — the same answer to the same
 * tap. The hash in the href is the fallback for a tap before the page has hydrated.
 */
export function MakeGiftLink({ onClick, ...props }: Props) {
  const onGallery = usePathname() === "/templates";
  return (
    <Link
      {...props}
      href={onGallery ? `/templates#${GALLERY_ID}` : "/templates"}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (!onGallery || event.defaultPrevented) return;
        const grid = document.getElementById(GALLERY_ID);
        if (!grid) return;
        event.preventDefault();
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        grid.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      }}
    />
  );
}
