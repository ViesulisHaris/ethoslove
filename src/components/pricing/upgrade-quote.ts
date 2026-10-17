"use client";

import { useEffect, useState } from "react";
import type { Currency } from "@/lib/pricing/products";
import { hasSessionCookie } from "@/lib/supabase/session-cookie";
import type { UpgradeQuote } from "./offers";

/**
 * What the signed-in visitor's earlier purchases knock off Everything (GET /api/money/upgrade), in
 * the currency on the page. Null for a guest, for someone with nothing to upgrade from, and on any
 * failure: the page then simply offers Everything at its full price.
 */
export async function fetchUpgradeQuote(currency: Currency): Promise<UpgradeQuote | null> {
  // The home page and /pricing ask on every visit: a browser that has never signed in has nothing
  // to upgrade from, and shouldn't cost a function call to find that out.
  if (!hasSessionCookie()) return null;
  try {
    const res = await fetch(`/api/money/upgrade?currency=${currency}`, { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) return null;
    const json = (await res.json()) as { amount?: unknown; currency?: unknown };
    return typeof json.amount === "number" && (json.currency === "eur" || json.currency === "usd" || json.currency === "gbp")
      ? { amount: json.amount, currency: json.currency }
      : null;
  } catch {
    return null;
  }
}

/** The quote, fetched once per currency while `enabled`. */
export function useUpgradeQuote(currency: Currency, enabled = true): UpgradeQuote | null {
  const [quote, setQuote] = useState<{ for: Currency; value: UpgradeQuote | null } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    void fetchUpgradeQuote(currency).then((value) => {
      if (live) setQuote({ for: currency, value });
    });
    return () => {
      live = false;
    };
  }, [currency, enabled]);
  return enabled && quote?.for === currency ? quote.value : null;
}
