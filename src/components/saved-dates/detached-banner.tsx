"use client";

import { ArrowRight, Lock, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FREE_SAVED_DATES } from "@/lib/pricing/products";
import { useDetached, writeDetached } from "@/lib/saved-dates/link";

/**
 * Said at the top of the plan when the saved date it was linked to turned read-only while it was
 * being edited (autosave answered `read_only`: the membership ended and this date isn't one of the
 * few most recent). The plan stays on this device, unlinked; this stays up, on this page and after a
 * reload, until it is closed or the plan is replaced, because a toast would be gone before anyone
 * had read why their changes stopped saving. In the membership's night colours, like the sheet
 * "Why?" opens.
 */
export function DetachedBanner({ onWhy }: { onWhy: () => void }) {
  const t = useTranslations("savedDates.detached");
  const detached = useDetached();
  if (!detached) return null;
  return (
    <div role="status" className="mb-6 flex items-start gap-3 rounded-2xl bg-dusk py-3 pr-1.5 pl-4 text-cream shadow-soft ring-1 ring-white/10" data-testid="saved-detached">
      <Lock aria-hidden="true" className="mt-1 size-4 shrink-0 text-starlight" />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-snug font-semibold">{t("title")}</p>
        <p className="mt-1 text-[13.5px] leading-snug text-moonlight/85">{t("body", { limit: FREE_SAVED_DATES })}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-5">
          <button type="button" onClick={onWhy} className="inline-flex min-h-11 items-center text-[14px] font-semibold text-starlight underline underline-offset-4">
            {t("why")}
          </button>
          <Link href="/my-dates" className="group inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-moonlight hover:text-cream">
            {t("manage")}
            <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
      <button type="button" onClick={() => writeDetached(null)} aria-label={t("dismiss")} className="grid size-11 shrink-0 place-items-center rounded-full text-moonlight transition-colors hover:bg-white/10 hover:text-cream">
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
