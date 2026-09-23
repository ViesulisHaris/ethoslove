"use client";

import { useTransition } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALE_LABELS, routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/**
 * The language, as a small pill (a globe and "EN") in a 44px target, opening a short menu of the
 * languages by their own names. `tone="dark"` is for the wine footer.
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
      <DropdownMenuContent
        align="end"
        sideOffset={4}
        className="z-[85] min-w-48 rounded-2xl bg-white/95 p-1.5 shadow-[0_20px_44px_-18px_rgba(80,20,50,0.4)] ring-forest/[0.08] backdrop-blur-xl data-open:duration-200 data-open:ease-(--ease-out-quint) data-closed:duration-150"
      >
        <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-medium tracking-[0.14em] text-forest/45 uppercase">{t("language")}</p>
        {routing.locales.map((l) => {
          const here = l === locale;
          return (
            <DropdownMenuItem key={l} onSelect={() => change(l)} className="h-11 gap-3 rounded-xl px-2 text-[14.5px] text-forest focus:bg-rose-mist focus:text-forest">
              <span
                aria-hidden="true"
                className={cn("grid size-7 shrink-0 place-items-center rounded-full text-[10.5px] font-semibold tracking-[0.06em] uppercase", here ? "bg-rose text-white" : "bg-forest/[0.06] text-forest/60")}
              >
                {l}
              </span>
              <span lang={l} className={cn("flex-1", here && "font-medium")}>
                {LOCALE_LABELS[l]}
              </span>
              {here ? <Check aria-hidden="true" className="size-4 text-rose" strokeWidth={2.2} /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
