"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import type { GiftLocale } from "@/lib/gift/schema";
import { Countdown } from "@/templates/_shared/Countdown";
import { useCountdown } from "@/templates/_shared/hooks/use-countdown";
import { LogoMark } from "@/components/shared/logo";

const S = {
  en: { eyebrow: "Not yet", title: "{sender} made you something.", blurb: "It opens on {when}. Come back then — or leave this page open.", label: "Opens in" },
  es: { eyebrow: "Todavía no", title: "{sender} te ha hecho algo.", blurb: "Se abre el {when}. Vuelve entonces, o deja esta página abierta.", label: "Se abre en" },
};

export function ScheduledScreen({ senderName, unlockAt, timezone, locale }: { senderName: string; unlockAt: string; timezone: string | null; locale: GiftLocale }) {
  const t = S[locale] ?? S.en;
  const router = useRouter();
  const parts = useCountdown(unlockAt);
  const when = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short", timeZone: timezone ?? undefined }).format(new Date(unlockAt));

  useEffect(() => {
    if (parts.done) {
      const id = setTimeout(() => router.refresh(), 1500);
      return () => clearTimeout(id);
    }
  }, [parts.done, router]);

  return (
    <div translate="no" className="flex min-h-dvh flex-col items-center justify-center bg-night px-8 text-center text-paper" style={{ "--gift-font-display": "var(--font-display)" } as React.CSSProperties}>
      <div className="grain-overlay" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_100%,rgba(212,168,83,0.18),transparent)]" />
      <LogoMark className="size-12" />
      <p className="mt-8 text-[11px] tracking-[0.3em] text-paper/50 uppercase">{t.eyebrow}</p>
      <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 110, damping: 18 }} className="mt-3 max-w-sm text-[1.9rem] leading-tight italic" style={{ fontFamily: "var(--font-display)" }}>
        {t.title.replace("{sender}", senderName)}
      </motion.h1>
      <p className="mt-3 max-w-xs text-sm text-paper/60">{t.blurb.replace("{when}", when)}</p>
      <div className="mt-10">
        <Countdown countdown={{ targetAt: unlockAt, timezone: timezone ?? "UTC", label: t.label }} locale={locale} tone="dark" />
      </div>
    </div>
  );
}
