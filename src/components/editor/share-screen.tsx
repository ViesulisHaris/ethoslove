"use client";

import { useState } from "react";
import { Car, Check, Copy, ExternalLink, MessageCircle, Plane, Share2, Ticket } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { GiftData } from "@/lib/gift/schema";
import { SITE } from "@/config/site";
import { useEditor } from "@/lib/editor/store";
import { track } from "@/lib/analytics/track";
import { tripLinks } from "@/lib/lifecycle/trip-links";
import { isInApp, shareLink } from "@/lib/app/bridge";
import { PARTNER_NAMES, type PartnerId, type PartnerPlacement } from "@/lib/trips/partners";
import { Button } from "@/components/ui/button";
import { keepAsWritten } from "@/components/shared/keep-as-written";
import { RemindNextYear } from "@/components/reminders/remind-next-year";
import { QrDesigner } from "./qr-designer";

export function ShareScreen({ shortId, status, unlockAt, data, giftId }: { shortId: string; status: "live" | "scheduled"; unlockAt?: string; data: GiftData; giftId: string | null }) {
  const t = useTranslations("editor.share");
  const locale = useLocale();
  // Publishing needs an account, so this is always true here; the reminder is saved to it.
  const authed = useEditor((s) => s.authed);
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
    // Inside the iPhone app, its own share sheet; in a browser, the browser's.
    if (isInApp() || typeof navigator.share === "function") {
      if (!(await shareLink({ title: data.title || data.recipientName, text, url }))) void copy();
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

      <BookTheTrip data={data} />

      {authed ? <RemindNextYear data={data} /> : null}

      <section className="mt-8">
        <p className="font-display text-xl">{t("qrTitle")}</p>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">{t("qrBlurb")}</p>
        <QrDesigner url={url} photos={data.photos} accent={data.accentColor} giftId={giftId} />
      </section>

      {/* Inside the iPhone app its own screens are where the gifts are, and where another is made. */}
      <div className="mt-8 flex flex-col gap-2" data-app-hide>
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

const PARTNER_ICONS: Record<PartnerId, typeof Plane> = { aviasales: Plane, tiqets: Ticket, autoeurope: Car };

/** After a "Pack your bags" is published: the real flights, tickets and car for the trip it promises. */
function BookTheTrip({ data }: { data: GiftData }) {
  const t = useTranslations("lifecycle.trip");
  const locale = useLocale() === "es" ? "es" : "en";
  // Read once: the searches start from the countdown's day, and whether it has passed is a matter of now.
  const [trip] = useState(() => tripLinks(data, locale));
  if (!trip?.links.length) return null;
  const label = (partner: PartnerId) => (partner === "aviasales" ? t("flights", { city: trip.city }) : partner === "tiqets" ? t("tickets", { city: trip.city }) : t("car"));

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-5">
      <p className="font-display text-xl">{t("title")}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t("blurb")}</p>
      <ul className="mt-4 grid gap-2">
        {trip.links.map(({ partner, href }) => {
          const Icon = PARTNER_ICONS[partner];
          return (
            <li key={partner}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer sponsored"
                onClick={() => track("affiliate_click", { partner, placement: "gift_share" satisfies PartnerPlacement, template: data.templateSlug })}
                className="flex min-h-11 items-center gap-3 rounded-full border border-border bg-paper px-4 text-sm font-medium hover:border-ink/40"
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{label(partner)}</span>
                <span className="shrink-0 text-xs font-normal text-muted-foreground">{PARTNER_NAMES[partner]}</span>
              </a>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">{t("disclosure")}</p>
    </section>
  );
}
