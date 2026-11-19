"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * Under the pay panel of a Letter held to the short note (lib/gift/free-tier.ts): the free way out,
 * said plainly. A letter over the free length is never cut for them, so it sends them back to
 * shorten it; photos and the other paid parts come out only after a second, explicit yes.
 */
export function FreeNoteOption({
  photos,
  chars,
  max,
  others,
  busy = false,
  onShorten,
  onSendFree,
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
}) {
  const t = useTranslations("editor.publishSheet");
  const [asking, setAsking] = useState(false);
  const tooLong = chars > max;

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
        <Button type="button" variant="outline" className="mt-3 h-11 w-full rounded-full" onClick={() => setAsking(true)} data-testid="free-note-send">
          {photos > 0 ? t("noteSend", { count: photos }) : t("noteSendPlain")}
        </Button>
      )}
    </section>
  );
}
