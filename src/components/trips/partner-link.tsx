"use client";

import type { ReactNode } from "react";
import { track } from "@/lib/analytics/track";
import type { PartnerId, PartnerPlacement } from "@/lib/trips/partners";

type Props = {
  partner: PartnerId;
  placement: PartnerPlacement;
  href: string;
  className?: string;
  "aria-label"?: string;
  "data-testid"?: string;
  children: ReactNode;
};

/**
 * A link we may be paid for. It opens in a new tab so the page they were planning on stays put;
 * `sponsored` tells search engines what it is, and `noreferrer` keeps the page they came from to
 * ourselves (the partner id is in the link, so nothing is lost). The click is counted by partner
 * and by where the button sat, never by who pressed it.
 */
export function PartnerLink({ partner, placement, href, className, children, ...rest }: Props) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer sponsored" onClick={() => track("affiliate_click", { partner, placement })} className={className} {...rest}>
      {children}
    </a>
  );
}
