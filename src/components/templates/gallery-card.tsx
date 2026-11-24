"use client";

import { ArrowRight, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "motion/react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { GiftLocale } from "@/lib/gift/schema";
import type { TemplateManifest } from "@/templates/types";
import type { Featured } from "@/config/featured";
import { galleryLine } from "@/content/gallery-lines";
import { track } from "@/lib/analytics/track";
import { sendsFree } from "@/lib/gift/free-tier";
import { PRODUCTS, formatAmount, templateProduct } from "@/lib/pricing/products";
import { useCurrency } from "@/lib/pricing/use-currency";
import { cn } from "@/lib/utils";
import { posterFit } from "./poster-fit";
import { useHoverFilm } from "./use-hover-film";

const wantsFilm = () => window.matchMedia("(hover: hover)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Which part of a gift's poster the card shows. A poster is a phone's screen (390 by 600) and the
 * card's picture is 4 by 5, so a fifth of its height is left out. It is the foot that goes, under
 * the fade into the card: a gift's title is written near the top of its screen, and the first crop
 * (30% down) cut that lettering in half on some cards and laid the two pills over it on others.
 * From the top, the title stands whole just under the pills. Two best sellers are the exception,
 * each with small lettering at the very top that the pills would sit on: they are shown from lower
 * down, so the pills lie on plain paper. Whole class names, so Tailwind finds them.
 */
const CROP: Record<string, string> = {
  bouquet: "object-[50%_60%]",
  "the-council": "object-[50%_66%]",
};

/**
 * A gift in the gallery, as the owner drew it (22 Nov 2026, shots/mockups/OWNER-MOCKUP-gallery.webp):
 * its picture, its name, one line, and an arrow, all of it one link to the gift's own page, where
 * the film, the live demo and the full description are. A pointer resting on the card plays the
 * gift's preview film, as the older card did.
 *
 * Under that, on a hairline, what the mock-up left out and the older card had: the price, and
 * "Make this gift" straight to the editor. The gallery is the most visited page and the editor was
 * one tap from every card on it; without this row nothing on the page reached the editor or said
 * what a gift costs (the review of 22 Nov 2026). Quiet on purpose: small type, no button.
 *
 * `index` is the card's place in the whole list: the first row is painted at once, never faded in.
 */
export function GalleryCard({ manifest, index = 0, badge }: { manifest: TemplateManifest; index?: number; badge?: Featured }) {
  const locale = useLocale() as GiftLocale;
  const t = useTranslations();
  const currency = useCurrency();
  // As the older card prices it: a premium template is bought as one, and a free template with no
  // free version left (lib/gift/free-tier.ts) costs its "make it special".
  const free = sendsFree(manifest);
  const price = formatAmount(PRODUCTS[templateProduct(manifest.tier)].amounts[currency], currency, locale);
  const above = index < 4;
  const crop = cn(CROP[manifest.slug] ?? "object-top", posterFit(manifest.thumbnail.poster));

  // A phone fires mouseenter on a tap too; the film is for a pointer resting on a card. And for
  // nobody who asked for less motion: the film is hidden then, and must not be fetched and played unseen.
  // It starts past the recording's opening (use-hover-film.ts).
  const { ref: videoRef, play, pause, loop } = useHoverFilm(manifest.slug, wantsFilm, manifest.thumbnail.webm);

  return (
    <motion.article
      initial={above ? false : { opacity: 0, y: 16 }}
      whileInView={above ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ type: "spring", stiffness: 120, damping: 20, delay: (index % 4) * 0.05 }}
      data-gallery-card={manifest.slug}
      onMouseEnter={play}
      onMouseLeave={pause}
      className="group relative flex h-full flex-col rounded-[28px] bg-card shadow-[0_26px_48px_-34px_rgba(74,32,24,0.55)] ring-1 ring-ink/[0.07] transition-[translate,box-shadow] duration-500 ease-[var(--ease-out-quint)] hover:-translate-y-1 hover:shadow-[0_34px_60px_-34px_rgba(74,32,24,0.65)] has-[a:active]:translate-y-0 has-[a:active]:shadow-[0_18px_34px_-30px_rgba(74,32,24,0.6)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <Link href={`/templates/${manifest.slug}`} onClick={() => track("gallery_pick", { template: manifest.slug, action: "page" })} data-card-page className="flex flex-1 flex-col rounded-t-[28px] rounded-b-lg">
        <div className="relative aspect-[4/5] overflow-hidden rounded-t-[28px] bg-ink/10">
          <Image
            src={manifest.thumbnail.poster}
            // The tagline says what the poster shows, for a search engine (Bing flags an empty alt on
            // every card). A screen reader is spared it: the link already says the name and the line
            // under the picture, and the same sentence twice was what it heard.
            alt={manifest.tagline[locale]}
            aria-hidden="true"
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            quality={75}
            priority={above}
            decoding={above ? "sync" : "async"}
            className={cn("object-cover", crop)}
          />
          {manifest.thumbnail.webm ? (
            <video
              ref={videoRef}
              muted
              loop={loop}
              playsInline
              preload="none"
              aria-hidden="true"
              data-card-film
              className={cn("absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 data-on:opacity-100 motion-reduce:hidden", crop)}
            />
          ) : null}
          {/* The picture's foot runs into the card it stands on. */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-linear-to-t from-card to-card/0" />
          {/* The owner, 23 Nov 2026: "i dont think we should write this on the templates, as it makes it look like not an impulse buy anymore and seems expensive". A gift that costs something says nothing here; the one that is free says so. */}
          {free ? (
            <span data-card-free className="pointer-events-none absolute top-3.5 left-3.5 rounded-full bg-cream/90 px-3 py-1 text-[11px] font-semibold tracking-wide text-forest backdrop-blur">{t("common.free")}</span>
          ) : null}
          {badge ? (
            <span className={cn("pointer-events-none absolute top-3.5 right-3.5 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide shadow-[0_6px_16px_-8px_rgba(0,0,0,0.5)]", badge === "popular" ? "bg-rose-soft text-forest" : "bg-cream text-forest")}>
              {badge === "popular" ? (
                <svg viewBox="0 0 24 24" className="size-3" aria-hidden="true">
                  <path d="M12 21s-7.6-4.7-9.7-9.3C.9 8.4 2.7 4.6 6.4 4.6c2 0 3.6 1.1 5.6 3.3 2-2.2 3.6-3.3 5.6-3.3 3.7 0 5.5 3.8 4.1 7.1C19.6 16.3 12 21 12 21Z" fill="currentColor" />
                </svg>
              ) : null}
              {t(`templates.badge.${badge}`)}
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 items-center justify-between gap-4 px-5 pt-2 pb-3.5">
          <div className="min-w-0">
            <h3 className="font-display text-[1.3rem] leading-tight text-ink">{manifest.name[locale]}</h3>
            {/* Never cut: a line is written to fit (content/gallery-lines.ts). Two lines' room on every card, so a row of cards stays level whether a line wraps or not. */}
            <p data-card-line className="mt-1 min-h-[2.6em] text-[0.8125rem] leading-[1.3] text-ink-soft">
              {galleryLine(manifest.slug, manifest.tagline, locale)}
            </p>
          </div>
          <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-paper text-ink ring-1 ring-ink/10 transition-colors duration-300 group-hover:bg-forest group-hover:text-cream">
            <ChevronRight className="size-4.5" strokeWidth={1.8} />
          </span>
        </div>
      </Link>
      <div className="mx-5 flex items-center justify-between gap-3 border-t border-line">
        <span data-price className="text-mono-meta text-ink-soft">
          {free ? t("templates.priceFree") : t("templates.priceOnce", { price })}
        </span>
        {/* 44px tall for a thumb; the name rides along for a screen reader, which hears sixty-one of these. */}
        <Link
          href={`/create/${manifest.slug}`}
          onClick={() => track("gallery_pick", { template: manifest.slug, action: "make" })}
          aria-label={`${t("templates.makeThis")}: ${manifest.name[locale]}`}
          data-card-make
          className="group/make -mr-1 inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-[0.8125rem] font-semibold text-ink underline decoration-ink/20 underline-offset-4 transition-colors hover:decoration-ink active:text-rose-deep"
        >
          {t("templates.makeThis")}
          <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover/make:translate-x-0.5 motion-reduce:transition-none" />
        </Link>
      </div>
    </motion.article>
  );
}
