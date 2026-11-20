"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Under the pay panel of a Letter held to the short note (lib/gift/free-tier.ts): the free way out,
 * said plainly. A letter over the free length is never cut for them, so it sends them back to
 * shorten it; photos and the other paid parts come out only after a second, explicit yes.
 *
 * In the send screen's "keep" version (lib/editor/keep-split.ts) that second step shows the photos
 * about to leave and offers to keep them: in the note for less ("a note with photos") where the gift
 * holds nothing else that is paid, at the full price otherwise. "Send without them" is the same yes
 * as before.
 */
export function FreeNoteOption({
  photos,
  chars,
  max,
  others,
  busy = false,
  onShorten,
  onSendFree,
  onAsk,
  keep = null,
}: {
  /** How many photos the gift holds now. */
  photos: number;
  /** The letter's length, counted the way the editor counts it. */
  chars: number;
  max: number;
  /** Paid parts besides photos and length (a video, a voice message, a schedule). */
  others: boolean;
  busy?: boolean;
  onShorten: () => void;
  /** Takes the paid parts out of the gift; the sheet then shows the free way to send it. */
  onSendFree: () => void | Promise<void>;
  /** The step that takes the photos out was shown. */
  onAsk?: () => void;
  /**
   * The "keep" version's offer at that step. `price` is what a note with photos costs, or null where
   * this gift can't be sent as one; `fullPrice` is "Make it special".
   */
  keep?: { thumbs: string[]; price: string | null; fullPrice: string; paying: boolean; onKeep: () => void; onKeepFull: () => void } | null;
}) {
  const t = useTranslations("editor.publishSheet");
  const [asking, setAsking] = useState(false);
  const tooLong = chars > max;
  const offer = keep && photos > 0 ? keep : null;

  return (
    <section className="mt-4 rounded-xl border border-line bg-card p-4 sm:p-5" data-testid="free-note-option">
      <p className="font-display text-lg leading-snug">{t("noteTitle")}</p>
      <p className="mt-1 text-sm text-ink-soft">{t("noteBody", { max })}</p>
      {tooLong ? (
        <>
          <p className="mt-3 text-sm text-ink" data-testid="free-note-too-long">
            {t("noteTooLong", { n: chars, max })}
          </p>
          <Button type="button" variant="outline" className="mt-3 h-11 w-full rounded-full" onClick={onShorten} data-testid="free-note-shorten">
            {t("noteShorten")}
          </Button>
        </>
      ) : asking && offer ? (
        <div className="mt-4 border-t border-line pt-4" role="group" aria-label={t("noteTitle")} data-testid="keep-step">
          <p className="font-display text-xl leading-snug text-balance" data-testid="keep-title">
            {offer.price ? t("keepTitle", { count: photos, price: offer.price }) : t("outTitle", { count: photos })}
          </p>
          <div className="mt-3 flex items-center gap-1.5" aria-hidden="true" data-testid="keep-photos">
            {offer.thumbs.slice(0, 5).map((src) => (
              // eslint-disable-next-line @next/next/no-img-element -- the sender's own photo, as the editor already shows it
              <img key={src} src={src} alt="" draggable={false} className={cn("size-14 rounded-lg object-cover shadow-sm", !offer.price && "opacity-60 grayscale")} />
            ))}
            {photos > 5 ? <span className="grid size-14 place-items-center rounded-lg bg-blush/40 text-sm font-medium text-ink">+{photos - 5}</span> : null}
          </div>
          {offer.price ? <p className="mt-3 text-sm text-ink-soft">{t("keepBody", { max })}</p> : null}
          <Button
            type="button"
            className="mt-4 h-12 w-full rounded-full text-base"
            disabled={busy || offer.paying}
            onClick={offer.price ? offer.onKeep : offer.onKeepFull}
            data-testid="keep-pay"
          >
            {offer.paying ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
            <span>{t("keepPay", { price: offer.price ?? offer.fullPrice })}</span>
          </Button>
          <Button type="button" variant="ghost" className="mt-2 h-11 w-full rounded-full" disabled={busy || offer.paying} onClick={() => void onSendFree()} data-testid="free-note-yes">
            {t("keepSendWithout")}
          </Button>
          {offer.price ? <p className="mt-2 text-center text-xs text-balance text-muted-foreground">{t("keepFull", { price: offer.fullPrice })}</p> : null}
        </div>
      ) : asking ? (
        <div className="mt-3" role="group" aria-label={t("noteTitle")}>
          <p className="text-sm text-ink" data-testid="free-note-confirm">
            {others && photos > 0 ? t("noteConfirmMore", { count: photos }) : t("noteConfirm", { count: photos })}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" className="h-11 rounded-full" disabled={busy} onClick={() => void onSendFree()} data-testid="free-note-yes">
              {t("noteConfirmYes")}
            </Button>
            <Button type="button" variant="ghost" className="h-11 rounded-full" disabled={busy} onClick={() => setAsking(false)} data-testid="free-note-no">
              {t("noteConfirmNo")}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="mt-3 h-11 w-full rounded-full"
          onClick={() => {
            setAsking(true);
            onAsk?.();
          }}
          data-testid="free-note-send"
        >
          {photos > 0 ? t("noteSend", { count: photos }) : t("noteSendPlain")}
        </Button>
      )}
    </section>
  );
}
