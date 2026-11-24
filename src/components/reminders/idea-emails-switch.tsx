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
  const t = useTranslations("lifecycle");
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
      <section className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-card py-2 pr-2 pl-5" data-testid="idea-emails">
        <div className="min-w-0 flex-1 py-1">
          <p className="font-medium">{t("idea.pageTitle")}</p>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {on ? t("idea.pageOn") : t("idea.pageOff")}
          </p>
        </div>
        <Button variant="ghost" className="h-11 shrink-0 rounded-full px-4" disabled={busy} aria-pressed={on} onClick={() => void toggle()}>
          {busy ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> : null}
          <span>{on ? t("idea.turnOff") : t("idea.turnOn")}</span>
        </Button>
      </section>
      {failed ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {t("idea.failed")}
        </p>
      ) : null}
    </>
  );
}
