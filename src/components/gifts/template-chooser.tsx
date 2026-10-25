"use client";

import { useMemo, useRef, useState, type PointerEvent } from "react";
import Image from "next/image";
import { Check, Gift, Heart, Loader2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useRouter } from "@/i18n/navigation";
import { featuredFor, POPULAR_SLUGS, sectionTemplates } from "@/config/featured";
import { track } from "@/lib/analytics/track";
import { saveGiftSeed } from "@/lib/editor/gift-seed";
import type { GiftLocale, GiftUnwrap } from "@/lib/gift/schema";
import { PRODUCTS, formatAmount } from "@/lib/pricing/products";
import { useCurrency } from "@/lib/pricing/use-currency";
import { cn } from "@/lib/utils";
import { listManifests } from "@/templates/manifests";
import type { TemplateManifest } from "@/templates/types";

type Filter = "all" | "loved" | "free";
const FILTERS: Filter[] = ["all", "loved", "free"];
const LOVED: readonly string[] = POPULAR_SLUGS;
/** Pulled down this far (or flicked), the sheet closes; less, and it springs back. */
const DISMISS_PX = 110;
const FLICK_PX_PER_MS = 0.6;

/**
 * "Wrap it in a gift": every gift there is, to carry a date or a trip inside it. A sheet from the
 * bottom on a phone (full height, a handle to pull it away by) and a large dialog on a laptop. The
 * gifts come in the gallery's order, best sellers first. Picking one builds the surprise (which may
 * wait a moment for the stops' photographs), leaves it for the editor as a seed, and opens the editor.
 *
 * Every card says what it costs, including what the surprise adds: on the two free templates it is
 * the "Make it special" extra, and a card that only said "Free" would be a promise the pay sheet breaks.
 */
export function TemplateChooser({
  open,
  onOpenChange,
  kind,
  build,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: GiftUnwrap["kind"];
  /** The surprise, made when a gift is picked. */
  build: () => Promise<GiftUnwrap | null>;
}) {
  const t = useTranslations("giftChooser");
  const tc = useTranslations("common");
  const locale = useLocale() as GiftLocale;
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [picking, setPicking] = useState<string | null>(null);
  // On a phone the header took a third of a small screen: once they scroll the gifts, the line under the title folds away.
  const [scrolled, setScrolled] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; at: number; dy: number } | null>(null);

  const templates = useMemo(() => sectionTemplates(listManifests()).flatMap((s) => s.items), []);
  const shown = useMemo(() => templates.filter((m) => filter === "all" || (filter === "free" ? m.tier === "free" : LOVED.includes(m.slug))), [templates, filter]);
  const currency = useCurrency();
  const single = formatAmount(PRODUCTS.single.amounts[currency], currency, locale);
  const extras = formatAmount(PRODUCTS.extras.amounts[currency], currency, locale);

  const pick = async (slug: string) => {
    if (picking) return;
    setPicking(slug);
    let unwrap: GiftUnwrap | null = null;
    try {
      unwrap = await build();
    } catch {
      // The gift still opens; the editor offers to add the plan again.
    }
    saveGiftSeed({ slug, fields: {}, ...(unwrap ? { unwrap } : {}) });
    track("unwrap_picked", { template: slug, kind });
    router.push(`/create/${slug}`);
  };

  // The handle: the sheet follows a finger down and lets go past a point, or on a flick.
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" || window.matchMedia("(min-width: 640px)").matches) return;
    drag.current = { y: e.clientY, at: performance.now(), dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = sheet.current;
    if (!d || !el) return;
    d.dy = Math.max(0, e.clientY - d.y);
    el.style.transition = "none";
    el.style.transform = `translateY(${d.dy}px)`;
  };
  const onUp = () => {
    const d = drag.current;
    const el = sheet.current;
    drag.current = null;
    if (!d || !el) return;
    const fast = d.dy / Math.max(1, performance.now() - d.at) > FLICK_PX_PER_MS;
    el.style.transition = "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)";
    if (d.dy > DISMISS_PX || (fast && d.dy > 24)) {
      el.style.transform = "translateY(100%)";
      window.setTimeout(() => onOpenChange(false), 200);
    } else {
      el.style.transform = "";
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !picking && onOpenChange(v)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-forest/40 backdrop-blur-[3px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          ref={sheet}
          aria-describedby="gift-chooser-sub"
          // Each time it opens the list starts at the top, so the line under the title is back too.
          onOpenAutoFocus={() => setScrolled(false)}
          data-testid="gift-chooser"
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden bg-paper text-forest shadow-[0_-20px_60px_-20px_rgba(42,15,31,0.45)] outline-none",
            // A phone: the whole height, from the bottom.
            "inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] bottom-0 rounded-t-[28px] data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=open]:duration-300",
            // A laptop: a large dialog in the middle.
            "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-[min(88dvh,880px)] sm:w-[min(94vw,1120px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[32px] sm:shadow-[0_40px_120px_-30px_rgba(42,15,31,0.55)] sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95",
          )}
        >
          <header className="relative shrink-0 touch-none border-b border-forest/8 bg-paper px-5 pt-2.5 pb-4 sm:touch-auto sm:px-9 sm:pt-8 sm:pb-5" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            <span aria-hidden="true" className="mx-auto mb-3 block h-1.5 w-11 rounded-full bg-forest/20 sm:hidden" />
            <div className="flex items-start gap-3 pr-12">
              <span aria-hidden="true" className="hidden size-12 shrink-0 place-items-center rounded-2xl bg-rose-mist text-rose-deep sm:grid">
                <Gift className="size-6" />
              </span>
              <div className="min-w-0">
                <DialogPrimitive.Title className="font-display text-[26px] leading-[1.1] text-balance sm:text-[32px]">{kind === "trip" ? t("titleTrip") : t("titleDate")}</DialogPrimitive.Title>
                <div className={cn("grid transition-[grid-template-rows,opacity] duration-300 ease-out sm:grid-rows-[1fr] sm:opacity-100", scrolled ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr]")}>
                  <DialogPrimitive.Description id="gift-chooser-sub" className="min-h-0 overflow-hidden pt-1.5 text-[14.5px] leading-snug text-forest/65 sm:text-[16px]">
                    {kind === "trip" ? t("subTrip") : t("sub")}
                  </DialogPrimitive.Description>
                </div>
              </div>
            </div>
            <DialogPrimitive.Close className="absolute top-3 right-3 grid size-11 place-items-center rounded-full text-forest/70 hover:bg-forest/5 hover:text-forest sm:top-6 sm:right-6" aria-label={tc("close")}>
              <X className="size-5" />
            </DialogPrimitive.Close>
            {/* Toggle buttons, not radios: a radio group promises arrow keys between its options, and Tab is what these take. */}
            <div role="group" aria-label={t("filterLabel")} className="mt-4 flex gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold transition-colors",
                    filter === f ? "bg-forest text-cream" : "bg-white text-forest ring-1 ring-forest/12 hover:bg-rose-mist",
                  )}
                >
                  {filter === f ? <Check aria-hidden="true" className="size-3.5" /> : null}
                  {t(`filter.${f}`)}
                </button>
              ))}
            </div>
          </header>

          <div
            onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 24)}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-9 sm:pt-7"
          >
            <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">
              {shown.map((m, i) => (
                <li key={m.slug}>
                  <ChooserCard manifest={m} locale={locale} eager={i < 4} busy={picking === m.slug} disabled={picking !== null && picking !== m.slug} onPick={() => void pick(m.slug)} price={m.tier === "free" ? t("free") : t("price", { price: single })} note={m.tier === "free" ? t("extra", { price: extras }) : t("included")} pickLabel={t("pick", { name: m.name[locale] })} wrapping={t("wrapping")} badge={featuredFor(m.slug) === "popular" ? t("filter.loved") : null} />
                </li>
              ))}
            </ul>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ChooserCard({
  manifest,
  locale,
  eager,
  busy,
  disabled,
  onPick,
  price,
  note,
  pickLabel,
  wrapping,
  badge,
}: {
  manifest: TemplateManifest;
  locale: GiftLocale;
  eager: boolean;
  busy: boolean;
  disabled: boolean;
  onPick: () => void;
  price: string;
  note: string;
  pickLabel: string;
  wrapping: string;
  badge: string | null;
}) {
  return (
    <button type="button" onClick={onPick} disabled={disabled || busy} aria-label={pickLabel} aria-busy={busy} className="group block w-full text-left disabled:opacity-45" data-testid={`chooser-${manifest.slug}`}>
      <span className="relative block aspect-[390/600] overflow-hidden rounded-[22px] bg-ink/10 shadow-[0_18px_40px_-26px_rgba(23,19,15,0.7)] ring-1 ring-black/5 transition-[transform,box-shadow] duration-300 ease-[var(--ease-out-quint)] group-hover:-translate-y-1 group-hover:shadow-[0_28px_56px_-28px_rgba(23,19,15,0.75)] group-focus-visible:ring-4 group-focus-visible:ring-rose/50">
        <Image src={manifest.thumbnail.poster} alt="" fill sizes="(min-width: 1280px) 200px, (min-width: 1024px) 240px, (min-width: 640px) 30vw, 46vw" quality={70} priority={eager} className="object-cover" />
        <span className={cn("absolute top-2.5 left-2.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide backdrop-blur", manifest.tier === "free" ? "bg-cream/90 text-forest" : "bg-forest/80 text-cream")}>{price}</span>
        {/* A heart, not a word: two labels side by side ran into each other on a phone's narrow card. */}
        {badge ? (
          <span title={badge} className="absolute top-2.5 right-2.5 grid size-7 place-items-center rounded-full bg-blush text-rose-deep shadow-sm">
            <Heart aria-hidden="true" className="size-3.5 fill-current" />
            <span className="sr-only">{badge}</span>
          </span>
        ) : null}
        {/* The present it will carry, tucked into the corner of every card. */}
        <span aria-hidden="true" className="absolute right-2.5 bottom-2.5 grid size-9 place-items-center rounded-full bg-white/90 text-rose-deep shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Gift className="size-4" />}
        </span>
        {busy ? (
          <span className="absolute inset-0 grid place-items-center bg-forest/45 text-[14px] font-semibold text-cream backdrop-blur-[2px]" role="status">
            {wrapping}
          </span>
        ) : null}
      </span>
      <span className="mt-2.5 block px-0.5 font-display text-[18px] leading-tight text-forest sm:text-[19px]">{manifest.name[locale]}</span>
      <span className="mt-0.5 block px-0.5 text-[12.5px] leading-snug text-forest/60">{note}</span>
    </button>
  );
}
