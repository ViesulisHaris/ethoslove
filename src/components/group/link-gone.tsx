import { Lock } from "lucide-react";
import { LogoMark } from "@/components/shared/logo";

/** Said on this page, and by the contribute page itself when its link stops opening anything while someone is writing (a note sent to a link that was reset). */
export const LINK_GONE = {
  en: { title: "This link no longer works.", ask: "Ask whoever sent it for a new one.", own: "Make a gift of your own" },
  es: { title: "Este enlace ya no funciona.", ask: "Pide uno nuevo a quien te lo envió.", own: "Haz tu propio regalo" },
} as const;

/**
 * What an address under /c/ that opens no group card shows while group cards are on: a link that
 * was reset, one copied a character short, one made up. In the contribute page's own dress, so
 * someone holding yesterday's link from a family chat is told what to do instead of being sent to
 * the site's front page. It says the same for every address and names nobody, so it confirms
 * nothing about any link that ever existed.
 */
export function GroupLinkGone({ locale }: { locale: "en" | "es" }) {
  const t = LINK_GONE[locale];
  return (
    <div lang={locale} className="flex min-h-dvh flex-col items-center justify-center bg-night px-6 py-12 text-center text-paper" data-testid="group-link-gone">
      <div className="grain-overlay" />
      <LogoMark className="size-10" />
      <div className="mt-7 grid size-16 place-items-center rounded-full bg-white/8">
        <Lock aria-hidden="true" className="size-6 text-coral" />
      </div>
      <h1 className="mt-6 max-w-sm text-[1.8rem] leading-tight italic" style={{ fontFamily: "var(--font-display)" }}>
        {t.title}
      </h1>
      <p className="mt-3 max-w-xs text-sm text-paper/70">{t.ask}</p>
      <a
        href={`${locale === "es" ? "/es" : ""}/templates?ref=group-contribute`}
        className="mt-8 inline-flex min-h-11 items-center text-sm text-paper/70 underline-offset-4 hover:text-paper hover:underline focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
      >
        {t.own}
      </a>
    </div>
  );
}
