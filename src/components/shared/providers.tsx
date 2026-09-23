"use client";

// First, before anything renders: a translated page must not be able to crash the app.
import "@/lib/dom/survive-translation";
import { useTranslations } from "next-intl";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const t = useTranslations("common");
  return (
    <TooltipProvider delayDuration={200}>
      {children}
      {/* Sonner names its region and close buttons in English ("Notifications alt+T", "Close toast") unless told. */}
      <Toaster
        position="bottom-center"
        richColors
        closeButton
        containerAriaLabel={t("notifications")}
        toastOptions={{ closeButtonAriaLabel: t("closeNotification") }}
      />
    </TooltipProvider>
  );
}
