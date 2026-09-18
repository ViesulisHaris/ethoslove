"use client";

import { useRef } from "react";
import { ArrowRight, Play } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { OCCASIONS } from "@/config/occasions";
import { PhoneFrame } from "@/components/shared/phone-frame";
import { BotanicalBackdrop } from "@/components/marketing/botanical-backdrop";
import { HeroBouquet } from "./hero-bouquet";

/**
 * The night garden: a deep green ground framed by our own flowers, the words on the left,
 * a live Bouquet gift in a phone on the right that tilts toward the cursor, and a slow ticker
 * of occasions underneath. It starts under the floating header.
 */
export function Hero() {
  const t = useTranslations("home.hero");
  const tAll = useTranslations();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-1, 1], [6, -6]), { stiffness: 80, damping: 18 });
  const ry = useSpring(useTransform(mx, [-1, 1], [-8, 8]), { stiffness: 80, damping: 18 });
  const ticker = [...OCCASIONS, ...OCCASIONS].map((o) => tAll(`occasions.${o}`));

  return (
    <section
      ref={ref}
      onPointerMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r || e.pointerType !== "mouse") return;
        mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
        my.set(((e.clientY - r.top) / r.height) * 2 - 1);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      className="relative isolate -mt-[var(--header-h)] overflow-hidden bg-forest pt-[var(--header-h)] text-cream"
    >
      <BotanicalBackdrop />
      <div className="relative container-x grid items-center gap-14 pt-12 pb-16 sm:pt-16 lg:grid-cols-12 lg:gap-8 lg:pt-20 lg:pb-24">
        <div className="lg:col-span-7">
          {/*
           * No entrance animation on the words, deliberately. `initial` is serialised into the
           * server HTML as `style="opacity:0"`, so these four shipped invisible and only appeared
           * once React had hydrated — a phone saw an empty green rectangle until then. That is
           * what made LCP 4.4s and what the eleven-to-nineteen-second sessions were looking at.
           * The scene below still animates; the sentence someone came to read does not.
           */}
          <p className="text-[12px] font-medium tracking-[0.22em] text-cream/60 uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="mt-6 max-w-[11ch] display-hero text-balance text-cream">
            {t("h1a")} <em className="text-blush">{t("h1b")}</em> {t("h1c")}
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-cream/75 sm:text-xl">
            {t("sub")}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/templates"
              className="inline-flex h-13 items-center gap-2 rounded-full bg-cream px-7 text-base font-semibold text-forest shadow-[0_14px_40px_-16px_rgba(0,0,0,0.6)] transition-transform hover:-translate-y-0.5"
            >
              {t("cta")}
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/demo/bouquet"
              className="inline-flex h-13 items-center gap-3 rounded-full pr-6 pl-2 text-base font-medium text-cream glass-cream transition-colors hover:bg-white/15"
            >
              <span className="grid size-9 place-items-center rounded-full bg-cream text-forest">
                <Play className="ml-0.5 size-3.5 fill-current" />
              </span>
              {t("demo")}
            </Link>
          </div>
          <p className="mt-4 text-sm text-cream/55">{t("ctaNote")}</p>

          {/*
           * Figures, not buttons. They were frosted-glass tiles — the treatment "Watch the demo"
           * uses just above them — so they looked like four more things to press, and they were
           * where most of the homepage's dead taps landed (Clarity, 18 Sep). A hairline and the
           * numbers are enough to read as facts.
           */}
          <dl className="mt-12 grid max-w-2xl grid-cols-2 gap-x-6 gap-y-6 border-t border-cream/15 pt-7 sm:grid-cols-4">
            {(["free", "noAccount", "once", "langs"] as const).map((k) => (
              <div key={k}>
                <dt className="font-display text-[1.9rem] leading-none tracking-tight text-cream">
                  {t(`facts.${k}.a`)}
                </dt>
                <dd className="mt-2 text-[12px] leading-snug text-cream/60">{t(`facts.${k}.b`)}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative mx-auto w-full max-w-[460px] lg:col-span-5 lg:justify-self-end">
          <motion.div
            initial={{ opacity: 0, rotate: -14, y: 20 }}
            animate={{ opacity: 1, rotate: -8, y: 0 }}
            transition={{ type: "spring", stiffness: 70, damping: 16, delay: 0.45 }}
            aria-hidden="true"
            className="absolute bottom-28 -left-2 z-20 hidden w-[200px] rounded-md bg-[#fbf7ef] p-5 text-ink shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)] sm:block"
          >
            <p className="font-hand text-[2rem] leading-none">{t("card.to")}</p>
            <p className="mt-2 font-hand text-xl text-ink-soft">{t("card.from")}</p>
            <div className="mt-6 h-px w-full bg-line" />
            <div className="mt-2 h-px w-2/3 bg-line" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 70, damping: 16, delay: 0.15 }}
            style={{ rotateX: rx, rotateY: ry, transformPerspective: 1200 }}
            className="relative z-10 mx-auto w-[260px] sm:mr-4 sm:ml-auto sm:w-[290px] lg:w-[300px]"
          >
            <div
              aria-hidden="true"
              className="absolute -inset-10 -z-10 rounded-full bg-blush/25 blur-3xl"
            />
            {/*
             * The bouquet assembling itself, live — the template's own SVG, looping. It used to
             * be a poster that swapped, on hover, to a 1.2MB screencast recorded at 390×600 and
             * 1×, which on any retina screen was an upscaled, soft version of the still.
             */}
            <PhoneFrame width={300} className="!w-full">
              <HeroBouquet cardText={t("card.to")} />
            </PhoneFrame>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, type: "spring", stiffness: 200, damping: 18 }}
              aria-hidden="true"
              className="absolute -right-4 bottom-24 flex items-center gap-2 rounded-full px-3.5 py-2 text-[12px] font-medium text-cream glass-forest"
            >
              <span className="size-1.5 rounded-full bg-sage" />
              {t("card.opened")}
            </motion.div>
          </motion.div>
          <p className="mt-6 text-center text-xs text-cream/50 sm:text-right">{t("caption")}</p>
        </div>
      </div>

      <div className="relative overflow-hidden border-t border-white/10 py-3.5" aria-hidden="true">
        <div className="flex w-max animate-ticker items-center gap-8 pl-8 whitespace-nowrap">
          {ticker.map((label, i) => (
            <span
              key={i}
              className="flex items-center gap-8 font-display text-[1.35rem] text-cream/70 italic"
            >
              {label}
              <span className="size-1.5 rounded-full bg-blush" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
