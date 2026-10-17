"use client";

import { useTransition } from "react";
import { ChevronDown, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALE_LABELS, routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TILE } from "@/components/pickers/styles";

/**
 * The language, as a small pill (a globe and "EN") in a 44px target, opening the site's menu card
 * with the languages by their own names, the one in use checked. `tone="dark"` is for the wine footer.
 */
export function LocaleSwitcher({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const dark = tone === "dark";

  const change = (next: Locale) => {
    if (next === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" disabled={pending} className={cn("group inline-flex h-11 shrink-0 items-center rounded-full px-0.5 outline-none disabled:opacity-60", className)}>
          <span
            className={cn(
              // The focus ring is the site's own (2px, --ring, 3px out), drawn round the pill that shows rather
              // than the 44px target around it; a paler ring of its own read at under 3:1 on the glass.
              "inline-flex h-8 items-center gap-1.5 rounded-full pr-2 pl-2.5 text-[12.5px] font-semibold tracking-[0.04em] ring-1 transition-[background-color,color,box-shadow,scale] duration-200 ease-(--ease-out-quint) group-focus-visible:outline-2 group-focus-visible:outline-offset-3 group-focus-visible:outline-(--ring) group-active:scale-[0.97]",
              dark
                ? "text-cream/75 ring-white/15 group-hover:bg-white/10 group-hover:text-cream group-data-[state=open]:bg-white/10 group-data-[state=open]:text-cream"
                : "bg-white/55 text-forest/75 ring-forest/10 group-hover:bg-white group-hover:text-forest group-data-[state=open]:bg-white group-data-[state=open]:text-forest",
            )}
          >
            <Globe aria-hidden="true" className="size-3.5" strokeWidth={1.9} />
            {/* The name a screen reader gives it, "Language EN", holds the "EN" it shows. */}
            <span className="sr-only">{t("language")} </span>
            <span className="uppercase">{locale}</span>
            <ChevronDown aria-hidden="true" className="size-3 opacity-55 transition-transform duration-200 ease-(--ease-out-quint) group-data-[state=open]:rotate-180" strokeWidth={2.2} />
          </span>
        </button>
      </DropdownMenuTrigger>
      {/* Over the phone menu (80), which it also opens from. */}
      <DropdownMenuContent align="end" className="z-[85] w-60">
        <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={locale} onValueChange={(next) => change(next as Locale)}>
          {routing.locales.map((l) => (
            <DropdownMenuRadioItem key={l} value={l} className="px-2.5">
              <span aria-hidden="true" className={cn(TILE, "text-[11.5px] font-semibold tracking-[0.06em] uppercase")}>
                {l}
              </span>
              <span lang={l} className="flex-1 text-[15px] font-semibold">
                {LOCALE_LABELS[l]}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
