"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Where the address is given (the sign-in card, the pay panel's small print), one quiet line saying
 * that a gift sent brings the monthly idea (lib/lifecycle/monthly-idea.ts). Only in the settings
 * "buyers" and "all".
 */
export function IdeaWhereNote({ className }: { className?: string }) {
  const t = useTranslations("offerEmails");
  return (
    <p data-testid="idea-where" className={cn("text-xs text-muted-foreground", className)}>
      {t("ideaWhere")}
    </p>
  );
}
