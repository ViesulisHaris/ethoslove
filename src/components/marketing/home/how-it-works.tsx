"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";

/** Three numbered rows with hairlines, not three cards. The little illustrations are custom. */
export function HowItWorks() {
  const t = useTranslations("home.how");
  const steps = t.raw("steps") as { title: string; body: string }[];
  const art = [<PickIllustration key="a" />, <WriteIllustration key="b" />, <ShareIllustration key="c" />];
  return (
    <section id="how" className="border-b border-line py-20 lg:py-28">
      <div className="container-x">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="text-eyebrow text-ink-soft">{t("eyebrow")}</p>
            <h2 className="display-xl mt-4">{t("title")}</h2>
          </div>
        </div>
        <ol className="mt-12 border-t border-line">
          {steps.map((s, i) => (
            <li key={i} className="grid gap-6 border-b border-line py-8 md:grid-cols-[5rem_1fr_15rem] md:items-center md:gap-10 lg:py-10">
              <span className="font-display text-[3rem] leading-none text-coral italic md:text-[3.5rem]">0{i + 1}</span>
              <div className="max-w-xl">
                <h3 className="font-display text-[1.75rem] leading-tight">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft sm:text-base">{s.body}</p>
              </div>
              <div className="h-32 md:h-36">{art[i]}</div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const spring = { type: "spring", stiffness: 140, damping: 16 } as const;

function PickIllustration() {
  return (
    <div className="flex h-full items-end gap-3">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          initial={{ y: 30, opacity: 0, rotate: -4 }}
          whileInView={{ y: i === 1 ? -14 : 0, opacity: 1, rotate: i === 1 ? 0 : i === 0 ? -6 : 6 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ ...spring, delay: i * 0.12 }}
          className="h-32 w-20 rounded-md border border-line shadow-soft"
          style={{ background: ["linear-gradient(160deg,#6b4732,#2f1a0f)", "radial-gradient(120% 85% at 50% 112%,#1f1d45,#04040c)", "linear-gradient(160deg,#c63d22,#7e2412)"][i] }}
        />
      ))}
    </div>
  );
}

function WriteIllustration() {
  const lines = [88, 96, 70, 82];
  return (
    <div className="flex h-full flex-col justify-center gap-3 rounded-md border border-line bg-paper p-4 shadow-soft">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div key={i} initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ ...spring, delay: 0.1 + i * 0.1 }} className="size-9 rounded-sm bg-rose-tint" />
        ))}
      </div>
      {lines.map((w, i) => (
        <motion.div key={i} initial={{ width: 0 }} whileInView={{ width: `${w}%` }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.45 + i * 0.12, ease: [0.22, 1, 0.36, 1] }} className="h-2 rounded-sm bg-ink/20" />
      ))}
    </div>
  );
}

function ShareIllustration() {
  const cells = Array.from({ length: 49 }, (_, i) => i);
  return (
    <div className="flex h-full items-center justify-center md:justify-end">
      <div className="grid grid-cols-7 gap-[3px] rounded-md border border-line bg-paper p-3 shadow-soft">
        {cells.map((i) => {
          const on = (i * 7919) % 5 !== 0;
          return (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.4 }}
              whileInView={{ opacity: on ? 1 : 0.12, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 + (i % 7) * 0.04 + Math.floor(i / 7) * 0.04, ...spring }}
              className="size-3 rounded-[2px] bg-ink"
            />
          );
        })}
      </div>
    </div>
  );
}
