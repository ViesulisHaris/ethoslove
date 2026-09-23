"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * The partner's way in to a pass: the link, a copy button and the phone's own share sheet. The link
 * is the whole invitation, so it is shown in full rather than behind a button.
 */
export function InviteLink({ url, tone = "light", className }: { url: string; tone?: "light" | "dark"; className?: string }) {
  const t = useTranslations("money.invite");
  const [copied, setCopied] = useState(false);
  const dark = tone === "dark";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard refused (an in-app browser): the link is on screen to select by hand.
    }
  };

  const share = async () => {
    if (!navigator.share) return void copy();
    try {
      await navigator.share({ title: t("shareTitle"), text: t("shareText"), url });
    } catch {
      // Dismissed.
    }
  };

  return (
    <div className={className} data-testid="invite-link">
      <p className={cn("text-eyebrow", dark ? "text-blush" : "text-ink-soft")}>{t("label")}</p>
      <p
        className={cn(
          "mt-2 rounded-2xl px-4 py-3 font-mono text-sm break-all select-all",
          dark ? "bg-white/10 text-cream ring-1 ring-white/15" : "border border-border bg-card text-ink",
        )}
      >
        {url.replace(/^https?:\/\//, "")}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={copy}
          className={cn(
            "inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors",
            dark ? "bg-cream text-forest hover:bg-white" : "bg-ink text-paper hover:bg-ink/90",
          )}
        >
          {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
          <span aria-live="polite">{copied ? t("copied") : t("copy")}</span>
        </button>
        <button
          type="button"
          onClick={share}
          className={cn(
            "inline-flex h-11 items-center justify-center gap-2 rounded-full border text-sm font-semibold transition-colors",
            dark ? "border-white/25 text-cream hover:bg-white/10" : "border-ink text-ink hover:bg-ink hover:text-paper",
          )}
        >
          <Share2 aria-hidden="true" className="size-4" />
          {t("share")}
        </button>
      </div>
      <p className={cn("mt-3 text-[13px]", dark ? "text-cream/60" : "text-muted-foreground")}>{t("note")}</p>
    </div>
  );
}
