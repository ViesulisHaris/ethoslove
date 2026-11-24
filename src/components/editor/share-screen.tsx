"use client";

import { useCallback, useState } from "react";
import { Car, Check, Copy, ExternalLink, MessageCircle, Plane, Share2, Star, Ticket } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { GiftData } from "@/lib/gift/schema";
import { SITE } from "@/config/site";
import { useEditor } from "@/lib/editor/store";
import { track } from "@/lib/analytics/track";
import { tripLinks } from "@/lib/lifecycle/trip-links";
import { rememberQrDesign } from "@/lib/qr/remember";
import type { HolidayExtra } from "@/lib/lifecycle/holiday-extras";
import { isInApp, shareLink } from "@/lib/app/bridge";
import { PARTNER_NAMES, type PartnerId, type PartnerPlacement } from "@/lib/trips/partners";
import { Button } from "@/components/ui/button";
import { keepAsWritten } from "@/components/shared/keep-as-written";
import { AnniversaryDates } from "@/components/reminders/anniversary-dates";
import { RemindNextYear } from "@/components/reminders/remind-next-year";
import { QrDesigner } from "./qr-designer";
import { TreeTagRow } from "./tree-tag-row";
import { OfferEmailsBox } from "./offer-emails-box";
import { useEtsyMode } from "./etsy-claim";
import type { PairOnShare, PairPreviewState, TwoMoreGifts } from "./two-more-gifts";
import { UsedGiftLine } from "./pair-used";

/**
 * Two more gifts under the link: the card's own code (imported by the publish sheet while it is open,
 * so none of it weighs on the editor) and what it draws from, both in hand before this screen's first
 * frame. Absent: no card, and nothing reserved for one.
 */
export type ShareScreenPair = PairOnShare & { Card: typeof TwoMoreGifts };

export function ShareScreen({
  shortId,
  status,
  unlockAt,
  data,
  giftId,
  usedGift = false,
  usedLeft = 0,
  pair,
  pairPreview,
  holidayExtra = null,
  ideaNotice = null,
  ideaBox = false,
}: {
  shortId: string;
  status: "live" | "scheduled";
  unlockAt?: string;
  data: GiftData;
  giftId: string | null;
  /** This gift went out on a gift ready (two more gifts): the card under the link says so. */
  usedGift?: boolean;
  /** With `usedGift`: gifts ready left after this one. */
  usedLeft?: number;
  pair?: ShareScreenPair | null;
  /** Development page only: the state the two more gifts card opens in. */
  pairPreview?: PairPreviewState;
  /** What the publish says this gift is offered (lib/lifecycle/holiday-extras.ts). */
  holidayExtra?: HolidayExtra | null;
  /** Sending this gift started the monthly idea: the line that says so (lib/lifecycle/monthly-idea.ts). */
  ideaNotice?: string | null;
  /** The offers box's sentence names the monthly idea too (the settings "optin" and "buyers"). */
  ideaBox?: boolean;
}) {
  const t = useTranslations("editor.share");
  const locale = useLocale();
  // What the publish says this gift is offered (lib/lifecycle/holiday-extras.ts): the stamp its first
  // publish left, the one the dashboard and the print page read, never worked out again here.
  const treeTag = holidayExtra === "tree-tag";
  const [designQuery, setDesignQuery] = useState("");
  // Kept in this browser too, so the dashboard's Tree Tag link prints the same code later (lib/qr/remember.ts).
  const onDesignChange = useCallback(
    (query: string) => {
      setDesignQuery(query);
      if (treeTag && giftId) rememberQrDesign(giftId, query);
    },
    [treeTag, giftId],
  );
  // Publishing needs an account, so this is always true here; the reminder is saved to it.
  const authed = useEditor((s) => s.authed);
  const [copied, setCopied] = useState(false);
  const [etsy] = useEtsyMode();
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

      {/* Under the link, never in its way; not for an Etsy buyer, nor inside the iPhone app (the App Store sells there). */}
      {/* A gift sent on a gift ready says so without waiting for the card's own code to load. */}
      {authed && !etsy && usedGift ? (
        <div data-app-hide>
          <UsedGiftLine data={data} left={usedLeft} saved={pair?.saved} />
        </div>
      ) : authed && !etsy && pair ? (
        <div data-app-hide>
          <pair.Card data={data} ent={pair.ent} afterPayment={pair.afterPayment} left={pair.left} saved={pair.saved} preview={pairPreview} />
        </div>
      ) : null}

      <EtsyReview template={data.templateSlug} />

      <BookTheTrip data={data} />

      {authed ? <RemindNextYear data={data} /> : null}
      <AnniversaryDates templateSlug={data.templateSlug} authed={authed} />

      {/* The yes our offer emails need, asked of the account that just sent a gift; not inside the iPhone app. */}
      {authed ? (
        <div data-app-hide>
          <OfferEmailsBox ideaNotice={ideaNotice} ideaBox={ideaBox} />
        </div>
      ) : null}

      {/* The paid bonus the Christmas e-mail sells, just above the QR card: in reach on a phone (below the designer it sat four screens down), and the design chosen below travels with it. */}
      {treeTag && giftId ? (
        <TreeTagRow
          href={`/dashboard/gift/${giftId}/print?shape=tree-tag${designQuery ? `&${designQuery}` : ""}`}
          words={{ title: t("treeTag.title"), line: t("treeTag.line"), print: t("treeTag.print"), label: t("treeTag.label") }}
          place="share"
          className="mt-6"
        />
      ) : null}

      <section className="mt-8">
        <p className="font-display text-xl">{t("qrTitle")}</p>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">{t("qrBlurb")}</p>
        <QrDesigner url={url} photos={data.photos} accent={data.accentColor} giftId={giftId} recipientName={data.recipientName} onDesignChange={onDesignChange} />
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

/**
 * After an Etsy buyer sends their gift: a plain ask for a review on Etsy, where reviews decide who
 * gets found. Never only for good ones, never for anything in return: Etsy closes shops for that.
 */
function EtsyReview({ template }: { template: string }) {
  const t = useTranslations("money.etsy");
  const [etsy] = useEtsyMode();
  if (!etsy) return null;
  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-5" data-testid="etsy-review">
      <p className="font-display text-xl">{t("reviewTitle")}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t("reviewBlurb")}</p>
      <a
        href="https://www.etsy.com/your/purchases"
        target="_blank"
        rel="noopener"
        onClick={() => track("etsy_review_click", { template })}
        className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-full border border-ink text-sm font-medium"
      >
        <Star className="size-4" aria-hidden />
        {t("reviewLink")}
      </a>
    </section>
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
