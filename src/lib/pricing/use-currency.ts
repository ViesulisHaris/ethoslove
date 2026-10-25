"use client";

import { useParams } from "next/navigation";
import { chargedCurrency, type Currency } from "@/lib/pricing/products";

/**
 * The currency the page around a client component shows and charges: its hidden [currency] segment,
 * which the proxy picked from the visitor's country (src/proxy.ts). The client's own useLocale for
 * money. Outside a page (a unit test), the first charged currency.
 */
export function useCurrency(): Currency {
  const params = useParams<{ currency?: string }>();
  return chargedCurrency(params?.currency);
}
