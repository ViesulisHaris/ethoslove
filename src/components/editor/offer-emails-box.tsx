"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";

/**
 * "Email me Ethos offers": one unticked box on the screen a gift is sent from, for the account that
 * sent it (api/offer/emails, migration 0021). Never ticked for them; ticking it is the yes the offer
 * emails need, and unticking it takes the yes back at once. It shows what is already saved.
 */
export function OfferEmailsBox() {
  const t = useTranslations("offerEmails");
  const locale = useLocale() === "es" ? "es" : "en";
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/offer/emails", { cache: "no-store", credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { on?: boolean } | null) => {
        if (alive && json?.on) setOn(true);
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
        body: JSON.stringify({ on: next, locale }),
      });
      if (!res.ok) throw new Error(String(res.status));
      toast(t(next ? "saved" : "removed"));
    } catch {
      setOn(!next);
      toast.error(t("failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-4" data-testid="offer-emails">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={on}
          disabled={busy}
          onChange={(e) => void change(e.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-coral"
          data-testid="offer-emails-box"
        />
        <span className="text-sm text-ink">{t("box")}</span>
      </label>
      <Link href="/legal/privacy" className="mt-1 ml-8 inline-flex min-h-11 items-center text-xs text-muted-foreground underline underline-offset-2 hover:text-ink">
        {t("how")}
      </Link>
    </div>
  );
}
