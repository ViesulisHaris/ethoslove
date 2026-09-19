"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, MessageCircle, Share2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { GiftData } from "@/lib/gift/schema";
import { SITE } from "@/config/site";
import { Button } from "@/components/ui/button";
import { keepAsWritten } from "@/components/shared/keep-as-written";
import { QrDesigner } from "./qr-designer";

export function ShareScreen({ shortId, status, unlockAt, data, giftId }: { shortId: string; status: "live" | "scheduled"; unlockAt?: string; data: GiftData; giftId: string | null }) {
  const t = useTranslations("editor.share");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : SITE.url;
  const url = `${origin}${SITE.giftPath}/${shortId}`;
  const text = t("shareText", { url });
  const when = unlockAt ? new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short" }).format(new Date(unlockAt)) : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const native = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: data.title || data.recipientName, text, url });
      } catch {
        /* cancelled */
      }
    } else void copy();
  };

  return (
    <div className="px-6 pt-8 pb-10 sm:px-8">
      <p className="text-eyebrow text-coral">{status === "scheduled" ? "Scheduled" : "Live"}</p>
      <h2 className="font-display mt-2 text-3xl">{status === "scheduled" ? t("scheduledTitle") : t("title")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{status === "scheduled" ? t("scheduledSubtitle", { when }) : t.rich("subtitle", { name: data.recipientName, who: keepAsWritten })}</p>

      <div className="mt-6 flex items-center gap-2 rounded-2xl border border-border bg-card p-2 pl-4">
        <span className="min-w-0 flex-1 truncate font-mono text-sm">{url.replace(/^https?:\/\//, "")}</span>
        <Button onClick={copy} className="h-10 shrink-0 rounded-full px-4">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          <span>{copied ? t("copied") : t("copy")}</span>
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <a href={url} target="_blank" rel="noopener" className="flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-card text-sm font-medium hover:border-ink/40">
          <ExternalLink className="size-4" />
          {t("open")}
        </a>
        <button type="button" onClick={native} className="flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-card text-sm font-medium hover:border-ink/40">
          <Share2 className="size-4" />
          {t("shareNative")}
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener" className="flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-card text-sm font-medium hover:border-ink/40">
          <MessageCircle className="size-4" />
          {t("whatsapp")}
        </a>
        <a href={`sms:&body=${encodeURIComponent(text)}`} className="flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-card text-sm font-medium hover:border-ink/40">
          <MessageCircle className="size-4" />
          {t("imessage")}
        </a>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {t("instagram")}: {t("instagramHint")}
      </p>

      <section className="mt-8">
        <p className="font-display text-xl">{t("qrTitle")}</p>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">{t("qrBlurb")}</p>
        <QrDesigner url={url} photos={data.photos} accent={data.accentColor} giftId={giftId} />
      </section>

      <div className="mt-8 flex flex-col gap-2">
        <Button asChild variant="outline" className="h-11 rounded-full">
          <Link href="/dashboard">{t("dashboard")}</Link>
        </Button>
        <Button asChild variant="ghost" className="h-11 rounded-full">
          <Link href="/templates">{t("another")}</Link>
        </Button>
      </div>
    </div>
  );
}
