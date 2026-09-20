"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Cutout } from "./cutouts";

/**
 * "See the reaction". Sample threads set like notes pinned to a board; each becomes a
 * <video> once real recipient reactions exist.
 */
export function Reactions() {
  const t = useTranslations("home.reactions");
  const cards = t.raw("cards") as { from: string; to: string; sent: string; reply: string; emoji: string; time: string }[];
  return (
    <section className="border-b border-line bg-paper-deep/40 py-20 lg:py-28">
      <div className="container-x">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="relative lg:col-span-7">
            <p className="text-eyebrow text-ink-soft">{t("eyebrow")}</p>
            <h2 className="display-xl mt-4 max-w-[14ch]">{t("title")}</h2>
            {/* what comes back, more often than not */}
            <Cutout id="kiss-red" className="absolute right-2 bottom-1 w-[84px] rotate-[14deg] opacity-95 drop-shadow-[0_8px_12px_rgba(120,20,40,0.22)] sm:right-16 sm:w-[112px]" />
          </div>
          <p className="max-w-md text-lg leading-relaxed text-ink-soft lg:col-span-5 lg:pb-1">{t("blurb")}</p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {cards.map((c, i) => (
            <motion.figure
              key={i}
              initial={{ opacity: 0, y: 20, rotate: i % 2 ? 1 : -1 }}
              whileInView={{ opacity: 1, y: 0, rotate: i % 2 ? 0.6 : -0.6 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ type: "spring", stiffness: 110, damping: 18, delay: i * 0.08 }}
              className="rounded-lg border border-line bg-paper p-5 shadow-soft"
            >
              <figcaption className="text-mono-meta flex items-center justify-between text-muted-foreground">
                <span>
                  {c.from} → {c.to}
                </span>
                <span>{c.time}</span>
              </figcaption>
              <div className="mt-4 flex flex-col gap-2.5">
                <p className="max-w-[88%] self-end rounded-xl rounded-br-sm bg-ink px-3.5 py-2.5 text-sm text-paper">{c.sent}</p>
                <motion.p
                  initial={{ opacity: 0, scale: 0.94 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.45 + i * 0.1, type: "spring", stiffness: 200, damping: 16 }}
                  className="max-w-[88%] rounded-xl rounded-bl-sm bg-paper-deep px-3.5 py-2.5 text-sm"
                >
                  {c.reply}
                </motion.p>
                <motion.span
                  initial={{ opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  className="text-2xl"
                  aria-hidden="true"
                >
                  {c.emoji}
                </motion.span>
              </div>
            </motion.figure>
          ))}
        </div>
        <p className="text-mono-meta mt-6 text-muted-foreground">{t("placeholderNote")}</p>
      </div>
    </section>
  );
}
