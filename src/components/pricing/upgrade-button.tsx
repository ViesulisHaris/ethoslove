"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useLocale } from "next-intl";
import { track } from "@/lib/analytics/track";
import type { Currency } from "@/lib/pricing/products";
import { Button } from "@/components/ui/button";
import { startCheckout, useCheckoutError } from "./checkout";

/**
 * "Upgrade to Everything for the difference". The label carries the price the server quoted; checkout
 * works it out again from the same purchases, so the two can't disagree.
 */
export function UpgradeButton({ label, currency, returnTo }: { label: string; currency: Currency; returnTo: string }) {
  const locale = useLocale() === "es" ? "es" : "en";
  const [busy, setBusy] = useState(false);
  const showCheckoutError = useCheckoutError();

  const upgrade = async () => {
    setBusy(true);
    track("pay_clicked", { product: "upgrade", source: "account" });
    const result = await startCheckout({ product: "upgrade", currency, locale, returnTo });
    if ("url" in result) return void window.location.assign(result.url);
    setBusy(false);
    showCheckoutError(result.error);
  };

  return (
    <Button onClick={upgrade} disabled={busy} className="h-11 rounded-full px-5" data-testid="upgrade-everything">
      {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}
