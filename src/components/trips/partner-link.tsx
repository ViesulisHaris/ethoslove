"use client";

import type { ReactNode } from "react";
import { track } from "@/lib/analytics/track";
import type { PartnerId, PartnerPlacement } from "@/lib/trips/partners";
import type { StayPartner } from "@/lib/trips/stay";

type Props = {
  partner: PartnerId | StayPartner;
  placement: PartnerPlacement;
  /** The preset trip whose page the link is on (its id, like a template's slug). */
  trip?: string;
  href: string;
  /** False for a partner's plain address that carries no id of ours (a stay before STAY22_AID is set): counted the same, not marked sponsored. */
  sponsored?: boolean;
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
export function PartnerLink({ partner, placement, trip, href, sponsored = true, className, children, ...rest }: Props) {
  return (
    <a href={href} target="_blank" rel={sponsored ? "noopener noreferrer sponsored" : "noopener noreferrer"} onClick={() => track("affiliate_click", { partner, placement, ...(trip ? { trip } : {}) })} className={className} {...rest}>
      {children}
    </a>
  );
}
