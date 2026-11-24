import Image from "next/image";
import type { ReactNode } from "react";
import { Check, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { SAMPLE_PHOTO, artSrcSet, pageArt, slotStyle } from "@/content/page-art";
import { DEFAULT_PAGE_THEME, pageThemeChromeCss, pageThemeStyle } from "@/content/template-page-themes";
import type { TemplateManifest } from "@/templates/types";
import { CutoutImg } from "@/components/marketing/home/cutouts";
import { ArtLayer, BandEdge } from "@/components/templates/page/art";
import { COVER_RATIO, COVER_SHAPE, CoverInScreen } from "@/components/templates/page/cover-in-screen";
import { Intro, SPREAD } from "@/components/templates/page/spread";
import { PRESS_FOOT_ART, PRESS_NUMBERS_ART } from "./placements";

/**
 * The pieces of the press page (/press, "Ethos in numbers"), laid out as a gift's page is
 * (docs/marketing/growth-build/DESIGN-LESS-TEXT.md): spreads of a short left column beside
 * something to look at, on the site's own palette and blush lilies. The hero, the band and the
 * questions are the gift page's own (components/templates/page/sections.tsx), rebuilt here with
 * this page's contents, since that file is the approved gift page and is not changed for this one.
 */

/** The key of this page's colours on <body> (content/template-page-themes.ts, pageThemeChromeCss). */
const THEME = "press";
const FLOWERS = DEFAULT_PAGE_THEME.flowers;

/**
 * A quiet link in a row: underlined, and a thumb's target each way. The target reaches past the
 * word by the same 8px on both sides (px-2 taken back by -mx-2), so the row's gaps stay even; a
 * word narrower than 28px ("Etsy" is about 30) still gets 44px, centred, never padded on one side.
 */
export const PRESS_LINK =
  "-mx-2 inline-flex min-h-11 min-w-11 items-center justify-center px-2 text-[0.9375rem] text-page-ink underline decoration-page-line underline-offset-4 transition-colors hover:decoration-page-ink active:text-page-accent";
/** The page's one filled button (a gift page's "Make this gift"). */
export const PRESS_BUTTON =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-page-accent px-6 text-base font-medium text-page-on-accent shadow-[0_14px_28px_-16px_var(--page-accent)] transition-[background-color,translate,scale] duration-200 ease-(--ease-out-quint) hover:bg-page-accent-hover active:scale-[0.98] pointer-fine:hover:-translate-y-px motion-reduce:transition-none";

/** The page's wrapper: the site's own palette on the page tokens, the ground run up under the floating header. */
export function PressPage({ children }: { children: ReactNode }) {
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
 * (1) The words on the left, the phone on lilies on the right; below `lg` the words first and the picture after,
 * except on a phone on its side (wider than 640px, landscape, under 520px tall), where the picture
 * stands beside the words too, so the first screen is not words alone with the button half under its foot.
 */
export function PressHero({ maker, heading, line, sentence, poster, posterAlt, children }: { maker: string; heading: string; line: string; sentence: string; poster: string; posterAlt: string; children: ReactNode }) {
  return (
    <section className="relative" aria-labelledby="press-title">
      <div className={cn("container-x relative grid items-center gap-y-6 pt-5 pb-14 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-x-14 lg:pt-14 lg:pb-20 xl:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]", "sm:landscape:[@media(max-height:520px)]:grid-cols-[minmax(0,1fr)_minmax(0,15rem)] sm:landscape:[@media(max-height:520px)]:gap-x-8 sm:landscape:[@media(max-height:520px)]:pt-3 sm:landscape:[@media(max-height:520px)]:pb-10")}>
        <div className="lg:max-w-[33rem]">
          {/* The maker's mark, as the brief places it: over the heading, not in it.
              On a phone the mark, the heading and the italic line each keep one height whichever
              face draws them, so nothing under them moves when the fonts arrive on a slow network:
              the label's stand-in face is about a quarter wider than JetBrains Mono and the italic's
              a few per cent wider than Newsreader's, enough to wrap a line that the real face keeps
              whole. Two lines are kept for the mark (set at their foot, the space falls above it)
              and the italic line, and the heading is a size that fits one line in both faces. */}
          <p data-maker className="text-page-label text-page-body max-sm:flex max-sm:min-h-[2lh] max-sm:items-end">
            {maker}
          </p>
          <h1 id="press-title" className={cn("mt-3 font-display text-[2.5rem] leading-[1.02] tracking-[-0.028em] text-balance text-page-ink max-[359px]:text-[2.25rem] sm:text-[clamp(2.75rem,5vw,4.25rem)]", "sm:landscape:[@media(max-height:520px)]:mt-2 sm:landscape:[@media(max-height:520px)]:text-[2.5rem]")}>
            {heading}
          </h1>
          <p data-hero-line className="mt-3 font-display text-[clamp(1.3rem,2vw,1.6rem)] leading-snug text-page-body italic max-sm:min-h-[2lh] sm:mt-4">
            {line}
          </p>
          <p className={cn("mt-4 max-w-[31rem] text-base leading-relaxed text-page-body sm:mt-6", "sm:landscape:[@media(max-height:520px)]:mt-3")}>{sentence}</p>
          <div className={cn("mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap", "sm:landscape:[@media(max-height:520px)]:mt-5")}>{children}</div>
        </div>
        <PressFlatlay poster={poster} alt={posterAlt} />
      </div>
    </section>
  );
}

/**
 * The page art's phone on lilies, with the most-made gift's cover in its screen under the render's
 * own rim. The cover is drawn whole over a soft copy of itself, as CoverInScreen does on a gift's
 * page, but here it carries its name for a screen reader: it is the page's one picture of a card.
 * The cover is laid beside the art's `data-decor` span, not inside it, so the design spec counts
 * it as a real picture.
 */
function PressFlatlay({ poster, alt }: { poster: string; alt: string }) {
  const art = pageArt("hero-flatlay", FLOWERS);
  const screen = art.slots.screen;
  const sizes = "(min-width: 1280px) 544px, (min-width: 1024px) 480px, (min-width: 640px) 448px, 86vw";
  return (
    <div data-flatlay="press" className={cn("relative mx-auto w-full max-w-[21.5rem] sm:max-w-[28rem] lg:max-w-none", "sm:landscape:[@media(max-height:520px)]:max-w-[15rem]")} style={{ aspectRatio: `${art.width} / ${art.height}` }}>
      <span data-decor="hero-flatlay" className="absolute inset-0 block">
        <CutoutImg src={art.src1x} srcSet={artSrcSet(art)} sizes={sizes} width={art.width} height={art.height} eager className="block w-full" />
      </span>
      {screen ? (
        <div className="absolute overflow-hidden bg-night [container-type:inline-size]" style={slotStyle(art, screen)}>
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 block scale-125 blur-[7cqw]">
            <Image src={poster} alt="" width={COVER_SHAPE[0] * 4} height={COVER_SHAPE[1] * 4} sizes="48px" quality={60} loading="eager" className="absolute inset-0 block size-full object-cover" />
          </span>
          <span className="hero-cover absolute top-1/2 left-0 block w-full -translate-y-1/2" style={{ aspectRatio: COVER_RATIO }}>
            {/* The page's largest picture on first paint, and the soft copy under it: loaded at once, as the hero's lilies are. */}
            <Image src={poster} alt={alt} fill sizes="(min-width: 1024px) 200px, 40vw" loading="eager" fetchPriority="high" className="object-contain" />
          </span>
        </div>
      ) : null}
      {art.bezel ? (
        <span data-decor="hero-flatlay-bezel" className="pointer-events-none absolute inset-0 block">
          <CutoutImg src={art.bezel.src1x} srcSet={`${art.bezel.src1x} ${art.width1x}w, ${art.bezel.src} ${art.width}w`} sizes={sizes} width={art.width} height={art.height} eager className="block w-full" />
        </span>
      ) : null}
    </div>
  );
}

export type PressFigureRow = { id: string; value: string; label: string; counts: string };

/**
 * (2) The figures: unboxed columns with a hairline over each, as the questions are drawn: two to a
 * row on a phone and up to a desk, three from 1280px, so six figures make two whole rows. Never
 * boxed cards: each figure carries a sentence, and a card is never a paragraph (DESIGN-LESS-TEXT.md).
 */
export function PressFigures({ label, heading, line, figures, asOf, day }: { label: string; heading: string; line: string; figures: PressFigureRow[]; asOf: string; day: string }) {
  return (
    <section id="numbers" className="relative scroll-mt-24" aria-labelledby="press-numbers">
      <ArtLayer items={PRESS_NUMBERS_ART} flowers={FLOWERS} />
      <div className={cn(SPREAD, "py-12 sm:py-16 lg:py-20")}>
        <Intro id="press-numbers" label={label} heading={heading} line={line} />
        <div className="min-w-0 lg:pt-7">
          <dl data-figures className="grid grid-cols-2 gap-x-5 sm:gap-x-8 sm:gap-y-2 xl:grid-cols-3 xl:gap-x-10">
            {figures.map((f) => (
              <div key={f.id} data-pick data-figure={f.id} className="flex min-w-0 flex-col border-t border-page-line pt-5 pb-4 sm:pt-6">
                <dt className="order-2 mt-2 text-[0.9375rem] font-medium text-page-ink">{f.label}</dt>
                <dd data-value className="order-1 font-display text-[clamp(2rem,9vw,2.5rem)] leading-none tracking-[-0.03em] text-page-ink tabular-nums sm:text-[clamp(2.75rem,5vw,3.5rem)]">
                  {f.value}
                </dd>
                <dd data-counts className="order-3 mt-2 text-sm leading-relaxed text-page-body">
                  {f.counts}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-sm text-page-body">
            <time dateTime={day}>{asOf}</time>
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * (3) The five most-made templates: five covers in a row from `sm`; on a phone a still list, each
 * row a small cover beside its place, name and share, so all five are seen at once with nothing to
 * swipe and no dots (DESIGN-LESS-TEXT.md). Each cover is drawn whole, in the shape it is recorded in
 * (13:20), so no title on it is cut; its place in the list stands before its name, never over the picture.
 */
export function PressMostMade({ label, heading, line, shareOf, cards, locale }: { label: string; heading: string; line: string; shareOf: string; cards: { manifest: TemplateManifest; share: string }[]; locale: "en" | "es" }) {
  const row = "press-most-made";
  return (
    <section className="relative" aria-labelledby="press-made">
      <div className={cn(SPREAD, "pt-6 pb-16 sm:pb-20 lg:pt-10 lg:pb-28")}>
        <Intro id="press-made" label={label} heading={heading} line={line} />
        <div className="min-w-0 lg:pt-7">
          <ol id={row} className="flex flex-col gap-3 pt-1 sm:grid sm:grid-cols-5 sm:gap-x-3 lg:gap-x-5">
            {cards.map(({ manifest: m, share }, i) => (
              <li key={m.slug} data-card data-pick className="relative">
                {/* On a desk a column to the row's full height, the share at its foot: a name that wraps never pushes its share below the others.
                    Heard as "The Letter 32% of cards made": the bare per cent says what it is a share of, with no words added to the page. */}
                <Link href={`/templates/${m.slug}`} aria-label={`${m.name[locale]} ${share} ${shareOf}`} className="group flex items-center gap-4 rounded-[0.875rem] sm:h-full sm:flex-col sm:items-stretch sm:gap-0 sm:rounded-[1.25rem]">
                  <span style={{ aspectRatio: COVER_RATIO }} className="relative block w-[4.75rem] shrink-0 overflow-hidden rounded-[0.875rem] bg-page-band shadow-page-card transition-[translate,box-shadow] duration-300 ease-(--ease-out-quint) group-hover:-translate-y-1 group-hover:shadow-page-lift group-active:translate-y-0 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 sm:w-auto sm:rounded-[1.25rem]">
                    {/* The name says what the link is; the cover is for the eye. */}
                    <Image src={m.thumbnail.poster} alt="" fill sizes="(min-width: 1280px) 150px, (min-width: 640px) 18vw, 76px" className="object-cover" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-baseline gap-2 font-display text-[1.125rem] leading-tight sm:mt-3.5 sm:text-[1.0625rem]">
                      {/* The list is an <ol>, which says the order; the number is for the eye. */}
                      <span aria-hidden="true" className="text-page-body tabular-nums">
                        {i + 1}
                      </span>
                      <span data-card-title className="block text-page-ink">
                        {m.name[locale]}
                      </span>
                    </span>
                    <span data-share className="block pt-1.5 text-sm text-page-body tabular-nums sm:mt-auto">
                      {share}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/** (4) The deeper band with soft curved edges: a large phone on lilies with a polaroid, and what a writer needs to get the name right. */
export function PressArticle({ label, heading, checks, poster, children }: { label: string; heading: string; checks: string[]; poster: string; children: ReactNode }) {
  const art = pageArt("experience-flatlay", FLOWERS);
  const { photo, screen } = art.slots;
  const sizes = "(min-width: 1024px) 50vw, (min-width: 640px) 80vw, 66vw";
  return (
    <section className="relative" aria-labelledby="press-article">
      <BandEdge side="top" className="text-page-band" />
      <div className="relative isolate -mt-px bg-page-band [clip-path:inset(-24rem_0_0_0)]">
        <div className="container-x grid items-center gap-y-6 pt-4 pb-20 sm:pb-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)] lg:gap-x-12 lg:pt-0 lg:pb-0">
          <div className="-mr-[7%] -ml-[21%] sm:mx-auto sm:w-[34rem] lg:-mt-6 lg:mr-[-4%] lg:-mb-[9%] lg:-ml-[24%] lg:w-auto">
            <div data-flatlay="press-article" className="relative" style={{ aspectRatio: `${art.width} / ${art.height}` }}>
              <span data-decor="experience-flatlay" className="absolute inset-0 block">
                <CutoutImg src={art.src1x} srcSet={artSrcSet(art)} sizes={sizes} width={art.width} height={art.height} className="block w-full" />
              </span>
              {screen ? (
                <div className="absolute overflow-hidden bg-night" style={slotStyle(art, screen)}>
                  <CoverInScreen poster={poster} sizes="(min-width: 1024px) 280px, 40vw" />
                </div>
              ) : null}
              {art.bezel ? <CutoutImg src={art.bezel.src1x} srcSet={`${art.bezel.src1x} ${art.width1x}w, ${art.bezel.src} ${art.width}w`} sizes={sizes} width={art.width} height={art.height} className="absolute inset-0 block w-full" /> : null}
              {photo ? (
                <div className="absolute overflow-hidden" style={slotStyle(art, photo)}>
                  <Image src={SAMPLE_PHOTO.src} alt="" fill sizes="(min-width: 1024px) 180px, 30vw" className="object-cover" />
                </div>
              ) : null}
            </div>
          </div>
          <div className="lg:py-24">
            <p className="text-page-label text-page-body">{label}</p>
            <h2 id="press-article" className="mt-4 display-xl text-balance text-page-ink">
              {heading}
            </h2>
            <ul className="mt-7 flex flex-col gap-3">
              {checks.map((check) => (
                <li key={check} className="flex items-start gap-3 text-[0.9375rem] leading-snug text-page-ink">
                  <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-page-accent" />
                  {check}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-x-6">{children}</div>
          </div>
        </div>
        <BandEdge side="bottom" className="absolute inset-x-0 -bottom-px z-10 text-page-ground" />
      </div>
    </section>
  );
}

/**
 * (5) How the counting is done: the gift page's closed rows, one open at a time, every answer in
 * the HTML. No `data-reveal` on the answers: inside a <details> near a screen's foot it would keep
 * an opened answer invisible. Tall on a desk on purpose: the next band's lily lies under its short
 * left column.
 */
export function PressMethod({ label, heading, faq }: { label: string; heading: string; faq: { q: string; a: string }[] }) {
  return (
    <section className="relative" aria-labelledby="press-method">
      <div className={cn(SPREAD, "pt-16 pb-20 sm:pt-20 lg:min-h-[38rem] lg:content-start lg:pt-24 lg:pb-52")}>
        <Intro id="press-method" label={label} heading={heading} />
        <div className="min-w-0 border-t border-page-line lg:mt-7">
          {faq.map((item) => (
            <details key={item.q} name="press-faq" className="group border-b border-page-line">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-4 text-left text-[0.9375rem] font-medium text-page-ink [&::-webkit-details-marker]:hidden">
                {item.q}
                <Plus aria-hidden="true" className="size-4 shrink-0 text-page-body transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" strokeWidth={1.6} />
              </summary>
              <p className="max-w-2xl pr-8 pb-5 text-[0.9375rem] leading-relaxed text-page-body">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** (6) How to reach the team: the finder page's last band, with the address as the one large link. */
export function PressContact({ label, heading, line, email, subject, children }: { label: string; heading: string; line: string; email: string; subject: string; children: ReactNode }) {
  return (
    <section id="contact" className="relative scroll-mt-24" aria-labelledby="press-contact">
      <BandEdge side="top" className="text-page-raised" />
      <div className="relative -mt-px bg-page-raised">
        <ArtLayer items={PRESS_FOOT_ART} flowers={FLOWERS} />
        <div className={cn(SPREAD, "pt-12 pb-20 sm:pb-24 lg:pt-16 lg:pb-28")}>
          <Intro id="press-contact" label={label} heading={heading} line={line} />
          <div className="min-w-0 lg:pt-7">
            <a
              data-press-mail
              href={`mailto:${email}?subject=${encodeURIComponent(subject)}`}
              className="inline-flex min-h-11 items-center font-display text-[clamp(1.5rem,3.4vw,2.25rem)] leading-tight text-page-ink underline decoration-page-line underline-offset-8 transition-colors [overflow-wrap:anywhere] hover:decoration-page-ink active:text-page-accent"
            >
              {email}
            </a>
            <ul className="mt-4 flex flex-wrap gap-x-6">{children}</ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Drawn outside PressPage (so the design spec, which reads inside [data-page-theme], never counts it), and only for the sample. */
export function SampleTag({ children }: { children: ReactNode }) {
  return (
    <p data-press-sample className="pointer-events-none fixed bottom-3 left-1/2 z-50 -translate-x-1/2 rounded-full bg-page-ink px-3 py-1.5 text-xs font-medium whitespace-nowrap text-page-ground">
      {children}
    </p>
  );
}
