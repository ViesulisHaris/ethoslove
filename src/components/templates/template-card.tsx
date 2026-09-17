"use client";
/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Play } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { Link } from "@/i18n/navigation";
import type { GiftLocale } from "@/lib/gift/schema";
import type { TemplateManifest } from "@/templates/types";

/**
 * Loaded on demand, not with the page. Importing it statically reaches the template registry and
 * every template behind it, which puts ~900KB of three.js into the gallery bundle for the two
 * templates that use WebGL — on a page that mounts a template only after someone taps "try it".
 */
const GiftRenderer = dynamic(
  () => import("@/templates/_shared/GiftRenderer").then((m) => m.GiftRenderer),
  { ssr: false },
);
import { PRODUCTS, currencyFor, formatAmount } from "@/lib/pricing/products";
import { cn } from "@/lib/utils";

/**
 * Gallery card. Poster at rest, the captured preview video plays on hover,
 * and "Try the live demo" mounts the real template inside the card.
 */
export function TemplateCard({ manifest, index = 0 }: { manifest: TemplateManifest; index?: number }) {
  const locale = useLocale() as GiftLocale;
  const t = useTranslations();
  const [live, setLive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const currency = currencyFor(locale === "es" ? "ES" : "US");
  const price = formatAmount(PRODUCTS.single.amounts[currency], currency, locale);
  /** The first row on a phone and on a laptop: painted immediately, never faded in, never lazy. */
  const above = index < 4;

  const play = () => {
    const v = videoRef.current;
    if (!v || live) return;
    v.currentTime = 0;
    v.play().catch(() => {});
  };
  const pause = () => videoRef.current?.pause();

  return (
    <motion.article
      // The first row ships visible. `initial` is serialised into the server HTML, so every card
      // arrived as `opacity:0` and waited for hydration and an intersection observer before it
      // appeared — on /templates, the most visited page, that is a blank grid on arrival.
      initial={above ? false : { opacity: 0, y: 16 }}
      whileInView={above ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ type: "spring", stiffness: 120, damping: 20, delay: (index % 3) * 0.06 }}
      className="group flex flex-col"
    >
      <div
        className="relative aspect-[390/600] overflow-hidden rounded-[26px] bg-night shadow-[0_24px_50px_-30px_rgba(23,19,15,0.6)] ring-1 ring-black/5 transition-[transform,box-shadow] duration-500 ease-[var(--ease-out-quint)] group-hover:-translate-y-1.5 group-hover:shadow-[0_34px_70px_-30px_rgba(23,19,15,0.7)]"
        onMouseEnter={play}
        onMouseLeave={pause}
      >
        {live ? (
          <div className="absolute inset-0">
            <GiftRenderer slug={manifest.slug} mode="demo" demoLocale={locale} />
          </div>
        ) : (
          <>
            <img
              src={manifest.thumbnail.poster}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading={above ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : undefined}
              decoding="async"
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
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
            ) : null}
            <button
              type="button"
              onClick={() => {
                pause();
                setLive(true);
              }}
              className="absolute inset-0 flex items-end justify-center pb-5"
              aria-label={`${t("templates.tryDemo")}: ${manifest.name[locale]}`}
            >
              <span className="flex items-center gap-2 rounded-full bg-cream/90 px-3.5 py-2 text-[13px] font-semibold text-forest shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)] backdrop-blur transition-colors group-hover:bg-cream">
                <Play className="size-3 fill-current" />
                {t("templates.tryDemo")}
              </span>
            </button>
          </>
        )}
        <span
          className={cn(
            "pointer-events-none absolute top-3 left-3 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide backdrop-blur",
            manifest.tier === "free" ? "bg-cream/90 text-forest" : "bg-forest/80 text-cream",
          )}
        >
          {manifest.tier === "free" ? t("common.free") : t("common.premium")}
        </span>
      </div>
      <div className="mt-4 px-0.5">
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex min-w-0 items-baseline gap-3">
            <span className="text-mono-meta shrink-0 text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
            <h3 className="font-display text-[1.35rem] leading-tight text-balance">{manifest.name[locale]}</h3>
          </div>
          <span className="text-mono-meta shrink-0 text-ink-soft">{manifest.tier === "free" ? t("templates.priceFree") : t("templates.priceOnce", { price })}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{manifest.tagline[locale]}</p>
        <div className="mt-3 flex items-center gap-4">
          <Link href={`/create/${manifest.slug}`} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-forest px-4 text-sm font-medium text-cream transition-colors hover:bg-forest-raised sm:flex-none">
            {t("templates.makeThis")}
            <ArrowRight className="size-3.5" />
          </Link>
          <Link href={`/templates/${manifest.slug}`} className="-my-1.5 inline-flex shrink-0 items-center gap-1 py-1.5 text-sm font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline">
            {t("templates.details")}
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
