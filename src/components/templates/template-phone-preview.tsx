"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { Play } from "lucide-react";
import { useTranslations } from "next-intl";
import type { GiftLocale } from "@/lib/gift/schema";
import { PhoneFrame } from "@/components/shared/phone-frame";
import { GiftRenderer } from "@/templates/_shared/GiftRenderer";

export function TemplatePhonePreview({ slug, locale, autoStart = false }: { slug: string; locale: GiftLocale; autoStart?: boolean }) {
  const t = useTranslations("templates");
  const [live, setLive] = useState(autoStart);
  return (
    // 340px, or the page's width inside its 20px gutters on a phone narrower than that: a fixed
    // 340 made the whole page scroll sideways on a 320px screen, and the frame's side button
    // poked out at 360. The frame derives the gift's notch clearance from this width, so it has
    // to be the width it is actually drawn at, not the 340 it was squeezed from.
    <PhoneFrame width="min(340px, 100vw - 2.5rem)" className="mx-auto max-w-full">
      {live ? (
        <GiftRenderer slug={slug} mode="demo" demoLocale={locale} />
      ) : (
        // The poster until they tap, so the phone never sits there black.
        <button type="button" onClick={() => setLive(true)} className="group relative h-full w-full text-paper">
          <img src={`/templates/${slug}/poster.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/10" />
          <span className="relative flex h-full flex-col items-center justify-center gap-3">
            <span className="grid size-14 place-items-center rounded-full bg-cream text-forest shadow-[0_14px_40px_-14px_rgba(0,0,0,0.7)] transition-transform group-hover:scale-105">
              <Play className="ml-0.5 size-5 fill-current" />
            </span>
            <span className="rounded-full bg-black/35 px-3 py-1 text-sm font-medium backdrop-blur">{t("tryDemo")}</span>
          </span>
        </button>
      )}
    </PhoneFrame>
  );
}
