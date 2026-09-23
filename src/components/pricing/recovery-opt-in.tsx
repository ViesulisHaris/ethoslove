"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * The box under a pay button: "if I don't finish paying, email me one link to come back to it".
 * Checkout records a tick as recovery_optin and the abandoned session's email goes out on that alone
 * (lib/stripe/recovery.ts). It is ours because Stripe shows its own marketing box to US merchants
 * only. Unticked until the buyer ticks it, and never required: consent to an email nobody asked for
 * isn't consent, and the sale doesn't depend on it.
 */
export function RecoveryOptIn({
  checked,
  onChange,
  disabled = false,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Colours for the surface it sits on; the default suits a light card. */
  className?: string;
}) {
  const t = useTranslations("money.recovery");
  return (
    // The whole label is the tap target, so the small box still gets a 44px row on a phone.
    <label className={cn("flex min-h-11 cursor-pointer items-center gap-2.5 py-1.5 text-left text-[13px] leading-snug text-ink-soft", className)} data-testid="recovery-optin">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 shrink-0 accent-coral"
        data-testid="recovery-optin-box"
      />
      <span>{t("optIn")}</span>
    </label>
  );
}
