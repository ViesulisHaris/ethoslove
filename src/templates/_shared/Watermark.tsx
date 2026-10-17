import type { GiftLocale } from "@/lib/gift/schema";
import { BRAND } from "@/config/brand";
import { LogoMark } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

/**
 * Free-tier footer. Deliberately small and tasteful — it is the viral hook, not an ad.
 *
 * It opens the page of the template this gift was made with, not the front page: whoever taps it
 * has just watched that very gift and wants one like it. Gifts carry no app context, so the
 * language prefix is the gift's own, the same as its "send one back".
 *
 * It floats at the foot of the gift, except on the end screen, which carries it in its own flow
 * (`inline`) so it never lands on top of the buttons there.
 */
export function Watermark({ locale, slug, inline = false, className }: { locale: GiftLocale; slug?: string; inline?: boolean; className?: string }) {
  const prefix = locale === "es" ? "/es" : "";
  const href = slug ? `${prefix}/templates/${encodeURIComponent(slug)}?ref=watermark` : `${prefix}/templates?ref=watermark`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className={cn(
        "z-40 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-[11px] font-medium whitespace-nowrap text-white/85 shadow-sm backdrop-blur-md transition-colors hover:bg-black/55",
        inline ? "relative" : "absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2",
        className,
      )}
    >
      <LogoMark className="size-3.5" />
      {BRAND.watermark[locale]}
    </a>
  );
}
