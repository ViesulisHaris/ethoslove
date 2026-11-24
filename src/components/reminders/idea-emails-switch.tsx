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

  const toggle = async () => {
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

  return (
    <>
      {/* On a phone the button sits under the words, and the line under the title keeps two lines'
          room, so turning it off or on never moves what is below the row. */}
      <section
        className="mt-6 flex flex-col items-start gap-2 rounded-2xl border border-border bg-card px-5 py-3 sm:flex-row sm:items-center sm:gap-3 sm:py-2 sm:pr-2"
        data-testid="idea-emails"
      >
        <div className="w-full min-w-0 py-1 sm:w-auto sm:flex-1">
          <p className="font-medium">{t("pageTitle")}</p>
          <p className="min-h-10 text-sm text-muted-foreground sm:min-h-0" aria-live="polite">
            {on ? t("pageOn") : t("pageOff")}
          </p>
        </div>
        <Button variant="outline" className="h-11 shrink-0 rounded-full px-5" disabled={busy} aria-busy={busy || undefined} onClick={() => void toggle()}>
          {busy ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> : null}
          <span>{on ? t("turnOff") : t("turnOn")}</span>
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
