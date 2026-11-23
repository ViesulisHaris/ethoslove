"use client";

import { useEffect, useState } from "react";
import type { GiftData, GiftLocale } from "@/lib/gift/schema";
import { loadTemplate } from "@/templates/registry";
import { GiftExperience } from "@/components/gift/gift-experience";

/** The same made-up id the keep page's preview uses: nothing answers to it. */
const SHORT_ID = "prev2ew3k";

/** Everything the end screen can carry at once, so its tallest state can be looked at. */
function everything(locale: GiftLocale): Partial<GiftData> {
  const es = locale === "es";
  return {
    voiceNote: { url: "/audio/library/first-light.mp3", duration: 12 },
    music: { source: "catalog", url: "/audio/library/golden-hour.mp3", title: "Clair de Lune", artist: "Claude Debussy", startAt: 0 },
    dedication: { url: "https://open.spotify.com/track/1bhUWB0zJMIKr9yVPrkEuI", title: "Clair de Lune", artist: "Claude Debussy" },
    unwrap: {
      kind: "date",
      title: es ? "Un pícnic en el parque" : "A picnic in the park",
      when: es ? "Este sábado" : "This Saturday",
      stops: [
        { name: es ? "El cerezo de la colina" : "The cherry tree on the hill", time: "13:30", kind: "picnic" },
        { name: es ? "Un helado de camino a casa" : "Ice cream on the way home", time: "18:00", kind: "dessert" },
      ],
    },
  };
}

export function GiftPreviewStage({ slug, locale, paid, full }: { slug: string; locale: GiftLocale; paid: boolean; full: boolean }) {
  const [data, setData] = useState<GiftData | null>(null);
  useEffect(() => {
    let live = true;
    void loadTemplate(slug).then((mod) => {
      if (!live || !mod) return;
      const demo = mod.demoData[locale] ?? mod.demoData.en;
      setData({ ...demo, templateSlug: slug, locale, showReactionCta: true, watermark: !paid, ...(full ? everything(locale) : {}) });
    });
    return () => {
      live = false;
    };
  }, [slug, locale, paid, full]);
  if (!data) return <div className="h-dvh w-full bg-night" />;
  return <GiftExperience shortId={SHORT_ID} data={data} locale={locale} />;
}
