"use client";

import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  /** When a scheduled gift opens, already in words; null when it goes out at once. */
  opensWhen: string | null;
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
            <span className="font-semibold">{t("oneOfTwo")}</span> <span className="text-ink-soft">{t("oneLeft")}</span>
          </>
        ) : (
          <span className="font-semibold">{t("last")}</span>
        )}
      </p>
      <ul className="mt-3 grid gap-1.5 text-sm text-ink">
        {[opensWhen ? t("opens", { when: opensWhen }) : t("arrives"), t("forGood")].map((text) => (
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
