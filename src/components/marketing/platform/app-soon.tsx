/* eslint-disable @next/next/no-img-element */
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

/**
 * "Ethos for iPhone, coming soon to the App Store". Our own card with the app's icon, not Apple's
 * badge: Apple's "Download on the App Store" artwork may only point at an app that is live in the
 * store, and it may not be imitated, so this stays plain words until there is a store link to give.
 */
export async function AppSoon({ className }: { className?: string }) {
  const t = await getTranslations("common.appSoon");
  return (
    <p className={cn("inline-flex items-center gap-3 rounded-2xl bg-white/75 py-2 pr-5 pl-2 text-forest shadow-soft ring-1 ring-forest/10 backdrop-blur", className)}>
      <img src="/icons/ios-app.webp" alt="" width={40} height={40} decoding="async" className="size-10 rounded-[11px] shadow-[0_4px_12px_-4px_rgba(120,20,60,0.45)]" />
      <span className="flex flex-col leading-tight">
        <span className="text-[14.5px] font-semibold">{t("title")}</span>
        <span className="mt-0.5 text-[12.5px] text-forest/70">{t("sub")}</span>
      </span>
    </p>
  );
}
