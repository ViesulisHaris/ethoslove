"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const FREE = ["dates", "plans", "ldr", "deck"] as const;
const TWO = ["weekly", "shared", "templates", "games", "memories"] as const;

/**
 * What the couples' side costs: nothing, and then "Ethos for Two". The subscription is not for
 * sale yet; this takes an email for the day it is, and says so. The gifts' own one-time prices
 * are below, as they were.
 */
export function ForTwo() {
  const t = useTranslations("forTwo");
  const locale = useLocale() === "es" ? "es" : "en";
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "failed">("idle");

  const join = async () => {
    setState("sending");
    try {
      const res = await fetch("/api/waitlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, locale }) });
      setState(res.ok ? "done" : "failed");
    } catch {
      setState("failed");
    }
  };

  return (
    <section className="container-x pb-4">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[28px] bg-white p-6 shadow-soft ring-1 ring-forest/5 sm:p-8">
          <p className="text-eyebrow text-[#2E6B4E]">{t("free.eyebrow")}</p>
          <h2 className="mt-3 font-display text-[34px] leading-none text-forest">{t("free.price")}</h2>
          <p className="mt-2 text-[15px] text-forest/70">{t("free.blurb")}</p>
          <ul className="mt-6 space-y-2.5">
            {FREE.map((k) => (
              <li key={k} className="flex items-start gap-2.5 text-[15px] text-forest/85">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#2E6B4E]" />
                {t(`free.${k}`)}
              </li>
            ))}
          </ul>
          <Link href="/dates" className="mt-7 inline-flex h-12 items-center rounded-full border border-forest/15 px-6 text-[15px] font-semibold text-forest hover:bg-forest/5">
            {t("free.cta")}
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-[28px] bg-forest p-6 text-cream shadow-lift sm:p-8">
          <span className="absolute -top-16 -right-16 size-56 rounded-full bg-[#D6336C]/30 blur-3xl" aria-hidden="true" />
          <p className="relative text-eyebrow text-blush">{t("two.eyebrow")}</p>
          <h2 className="relative mt-3 font-display text-[34px] leading-none">
            {t("two.price")} <span className="text-[17px] text-cream/70">{t("two.per")}</span>
          </h2>
          <p className="relative mt-2 text-[15px] text-cream/75">{t("two.blurb")}</p>
          <ul className="relative mt-6 space-y-2.5">
            {TWO.map((k) => (
              <li key={k} className="flex items-start gap-2.5 text-[15px] text-cream/90">
                <Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-blush" />
                {t(`two.${k}`)}
              </li>
            ))}
          </ul>
          {state === "done" ? (
            <p role="status" className="relative mt-7 rounded-2xl bg-white/10 p-4 text-[15px] font-medium text-cream">
              {t("two.thanks")}
            </p>
          ) : (
            <form
              className="relative mt-7 flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                void join();
              }}
            >
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("two.placeholder")} aria-label={t("two.placeholder")} className="h-12 min-w-0 flex-1 rounded-full bg-white/10 px-5 text-[15px] text-cream ring-1 ring-white/15 outline-none placeholder:text-cream/50 focus:ring-blush" />
              <button type="submit" disabled={state === "sending"} className={cn("btn-rose inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold", state === "sending" && "opacity-80")}>
                {state === "sending" ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
                {t("two.cta")}
              </button>
            </form>
          )}
          {state === "failed" ? <p className="relative mt-2 text-[13px] text-blush">{t("two.failed")}</p> : null}
          <p className="relative mt-3 text-[12.5px] text-cream/55">{t("two.note")}</p>
        </div>
      </div>
      <p className="mt-10 text-eyebrow text-ink-soft">{t("giftsEyebrow")}</p>
    </section>
  );
}
