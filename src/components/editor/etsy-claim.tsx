"use client";

import { useEffect, useState } from "react";
import { Loader2, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import type { GiftLocale } from "@/lib/gift/schema";
import { getManifest } from "@/templates/manifests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { track } from "@/lib/analytics/track";

const ETSY_MODE = "ethos-etsy";

/**
 * Whether this visitor came from an Etsy order (the PDF's link, /etsy/<slug> → /create/<slug>?etsy=1).
 * Kept for the tab, so signing in on the way doesn't lose it. Read after mounting: the server can't
 * know, and the pay sheet only opens after a tap anyway.
 */
export function useEtsyMode(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(false);
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get("etsy") === "1") sessionStorage.setItem(ETSY_MODE, "1");
      // Reading the tab's storage once it exists: the state only mirrors it.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOn(sessionStorage.getItem(ETSY_MODE) === "1");
    } catch {
      // Storage blocked: only the link itself says so.
      setOn(new URLSearchParams(window.location.search).get("etsy") === "1");
    }
  }, []);
  const set = (next: boolean) => {
    setOn(next);
    try {
      if (next) sessionStorage.setItem(ETSY_MODE, "1");
      else sessionStorage.removeItem(ETSY_MODE);
    } catch {}
  };
  return [on, set];
}

type ClaimAnswer = { ok: true; signInUrl?: string; signIn?: boolean } | { error: string; templates?: string[] };

const ERRORS = new Set(["invalid_input", "email_required", "order_not_found", "not_paid", "refunded", "other_template", "order_used", "rate_limited", "etsy_unavailable"]);

/**
 * "Bought on Etsy": in place of prices, the order number (and, without an account, an email). The
 * server asks Etsy whether that order is paid and for this template (app/api/etsy/claim); then the
 * gift goes out the way a paid one does, through the sign-in a guest checkout gets.
 */
export function EtsyClaim({ slug, locale, guest, returnTo, blocked, onLeave }: { slug: string; locale: GiftLocale; guest: boolean; returnTo: string; blocked: boolean; onLeave: () => void }) {
  const t = useTranslations("money.etsy");
  const [order, setOrder] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const name = getManifest(slug)?.name[locale] ?? slug;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setProblem(null);
    track("etsy_claim_sent", { template: slug, guest });
    let answer: ClaimAnswer;
    try {
      const res = await fetch("/api/etsy/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ order, slug, returnTo, locale, ...(guest ? { email } : {}) }),
      });
      answer = (await res.json().catch(() => ({ error: "failed" }))) as ClaimAnswer;
    } catch {
      answer = { error: "network" };
    }
    if ("ok" in answer) {
      track("etsy_claimed", { template: slug, guest });
      window.location.assign(answer.signInUrl ?? (answer.signIn ? `/login?next=${encodeURIComponent(returnTo)}` : returnTo));
      return;
    }
    setBusy(false);
    if (answer.error === "other_template" && answer.templates?.length)
      setProblem(t("errors.other_template", { templates: answer.templates.map((s) => getManifest(s)?.name[locale] ?? s).join(", ") }));
    else setProblem(t(`errors.${ERRORS.has(answer.error) ? answer.error : "failed"}` as "errors.failed"));
  };

  return (
    <section className="mt-7 rounded-xl border border-ink bg-card p-4 sm:p-5" data-testid="etsy-claim">
      <p className="flex items-center gap-2 font-display text-xl">
        <ShoppingBag aria-hidden="true" className="size-5 text-coral" />
        {t("title")}
      </p>
      <p className="mt-1.5 text-sm text-ink-soft">{t("intro", { template: name })}</p>
      <form onSubmit={submit} className="mt-4 grid gap-3">
        <label className="grid gap-1.5 text-sm font-medium">
          {t("order")}
          <Input
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            placeholder="3456789012"
            required
            className="h-11 text-base"
            data-testid="etsy-order"
          />
          <span className="text-xs font-normal text-muted-foreground">{t("orderHint")}</span>
        </label>
        {guest ? (
          <label className="grid gap-1.5 text-sm font-medium">
            {t("email")}
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="h-11 text-base"
              data-testid="etsy-email"
            />
            <span className="text-xs font-normal text-muted-foreground">{t("emailHint")}</span>
          </label>
        ) : null}
        {problem ? (
          <p role="alert" className="rounded-lg bg-blush/40 px-3 py-2.5 text-sm text-ink" data-testid="etsy-problem">
            {problem}
          </p>
        ) : null}
        <Button type="submit" className="mt-1 h-12 w-full rounded-full text-base" disabled={busy || blocked} data-testid="etsy-submit">
          {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
          <span>{busy ? t("checking") : t("submit")}</span>
        </Button>
      </form>
      <button type="button" onClick={onLeave} className="mt-3 min-h-11 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-ink hover:underline">
        {t("notEtsy")}
      </button>
    </section>
  );
}
