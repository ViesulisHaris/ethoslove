"use client";

import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** When a scheduled gift opens, in words: "5 March" and whether it is at midnight, or "5 March at 09:30". */
export type Opening = { midnight: boolean; when: string };

/**
 * When a scheduled gift opens, as the schedule itself has it: in the schedule's own timezone (the
 * one the sender picked, not this phone's), with the year only when it isn't this one. At 00:00 it
 * is "at midnight on 5 March" (the sheet's `opensMidnight`), as the pictures say it.
 */
export function openingOf(unlockAt: string, timeZone: string, locale: "en" | "es", now = new Date()): Opening | null {
  const at = new Date(unlockAt);
  if (Number.isNaN(at.getTime())) return null;
  let zone: string | undefined = timeZone;
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone }).format(at);
  } catch {
    zone = undefined;
  }
  const part = (date: Date, type: Intl.DateTimeFormatPartTypes) =>
    new Intl.DateTimeFormat("en-GB", { timeZone: zone, year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date).find((p) => p.type === type)?.value;
  const midnight = part(at, "hour") === "00" && part(at, "minute") === "00";
  const sameYear = part(at, "year") === part(now, "year");
  const words = new Intl.DateTimeFormat(locale === "es" ? "es" : "en-GB", {
    timeZone: zone,
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
    ...(midnight ? {} : { hour: "numeric", minute: "2-digit" }),
  });
  return { midnight, when: words.format(at) };
}

/**
 * "It's already paid for.": the publish sheet's panel in place of the pay panel when the account has
 * a gift ready (two more gifts, lib/commerce/gift-credits.ts). Its button sends this gift on one of
 * them (publishGift with `useGift`); the quiet link under it shows the pay panel as it is today.
 * Never inside the iPhone app, where the App Store sells.
 */
export function AlreadyPaid({
  ready,
  thumbs,
  photos,
  name,
  opensWhen,
  busy,
  onSend,
  onPayInstead,
}: {
  /** Gifts ready on the account, this one included. */
  ready: number;
  /** The first few of their photos, as the editor shows them. */
  thumbs: string[];
  photos: number;
  name: string;
  /** When a scheduled gift opens (openingOf); null when it goes out at once. */
  opensWhen: Opening | null;
  busy: boolean;
  onSend: () => void;
  onPayInstead: () => void;
}) {
  const t = useTranslations("editor.publishSheet.paid");
  return (
    <section className="mt-7 rounded-xl border border-ink bg-card p-4 sm:p-5" data-testid="already-paid">
      {thumbs.length ? (
        <div className="mb-3 flex items-center" aria-hidden="true">
          {thumbs.slice(0, 4).map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- the sender's own photo, as the editor already shows it
            <img key={src} src={src} alt="" draggable={false} className={cn("size-12 rounded-lg border-2 border-card object-cover shadow-sm", i > 0 && "-ml-2")} />
          ))}
          {photos > 4 ? <span className="-ml-2 grid size-12 place-items-center rounded-lg border-2 border-card bg-blush/40 text-sm font-medium text-ink">+{photos - 4}</span> : null}
        </div>
      ) : null}
      <p className="font-display text-2xl leading-tight text-balance">{t("title")}</p>
      <p className="mt-2 text-base" data-testid="already-paid-count">
        {ready > 1 ? (
          <>
            <span className="font-semibold">{t("oneOfTwo", { count: ready })}</span> <span className="text-ink-soft">{t("oneLeft", { left: ready - 1 })}</span>
          </>
        ) : (
          <span className="font-semibold">{t("last")}</span>
        )}
      </p>
      <ul className="mt-3 grid gap-1.5 text-sm text-ink">
        {[opensWhen ? (opensWhen.midnight ? t("opensMidnight", { date: opensWhen.when }) : t("opens", { when: opensWhen.when })) : t("arrives"), t("forGood")].map((text) => (
          <li key={text} className="flex items-start gap-2">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-moss" />
            <span>{text}</span>
          </li>
        ))}
      </ul>
      <Button type="button" onClick={onSend} disabled={busy} className="mt-5 h-12 w-full rounded-full text-base" data-testid="already-paid-send">
        {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> : null}
        <span>{name ? t("send", { name }) : t("sendNoName")}</span>
      </Button>
      <p className="mt-2 text-center">
        <button
          type="button"
          onClick={onPayInstead}
          disabled={busy}
          className="inline-flex min-h-11 items-center text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
          data-testid="already-paid-pay"
        >
          {t("payInstead")}
        </button>
      </p>
    </section>
  );
}
