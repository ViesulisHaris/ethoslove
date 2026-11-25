import type { ReactNode } from "react";
import { PAGE_THEME_MARK, pageThemeChromeCss, pageThemeStyle } from "@/content/template-page-themes";
import { HALFWAY_FOOT_ART, ROOMS_THEME } from "@/content/rooms-art";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { DATE_HERO_ART } from "@/components/dates/page/placements";
import { DocumentMark } from "@/components/shared/document-mark";
import { EagerImg } from "@/components/shared/eager-img";
import { ArtLayer, BandEdge } from "@/components/templates/page/art";
import type { PlacedArt } from "@/components/templates/page/placements";
import { Intro, SPREAD } from "@/components/templates/page/spread";

/**
 * The pieces of a trips page built in the designed spread (the pages by where you leave from and
 * by kind of trip), line for line the dates pages' own (components/dates/page/date-page.tsx) with
 * the rooms' ivory lilies: the site's palette on the page tokens, a hero with the nearest trip's
 * photograph, a spread of a short left column beside the trips, and a last raised band.
 * DESIGN-LESS-TEXT.md. The room's older pages (/trips, a trip's page) keep their own frame.
 */

/** The key of these pages' colours on <body> (content/template-page-themes.ts, pageThemeChromeCss). */
const THEME = "trips";
const FLOWERS = ROOMS_THEME.flowers;

/** A quiet link in a row: underlined, and a thumb's target by its padding (date-page.tsx, QUIET_ROW_LINK). */
export const ROOM_ROW_LINK = "inline-block min-w-11 py-[0.8125rem] text-page-ink underline decoration-page-line underline-offset-4 transition-colors hover:decoration-page-ink";

/** The page-accent button every designed page has (tonight-form.tsx, TONIGHT_BUTTON), with the page's focus ring. Written out: that file is a client component. */
export const ROOM_BUTTON =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-page-accent px-6 text-base font-medium text-page-on-accent shadow-[0_14px_28px_-16px_var(--page-accent)] transition-[background-color,translate,scale] duration-200 ease-(--ease-out-quint) hover:bg-page-accent-hover active:scale-[0.98] pointer-fine:hover:-translate-y-px aria-disabled:cursor-default aria-disabled:opacity-60 aria-disabled:active:scale-100 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-page-ink";

/** The page's wrapper: the site's own palette on the page tokens, the ground run up under the floating header. */
export function RoomPage({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{pageThemeChromeCss(THEME, ROOMS_THEME)}</style>
      <DocumentMark on="body" name={PAGE_THEME_MARK} value={THEME} />
      <div data-page-theme={THEME} style={pageThemeStyle(ROOMS_THEME)} className="relative isolate -mt-[var(--header-h)] pt-[var(--header-h)]">
        {children}
      </div>
    </>
  );
}

/**
 * The first screen: the label and the heading in the h1, one italic line, one sentence and one
 * button on the left; on the right a trip's photograph, tilted a little, with its name written on a
 * slip at its corner. Below a desk the words come first and the picture after. With `href` (a page
 * by kind, whose hero trip is no card) the photograph and its slip are one link to that trip.
 */
export function RoomHero({ label, heading, line, sentence, picture, note, href, back, children }: { label: string; heading: string; line: string; sentence: string; picture: { src: string; srcSet?: string; from: string; to: string }; note: string; href?: string; back?: ReactNode; children: ReactNode }) {
  const photo = (
    <>
      <span className="block rotate-[1.5deg] overflow-hidden rounded-[2rem] shadow-page-lift ring-8 ring-page-raised" style={{ background: `linear-gradient(160deg, ${picture.from} 0%, ${picture.to} 100%)` }}>
        <EagerImg
          src={picture.src}
          srcSet={picture.srcSet}
          sizes="(min-width: 1280px) 544px, (min-width: 1024px) 480px, 100vw"
          alt=""
          width={1600}
          height={1200}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="block aspect-[4/3] w-full object-cover"
        />
      </span>
      <span data-line className="absolute -bottom-4 left-2 -rotate-[4deg] rounded-2xl bg-page-raised px-4 py-2.5 font-hand text-[1.45rem] leading-none text-page-accent shadow-page-card decoration-1 underline-offset-4 group-hover:underline sm:-left-4">
        {note}
      </span>
    </>
  );
  return (
    <section className="relative">
      <ArtLayer items={DATE_HERO_ART} flowers={FLOWERS} />
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
        {href ? (
          <Link href={href} className="group relative mx-auto block w-full max-w-[34rem] rounded-[2rem] focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-page-ink">
            {photo}
          </Link>
        ) : (
          <div className="relative mx-auto w-full max-w-[34rem]">{photo}</div>
        )}
      </div>
    </section>
  );
}

/** A section: the short left column beside what it shows. On a desk the left column stays in view while the cards scroll past it. */
export function RoomSpread({ id, sectionId, label, heading, line, art, className, children }: { id: string; sectionId?: string; label: string; heading: string; line?: string; art?: readonly PlacedArt[]; className?: string; children: ReactNode }) {
  return (
    <section id={sectionId} className={sectionId ? "relative scroll-mt-24" : "relative"} aria-labelledby={id}>
      {art ? <ArtLayer items={art} flowers={FLOWERS} /> : null}
      <div className={cn(SPREAD, className ?? "py-12 sm:py-16 lg:pt-20 lg:pb-44")}>
        <div className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
          <Intro id={id} label={label} heading={heading} line={line} />
        </div>
        <div className="min-w-0 lg:pt-7">{children}</div>
      </div>
    </section>
  );
}

/** The last band: raised, with the soft curved top edge, and the halfway finder's lily lying across it. */
export function RoomFoot({ id, label, heading, line, children }: { id: string; label: string; heading: string; line?: string; children: ReactNode }) {
  return (
    <section className="relative" aria-labelledby={id}>
      <BandEdge side="top" className="text-page-raised" />
      <div className="relative -mt-px bg-page-raised">
        <ArtLayer items={HALFWAY_FOOT_ART} flowers={FLOWERS} />
        <div className={cn(SPREAD, "pt-12 pb-20 sm:pb-24 lg:pt-16 lg:pb-28")}>
          <Intro id={id} label={label} heading={heading} line={line} />
          <div className="min-w-0 lg:pt-7">{children}</div>
        </div>
      </div>
    </section>
  );
}
