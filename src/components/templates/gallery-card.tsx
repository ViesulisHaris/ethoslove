"use client";

import { useRef } from "react";
import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "motion/react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { GiftLocale } from "@/lib/gift/schema";
import type { TemplateManifest } from "@/templates/types";
import type { Featured } from "@/config/featured";
import { sendsFree } from "@/lib/gift/free-tier";
import { cn } from "@/lib/utils";

/**
 * A gift in the gallery, as the owner drew it (22 Nov 2026, shots/mockups/OWNER-MOCKUP-gallery.webp):
 * its picture, its name, one line, and an arrow. The whole card is one link to the gift's own page,
 * which is where the film, the live demo, the price and "Make this gift" now are. A pointer resting
 * on the card plays the gift's preview film, as the older card did.
 *
 * `index` is the card's place in the whole list: the first row is painted at once, never faded in.
 */
export function GalleryCard({ manifest, index = 0, badge }: { manifest: TemplateManifest; index?: number; badge?: Featured }) {
  const locale = useLocale() as GiftLocale;
  const t = useTranslations();
  const videoRef = useRef<HTMLVideoElement>(null);
  const free = sendsFree(manifest);
  const above = index < 4;

  const play = () => {
    const v = videoRef.current;
    // A phone fires mouseenter on a tap too; the film is for a pointer resting on a card.
    if (!v || !window.matchMedia("(hover: hover)").matches) return;
    v.currentTime = 0;
    v.play().catch(() => {});
  };
  const pause = () => videoRef.current?.pause();

  return (
    <motion.article
      initial={above ? false : { opacity: 0, y: 16 }}
      whileInView={above ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ type: "spring", stiffness: 120, damping: 20, delay: (index % 4) * 0.05 }}
      data-gallery-card={manifest.slug}
      className="h-full"
    >
      <Link
        href={`/templates/${manifest.slug}`}
        onMouseEnter={play}
        onMouseLeave={pause}
        className="group relative flex h-full flex-col overflow-hidden rounded-[28px] bg-card shadow-[0_26px_48px_-34px_rgba(74,32,24,0.55)] ring-1 ring-ink/[0.07] transition-[translate,box-shadow] duration-500 ease-[var(--ease-out-quint)] hover:-translate-y-1 hover:shadow-[0_34px_60px_-34px_rgba(74,32,24,0.65)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-ink/10">
          <Image
            src={manifest.thumbnail.poster}
            alt={manifest.tagline[locale]}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            quality={75}
            priority={above}
            decoding={above ? "sync" : "async"}
            className="object-cover object-[50%_30%]"
          />
          {manifest.thumbnail.webm ? (
            <video
              ref={videoRef}
              src={manifest.thumbnail.webm}
              muted
              loop
              playsInline
              preload="none"
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover object-[50%_30%] opacity-0 transition-opacity duration-500 group-hover:opacity-100 motion-reduce:hidden"
            />
          ) : null}
          {/* The picture's foot runs into the card it stands on. */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-linear-to-t from-card to-card/0" />
          <span className={cn("pointer-events-none absolute top-3.5 left-3.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide backdrop-blur", free ? "bg-cream/90 text-forest" : "bg-forest/75 text-cream")}>
            {free ? t("common.free") : t("common.premium")}
          </span>
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
        <div className="flex flex-1 items-center justify-between gap-4 px-5 pt-2 pb-5">
          <div className="min-w-0">
            <h3 className="font-display text-[1.3rem] leading-tight text-ink">{manifest.name[locale]}</h3>
            <p className="mt-1 truncate text-[0.8125rem] text-ink-soft">{manifest.tagline[locale]}</p>
          </div>
          <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-paper text-ink ring-1 ring-ink/10 transition-colors duration-300 group-hover:bg-forest group-hover:text-cream">
            <ChevronRight className="size-4.5" strokeWidth={1.8} />
          </span>
        </div>
      </Link>
    </motion.article>
  );
}
