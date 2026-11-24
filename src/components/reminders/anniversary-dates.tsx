"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/track";
import { showsAnniversaryDates } from "@/lib/lifecycle/anniversary-dates";

/**
 * One line on the sender's share screen, under the reminders, after an anniversary gift: date ideas
 * for the day itself. Only for a signed-in sender, who sees the reminders it sits under. Opens in a
 * new tab (and says so to a screen reader), so the share screen with the gift's link on it is not
 * lost; not inside the iPhone app, which has its own dates. Nothing sold here: no price, no partner.
 * Never on the gift itself.
 */
export function AnniversaryDates({ templateSlug, authed }: { templateSlug: string; authed: boolean }) {
  const t = useTranslations("lifecycle.dates");
  if (!showsAnniversaryDates(templateSlug, authed)) return null;
  return (
    <p data-testid="anniversary-dates" data-app-hide className="mt-3 text-sm text-muted-foreground">
      {t("line")}{" "}
      <Link
        href="/dates"
        target="_blank"
        onClick={() => track("room_handoff", { from: "share_screen", to: "dates" })}
        className="inline-flex min-h-11 items-center rounded-sm font-medium text-ink underline underline-offset-4 hover:text-coral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {t("link")}
        <span className="sr-only"> ({t("newTab")})</span>
      </Link>
    </p>
  );
}
