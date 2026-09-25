"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatAmount, membershipAmount, type Currency } from "@/lib/pricing/products";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { postMembership } from "./actions";

/**
 * A question before a change to someone's membership. Focus stays inside it (Radix), Escape or the
 * second button leaves everything as it was, and the first button says exactly what it does.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirm,
  keep,
  onConfirm,
  busy,
  danger = false,
  error,
  confirmDisabled = false,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: ReactNode;
  confirm: string;
  keep: string;
  onConfirm: () => void;
  busy: boolean;
  /** Ending something (cancel, leave, remove) rather than changing it. */
  danger?: boolean;
  error?: ReactNode;
  confirmDisabled?: boolean;
  children?: ReactNode;
}) {
  const tCommon = useTranslations("common");
  return (
    <Dialog open={open} onOpenChange={(next) => (busy ? undefined : onOpenChange(next))}>
      <DialogContent closeLabel={tCommon("close")} className="gap-0 rounded-[24px] p-6 sm:max-w-md sm:p-7">
        <DialogHeader>
          <DialogTitle className="pr-6 font-display text-[1.6rem] leading-tight font-normal text-forest">{title}</DialogTitle>
          <DialogDescription className="mt-2 text-[15px] leading-relaxed text-ink-soft">{body}</DialogDescription>
        </DialogHeader>
        {children}
        {error ? (
          <div role="alert" className="mt-4 rounded-2xl border border-coral/35 bg-coral/5 p-3.5 text-[14px] leading-snug text-ink">
            {error}
          </div>
        ) : null}
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
            className={cn(
              "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-semibold transition-colors disabled:opacity-60 sm:order-2",
              danger ? "bg-forest text-cream hover:bg-forest-raised" : "btn-star",
            )}
            data-testid="membership-confirm"
          >
            {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
            {confirm}
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-forest/15 px-5 py-2.5 text-[15px] font-semibold text-forest hover:bg-forest/5 disabled:opacity-60 sm:order-1"
          >
            {keep}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Monthly to yearly: the amount due today comes from Stripe's own preview of the switch (the year,
 * less the unused part of the month), fetched as the dialog opens, so the sentence and the charge
 * are the same number. Until it arrives the button waits.
 */
export function YearlyDialog({
  open,
  onOpenChange,
  currency,
  onConfirm,
  busy,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: Currency;
  onConfirm: () => void;
  busy: boolean;
  error?: ReactNode;
}) {
  const t = useTranslations("membership.account");
  const locale = useLocale() === "es" ? "es" : "en";
  const [preview, setPreview] = useState<{ amountDue: number; currency: Currency; periodEnd: string } | "failed" | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  // Asked afresh at each opening: closing forgets the last answer, since the credit shrinks by the day.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) setPreview(null);
  }

  useEffect(() => {
    if (!open) return;
    let live = true;
    void postMembership("preview_yearly", locale).then((answer) => {
      if (!live) return;
      setPreview(answer.ok && "preview" in answer ? answer.preview : "failed");
    });
    return () => {
      live = false;
    };
  }, [open, locale]);

  const money = (minor: number, c: Currency = currency) => formatAmount(minor, c, locale);
  const ready = preview !== null && preview !== "failed";
  // The year at the catalogue's price in the preview's own currency; the credit is what it doesn't charge.
  const yearly = membershipAmount("yearly", ready ? preview.currency : currency);
  const body = ready
    ? t("dialogs.yearly.body", {
        amount: money(preview.amountDue, preview.currency),
        yearly: money(yearly, preview.currency),
        credit: money(Math.max(0, yearly - preview.amountDue), preview.currency),
        date: new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(preview.periodEnd)),
      })
    : preview === "failed"
      ? t("errors.generic")
      : t("dialogs.yearly.loading");

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("dialogs.yearly.title")}
      body={body}
      confirm={ready ? t("dialogs.yearly.confirm", { amount: money(preview.amountDue, preview.currency) }) : t("dialogs.yearly.confirmLoading")}
      keep={t("dialogs.yearly.keep")}
      onConfirm={onConfirm}
      busy={busy}
      confirmDisabled={!ready}
      error={error}
    />
  );
}
