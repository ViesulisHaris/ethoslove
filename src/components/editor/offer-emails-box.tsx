"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/track";

/**
 * "Email me Ethos offers": one unticked box on the screen a gift is sent from, for the account that
 * sent it (api/offer/emails, migration 0021). Never ticked for them; ticking it is the yes the offer
 * emails need, and unticking it takes the yes back at once. It shows what is already saved.
 *
 * Above it, when sending this gift started the monthly idea (lib/lifecycle/monthly-idea.ts), the line
 * that says so, from the first paint, with "Don't send these" (api/monthly-idea). `ideaBox` (the
 * settings "optin" and "buyers") makes the box's own sentence name the monthly idea too.
 */
export function OfferEmailsBox({ ideaNotice = null, ideaBox = false }: { ideaNotice?: string | null; ideaBox?: boolean } = {}) {
  const t = useTranslations("offerEmails");
  const locale = useLocale() === "es" ? "es" : "en";
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ideaOff, setIdeaOff] = useState(false);
  const [ideaBusy, setIdeaBusy] = useState(false);
  // A yes already stored to the plain offers sentence keeps that sentence beside its tick: the one
  // naming the monthly idea is offered only to someone who hasn't said yes to the other (GET `idea`).
  const [storedPlain, setStoredPlain] = useState(false);
  const boxNamesIdea = ideaBox && !ideaNotice && !(on && storedPlain);

  useEffect(() => {
    let alive = true;
    fetch("/api/offer/emails", { cache: "no-store", credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { on?: boolean; idea?: boolean } | null) => {
        if (!alive || !json?.on) return;
        setOn(true);
        if (json.idea === false) setStoredPlain(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const change = async (next: boolean) => {
    setBusy(true);
    setOn(next);
    try {
      const res = await fetch("/api/offer/emails", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ on: next, locale, ...(boxNamesIdea ? { idea: true } : {}) }),
      });
      if (!res.ok) throw new Error(String(res.status));
      // What is stored now is the sentence this tick was next to.
      setStoredPlain(next && !boxNamesIdea);
      toast(t(next ? "saved" : "removed"));
    } catch {
      setOn(!next);
      toast.error(t("failed"));
    } finally {
      setBusy(false);
    }
  };

  const switchIdea = async (off: boolean) => {
    setIdeaBusy(true);
    setIdeaOff(off);
    try {
      const res = await fetch("/api/monthly-idea", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ on: !off }),
      });
      if (!res.ok) throw new Error(String(res.status));
      track(off ? "idea_emails_off" : "idea_emails_on", { where: "share" });
    } catch {
      setIdeaOff(!off);
      toast.error(t("failed"));
    } finally {
      setIdeaBusy(false);
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-4" data-testid="offer-emails">
      {ideaNotice ? (
        <div className="mb-3 border-b border-border pb-3" data-testid="idea-notice" aria-live="polite">
          <p className="text-sm text-ink">{ideaOff ? t("ideaOffDone") : ideaNotice}</p>
          <button
            type="button"
            disabled={ideaBusy}
            onClick={() => void switchIdea(!ideaOff)}
            className="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-ink underline underline-offset-4 hover:text-coral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-70 disabled:opacity-50"
            data-testid="idea-off"
          >
            {ideaBusy ? <Loader2 aria-hidden className="mr-1.5 size-4 animate-spin motion-reduce:animate-none" /> : null}
            {ideaOff ? t("ideaUndo") : t("ideaOff")}
          </button>
        </div>
      ) : null}
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={on}
          disabled={busy}
          onChange={(e) => void change(e.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-coral"
          data-testid="offer-emails-box"
        />
        <span className="text-sm text-ink">{boxNamesIdea ? t("boxIdea") : t("box")}</span>
      </label>
      <Link href="/legal/privacy" className="mt-1 ml-8 inline-flex min-h-11 items-center text-xs text-muted-foreground underline underline-offset-2 hover:text-ink">
        {t("how")}
      </Link>
    </div>
  );
}
