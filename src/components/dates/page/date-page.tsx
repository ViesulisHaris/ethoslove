import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { DEFAULT_PAGE_THEME, pageThemeChromeCss, pageThemeStyle } from "@/content/template-page-themes";
import { cn } from "@/lib/utils";
import { EagerImg } from "@/components/shared/eager-img";
import { ArtLayer, BandEdge } from "@/components/templates/page/art";
import type { PlacedArt } from "@/components/templates/page/placements";
import { Intro, SPREAD } from "@/components/templates/page/spread";
import { DATE_FOOT_ART, DATE_HERO_ART } from "./placements";

/**
 * The pieces of a dates page (a page by kind, a city-by-kind page), assembled from the gift page's
 * own parts (components/templates/page) as the finder is: the site's own palette on the page
 * tokens, a hero with a picture, spreads of a short left column beside something to look at, the
 * closed questions, and a last raised band. docs/marketing/growth-build/DESIGN-LESS-TEXT.md.
 */

/** The key of these pages' colours on <body> (content/template-page-themes.ts, pageThemeChromeCss). */
const THEME = "dates";
export const DATE_FLOWERS = DEFAULT_PAGE_THEME.flowers;

/** A quiet link in a row: underlined, and a thumb's target by its padding (the finder page's QUIET_LINK). */
export const QUIET_ROW_LINK = "py-[0.8125rem] text-page-ink underline decoration-page-line underline-offset-4 transition-colors hover:decoration-page-ink";

/** The page's wrapper: the site's own palette on the page tokens, the ground run up under the floating header. */
export function DatePage({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{pageThemeChromeCss(THEME, DEFAULT_PAGE_THEME)}</style>
      <div data-page-theme={THEME} style={pageThemeStyle(DEFAULT_PAGE_THEME)} className="relative isolate -mt-[var(--header-h)] pt-[var(--header-h)]">
        {children}
      </div>
    </>
  );
}

/**
 * The first screen: the label and the heading in the h1, one italic line, one sentence and one
 * button on the left; on the right the idea's own picture, tilted a little, with its title written
 * on a slip at its corner. Below a desk the words come first and the picture after.
 */
export function DateHero({ label, heading, line, sentence, picture, note, back, children }: { label: string; heading: string; line: string; sentence: string; picture: { src: string; from: string; to: string }; note: string; back?: ReactNode; children: ReactNode }) {
  return (
    <section className="relative">
      <ArtLayer items={DATE_HERO_ART} flowers={DATE_FLOWERS} />
      <div className="container-x relative grid items-center gap-y-9 pt-5 pb-14 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-x-14 lg:pt-14 lg:pb-24 xl:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]">
        <div className="lg:max-w-[33rem]">
          {back}
          <h1>
            <span className="mb-3 block text-page-label text-page-body">{label}</span>
            {/* Two blocks to the eye, and still two phrases to whatever reads the heading's text. */}{" "}
            <span className="block max-w-[14em] font-display text-[2rem] leading-[1.02] tracking-[-0.028em] text-balance text-page-ink sm:text-[clamp(2.25rem,4.5vw,3.75rem)]">{heading}</span>
          </h1>
          <p className="mt-3 font-display text-[clamp(1.3rem,2vw,1.6rem)] leading-snug text-page-body italic sm:mt-4">{line}</p>
          <p className="mt-4 max-w-[31rem] text-base leading-relaxed text-page-body sm:mt-6">{sentence}</p>
          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">{children}</div>
        </div>
        <div className="relative mx-auto w-full max-w-[34rem]">
          <span className="block rotate-[1.5deg] overflow-hidden rounded-[2rem] shadow-page-lift ring-8 ring-page-raised" style={{ background: `linear-gradient(160deg, ${picture.from} 0%, ${picture.to} 100%)` }}>
            <EagerImg src={picture.src} alt="" width={960} height={720} loading="eager" fetchPriority="high" decoding="async" className="block aspect-[4/3] w-full object-cover" />
          </span>
          <span data-line className="absolute -bottom-4 left-2 -rotate-[4deg] rounded-2xl bg-page-raised px-4 py-2.5 font-hand text-[1.45rem] leading-none text-page-accent shadow-page-card sm:-left-4">
            {note}
          </span>
        </div>
      </div>
    </section>
  );
}

/**
 * A section: the short left column beside what it shows. On a desk the left column stays in view
 * while a long set of cards scrolls past it.
 */
export function DateSpread({ id, sectionId, label, heading, line, art, className, children }: { id: string; sectionId?: string; label: string; heading: string; line?: string; art?: readonly PlacedArt[]; className?: string; children: ReactNode }) {
  return (
    <section id={sectionId} className={sectionId ? "relative scroll-mt-24" : "relative"} aria-labelledby={id}>
      {art ? <ArtLayer items={art} flowers={DATE_FLOWERS} /> : null}
      <div className={cn(SPREAD, className ?? "py-12 sm:py-16 lg:py-20")}>
        <div className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
          <Intro id={id} label={label} heading={heading} line={line} />
        </div>
        <div className="min-w-0 lg:pt-7">{children}</div>
      </div>
    </section>
  );
}

/** The questions, closed: a native <details> per question, a plus on each, as on a gift's page. */
export function DateQuestions({ id, name, label, heading, line, faq }: { id: string; name: string; label: string; heading: string; line: string; faq: readonly { q: string; a: string }[] }) {
  return (
    <DateSpread id={id} label={label} heading={heading} line={line}>
      <div className="border-t border-page-line">
        {faq.map((item) => (
          <details key={item.q} name={`faq-${name}`} className="group border-b border-page-line">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-4 text-left text-[0.9375rem] font-medium text-page-ink [&::-webkit-details-marker]:hidden">
              {item.q}
              <Plus aria-hidden="true" className="size-4 shrink-0 text-page-body transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" strokeWidth={1.6} />
            </summary>
            {/* No data-reveal: inside a <details> near the foot of a screen it would stay unseen when opened. */}
            <p className="max-w-2xl pr-8 pb-5 text-[0.9375rem] leading-relaxed text-page-body">{item.a}</p>
          </details>
        ))}
      </div>
    </DateSpread>
  );
}

/** The last band: raised, with the soft curved top edge, and the finder's lily lying across it. */
export function DateFoot({ id, label, heading, line, children }: { id: string; label: string; heading: string; line?: string; children: ReactNode }) {
  return (
    <section className="relative" aria-labelledby={id}>
      <BandEdge side="top" className="text-page-raised" />
      <div className="relative -mt-px bg-page-raised">
        <ArtLayer items={DATE_FOOT_ART} flowers={DATE_FLOWERS} />
        <div className={cn(SPREAD, "pt-12 pb-20 sm:pb-24 lg:pt-16 lg:pb-28")}>
          <Intro id={id} label={label} heading={heading} line={line} />
          <div className="min-w-0 lg:pt-7">{children}</div>
        </div>
      </div>
    </section>
  );
}
