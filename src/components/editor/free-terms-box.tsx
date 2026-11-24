"use client";

import type { Ref } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";

/**
 * The free version's Terms box (lib/lifecycle/monthly-idea.ts termsRequired), directly above the
 * send button, only while the setting is "all" and only for an account that has never paid and is not
 * getting the monthly idea yet. Unticked; the send button stays tappable and says why when tapped
 * early (`nudge`). Ticking it is the yes: the sentence and the time are stored with the account's row.
 */
export function FreeTermsBox({ checked, onChange, nudge, inputRef }: { checked: boolean; onChange: (v: boolean) => void; nudge: boolean; inputRef?: Ref<HTMLInputElement> }) {
  const t = useTranslations("offerEmails");
  return (
    <div className="mt-8" data-testid="free-terms">
      <label className="flex min-h-11 cursor-pointer items-start gap-3">
        <input
          ref={inputRef}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          required
          aria-describedby={nudge ? "free-terms-nudge" : undefined}
          aria-invalid={nudge || undefined}
          className="mt-0.5 size-5 shrink-0 accent-coral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          data-testid="free-terms-box"
        />
        <span className="text-sm text-ink">
          {t.rich("ideaTerms", {
            terms: (chunks) => (
              <Link href="/legal/terms" target="_blank" className="underline underline-offset-2 hover:text-coral" data-testid="free-terms-link">
                {chunks}
              </Link>
            ),
          })}
        </span>
      </label>
      {nudge ? (
        // Drawn like the sheet's other problems (the stuck-uploads card): the coral mark and a firmer line.
        <p id="free-terms-nudge" role="alert" className="mt-2 ml-8 flex items-start gap-2 text-sm font-medium text-ink" data-testid="free-terms-nudge">
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-coral" />
          <span>{t("ideaTermsNeeded")}</span>
        </p>
      ) : null}
    </div>
  );
}
