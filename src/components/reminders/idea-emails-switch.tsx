"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics/track";

/**
 * The monthly idea on /account/reminders (lib/lifecycle/monthly-idea.ts): on or off, with one button
 * (api/monthly-idea). Shown only to an account that has a row; turning it back on never enrols
 * anyone new. Drawn as one of the reminders list's rows.
 */
export function IdeaEmailsSwitch({ initialOn }: { initialOn: boolean }) {
  const t = useTranslations("lifecycle.idea");
  const [on, setOn] = useState(initialOn);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // Never `disabled` while it saves: a disabled button drops keyboard and screen-reader focus to
  // <body>, and the next Tab lands in the footer. It says so with aria-disabled and ignores a second press.
  const toggle = async () => {
    if (busy) return;
    const next = !on;
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch("/api/monthly-idea", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ on: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setOn(next);
      track(next ? "idea_emails_on" : "idea_emails_off", { where: "account" });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const line = on ? t("pageOn") : t("pageOff");
  const other = on ? t("pageOff") : t("pageOn");
  const label = on ? t("turnOff") : t("turnOn");
  const otherLabel = on ? t("turnOn") : t("turnOff");

  return (
    <>
      {/* Turning it off or on never moves what is below the row, at any width and in either language:
          the line and the button each hold the other state's words under their own, unseen (a
          pseudo-element: no text, nothing read out), so both are always the size of the longer one.
          On a phone the button sits under the words. */}
      <section
        className="mt-6 flex flex-col items-start gap-2 rounded-2xl border border-border bg-card px-5 py-3 sm:flex-row sm:items-center sm:gap-3 sm:py-2 sm:pr-2"
        data-testid="idea-emails"
      >
        <div className="w-full min-w-0 py-1 sm:w-auto sm:flex-1">
          <p className="font-medium">{t("pageTitle")}</p>
          <p className="grid text-sm text-muted-foreground after:invisible after:col-start-1 after:row-start-1 after:content-[attr(data-other)]" data-other={other} aria-live="polite">
            <span className="col-start-1 row-start-1">{line}</span>
          </p>
        </div>
        <Button
          variant="outline"
          className="relative h-11 shrink-0 rounded-full px-5 aria-disabled:cursor-default aria-disabled:opacity-60"
          aria-disabled={busy || undefined}
          aria-busy={busy || undefined}
          onClick={() => void toggle()}
        >
          {/* While it saves, the spinner takes the label's place without changing the button's size. */}
          {busy ? <Loader2 className="absolute inset-0 m-auto size-4 animate-spin motion-reduce:animate-none" aria-hidden /> : null}
          <span className={`grid justify-items-center after:invisible after:col-start-1 after:row-start-1 after:content-[attr(data-other)] ${busy ? "opacity-0" : ""}`} data-other={otherLabel}>
            <span className="col-start-1 row-start-1">{label}</span>
          </span>
        </Button>
      </section>
      {failed ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </>
  );
}
