"use client";

import { useState } from "react";
import { Check, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { track } from "@/lib/analytics/track";
import { shareLink } from "@/lib/app/bridge";

/**
 * "Send this trip to them", beside Save in a trip's hero: the share sheet where there is one (the
 * app's own inside the iPhone app), a copied link where there is not, and the link written out to
 * copy by hand where the clipboard says no. No account. The link is the trip's page as it is, with
 * nothing added; its preview is the trip's own picture (the page names its share card).
 */
export function ShareTripButton({ tripId, title, className }: { tripId: string; title: string; className?: string }) {
  const t = useTranslations("trips.detail.share");
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState<string | null>(null);

  const send = async () => {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    if (await shareLink({ url: url.href, title, text: t("text", { title }) })) {
      track("trip_shared", { trip: tripId, how: "share" });
      return;
    }
    try {
      await navigator.clipboard.writeText(url.href);
      setManual(null);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
      track("trip_shared", { trip: tripId, how: "copy" });
    } catch {
      setManual(url.href);
    }
  };

  return (
    <>
      <button type="button" data-testid="share-trip" onClick={() => void send()} className={className}>
        {copied ? <Check aria-hidden="true" className="size-4 text-rose-deep" /> : <Send aria-hidden="true" className="size-4 text-rose-deep" />}
        <span aria-live="polite">{copied ? t("copied") : t("cta")}</span>
      </button>
      {manual ? <input readOnly value={manual} aria-label={t("manual")} onFocus={(e) => e.currentTarget.select()} className="h-11 basis-full rounded-xl border border-line bg-paper px-3 text-sm text-forest" /> : null}
    </>
  );
}
