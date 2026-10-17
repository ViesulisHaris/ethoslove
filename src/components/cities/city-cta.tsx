"use client";

import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/track";
import type { PartnerId, PartnerPlacement } from "@/lib/trips/partners";

export type CityCtaKind = "map" | "idea" | "place" | "gift" | "plan" | "tickets" | "city";

type Props = {
  href: string;
  cta: CityCtaKind;
  /** The page's city slug, never anything about the visitor. */
  city: string;
  className?: string;
  children: ReactNode;
  /**
   * A partner's link: opens in a new tab, is marked as paid, keeps this page's address from the
   * partner (the partner id is in the link), and is counted as an affiliate click too.
   */
  partner?: PartnerId;
};

/**
 * A way off a city's page, counted, so it can be seen whether people who arrive from a search go
 * on to the map, to a gift, or nowhere.
 */
export function CityCta({ href, cta, city, className, children, partner }: Props) {
  if (partner) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className={className}
        onClick={() => {
          track("city_page_cta", { cta, city });
          track("affiliate_click", { partner, placement: "city" satisfies PartnerPlacement });
        }}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} onClick={() => track("city_page_cta", { cta, city })}>
      {children}
    </Link>
  );
}
