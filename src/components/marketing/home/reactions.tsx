"use client";

import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import type { ProofNumbers, ShownReaction } from "@/lib/proof/numbers";
import { Cutout } from "./cutouts";

/**
 * "See the reaction": real reactions (their writers agreed, the owner approved them: lib/proof),
 * each only its emoji and words. Under the blurb, the count of gifts opened, when the database has
 * one worth saying. Drawn only with real reactions to show: the made-up sample threads it once
 * showed until then are gone (the owner, 23 Nov 2026: "remove the 'sample reactions'"), and a page
 * with none draws nothing of it (/gifts: `ProofLine` carries the count alone).
 */
export function Reactions({ real, numbers = null }: { real: ShownReaction[]; numbers?: ProofNumbers | null }) {
  const t = useTranslations("home.reactions");
  if (real.length === 0) return null;
  return (
    <section className="border-b border-line bg-paper-deep/40 py-20 lg:py-28">
      <div className="container-x">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="relative lg:col-span-7">
            <p className="text-eyebrow text-ink-soft">{t("eyebrow")}</p>
            <h2 className="display-xl mt-4 max-w-[8.4em]">{t("title")}</h2>
            {/* what comes back, more often than not */}
            <Cutout id="kiss-red" className="absolute right-2 bottom-1 w-[84px] rotate-[14deg] opacity-95 drop-shadow-[0_8px_12px_rgba(120,20,40,0.22)] sm:right-16 sm:w-[112px]" />
          </div>
          <div className="max-w-md lg:col-span-5 lg:pb-1">
            <p className="text-lg leading-relaxed text-ink-soft">{t("blurb")}</p>
            {numbers ? <ProofLine numbers={numbers} className="mt-4 text-lg font-semibold leading-snug text-ink" /> : null}
          </div>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3" data-testid="reactions-real">
          {real.map((r, i) => (
            <motion.figure
              key={i}
              initial={{ opacity: 0, y: 20, rotate: i % 2 ? 1 : -1 }}
              whileInView={{ opacity: 1, y: 0, rotate: i % 2 ? 0.6 : -0.6 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ type: "spring", stiffness: 110, damping: 18, delay: i * 0.08 }}
              className="flex flex-col gap-3 rounded-lg border border-line bg-paper p-5 shadow-soft"
            >
              <figcaption className="text-mono-meta text-muted-foreground">{t("realLabel")}</figcaption>
              <p className="max-w-[92%] rounded-xl rounded-bl-sm bg-paper-deep px-3.5 py-2.5 text-sm [overflow-wrap:anywhere]">{r.text}</p>
              <span className="text-2xl" aria-hidden="true">
                {r.emoji}
              </span>
            </motion.figure>
          ))}
        </div>
        <p className="text-mono-meta mt-6 text-muted-foreground">{t("realNote")}</p>
      </div>
    </section>
  );
}

/** The count of gifts opened, as one line: real data from the database, said alone where there are no reactions to show. */
export function ProofLine({ numbers, className }: { numbers: ProofNumbers; className?: string }) {
  const t = useTranslations("home.reactions");
  const locale = useLocale();
  const count = `${new Intl.NumberFormat(locale).format(numbers.opened)}${numbers.more ? "+" : ""}`;
  return (
    <p className={className} data-testid="proof-numbers">
      {numbers.opensEach ? t("openedEach", { count, times: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(numbers.opensEach) }) : t("opened", { count })}
    </p>
  );
}
