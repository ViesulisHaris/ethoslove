import type { ReactNode } from "react";
import Image from "next/image";
import { ArrowRight, Play, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { GiftLocale } from "@/lib/gift/schema";
import { DEFAULT_PAGE_THEME } from "@/content/template-page-themes";
import { templateFilmStart } from "@/content/template-film-starts";
import type { TemplateManifest } from "@/templates/types";
import { ArtLayer } from "@/components/templates/page/art";
import { HERO_GRID, HERO_PHONE_BOX, HERO_PHONE_PLACE, HERO_SIZES, heroFlatlayArt } from "@/components/templates/page/hero-art";
import { HeroFlatlay } from "@/components/templates/page/hero-flatlay";
import { IdeasDots } from "@/components/templates/page/ideas-dots";
import type { PlacedArt } from "@/components/templates/page/placements";
import { Intro, POSTER_ROW, PosterLink, QUESTION_PLUS, QUESTION_ROW, QuestionRow, Raised, SPREAD } from "@/components/templates/page/sections";
import { CopyLine } from "./copy-line";
import { KeepCards } from "./keep-cards";
import { LevelCards } from "./level-cards";
import { HERO_ART, NEXT_ART } from "./placements";

/**
 * The pages built from a gift's page (docs/marketing/growth-build/DESIGN-LESS-TEXT.md, "built from
 * the gift page", 22 Nov 2026): /digital-cards, the gift pages by kind and the idea lists of the
 * occasion pages. Nothing here is designed again. The hero is a gift page's hero, with the phone
 * lying on its flowers and a gift's film in it; a section is the same spread (a label, a heading
 * and one line beside something to look at); the band, the questions and the last section are the
 * gift page's own components (components/templates/page/sections.tsx). What is new is one card:
 * a gift's poster and an idea's title, which opens to one line and a line to borrow in
 * handwriting, as the gift page's "What to write" cards first did.
 *
 * The colours are the site's own (DEFAULT_PAGE_THEME, the --page-* defaults of globals.css) and
 * the flowers its blush ones. No gift's theme is used here.
 */
export const SITE_FLOWERS = DEFAULT_PAGE_THEME.flowers;

/**
 * The page's wrapper. `data-page-theme` is what puts the footer and the header's button in the
 * page's colours and clips the flowers at the page's sides (globals.css); with no palette set on
 * it, the colours are the site's. `under` runs the ground up under the floating header, as a
 * gift's page does, for a page that starts with the hero.
 */
export function SitePage({ name, under = true, children }: { name: string; under?: boolean; children: ReactNode }) {
  return (
    <div data-page-theme={name} className={cn("relative isolate", under && "-mt-[var(--header-h)] pt-[var(--header-h)]")}>
      {children}
    </div>
  );
}

/** A small tag over the hero's heading, as a gift's page has for its price and styles. */
export function HeroTag({ strong = false, children }: { strong?: boolean; children: ReactNode }) {
  // Written out, not merged: tailwind-merge takes `text-page-label` (the label's type) for a colour and drops it beside one.
  return <span className={strong ? "rounded-[5px] border border-page-ink/70 px-2 py-1 text-page-label text-page-ink" : "rounded-[5px] border border-page-line px-2 py-1 text-page-label text-page-body"}>{children}</span>;
}

/**
 * (1) The hero: a gift page's hero. On the left the phone lying on flowers with the film of the
 * gift this page leads with, which plays when tapped; on the right the tags, the heading, one
 * italic line, one sentence and one button. Below `lg` the words come first and the phone after
 * them, as on a gift's page.
 */
export function SiteHero({
  manifest,
  locale,
  tags,
  label,
  heading,
  line,
  sentence,
  note,
  children,
}: {
  /** The gift whose film plays in the phone. */
  manifest: TemplateManifest;
  locale: GiftLocale;
  tags?: ReactNode;
  /** A small label inside the h1, over the heading: the words people search for, or the maker's mark. */
  label?: string;
  heading: string;
  line: string;
  sentence: string;
  /** One quiet line under the button. */
  note?: ReactNode;
  /** The button. */
  children: ReactNode;
}) {
  return (
    <section className="relative">
      <ArtLayer items={HERO_ART} flowers={SITE_FLOWERS} />
      {/* A phone on its side (wider than 640px, 480px tall at most) has room for five rows of words under the header, and the
          button was the sixth: there the gaps are a step tighter still, the heading a size down and the sentence the
          screen's width, so the button is on the first screen (the test of 23 Nov 2026). */}
      <div className={cn(HERO_GRID, "sm:max-lg:[@media(max-height:30rem)]:pt-5")}>
        <div className="lg:max-w-[33rem]">
          {/* On a phone the gaps are a step tighter, so the longest heading (the Spanish anniversary page's, four rows) still leaves the button on a 320×568 screen. */}
          {tags ? <div className="mb-5 flex flex-wrap items-center gap-2 sm:mb-7 sm:max-lg:[@media(max-height:30rem)]:mb-3">{tags}</div> : null}
          <h1>
            {label ? <span className="mb-3 block text-page-label text-page-body">{label}</span> : null}
            {/* Two blocks to the eye, and still two phrases to whatever reads the heading's text. */}
            {label ? " " : null}
            {/* A heading here is a phrase, not a gift's two-word name, so it is set a size down from a gift page's. */}
            <span className="block max-w-[14em] font-display text-[2rem] leading-[1.02] tracking-[-0.028em] text-balance text-page-ink sm:text-[clamp(2.25rem,4.5vw,3.75rem)] sm:max-lg:[@media(max-height:30rem)]:max-w-none sm:max-lg:[@media(max-height:30rem)]:text-[1.75rem]">{heading}</span>
          </h1>
          <p className="mt-3 font-display text-[clamp(1.3rem,2vw,1.6rem)] leading-snug text-page-body italic sm:mt-4 sm:max-lg:[@media(max-height:30rem)]:mt-2 sm:max-lg:[@media(max-height:30rem)]:text-[1.2rem]">{line}</p>
          <p className="mt-4 max-w-[31rem] text-base leading-relaxed text-page-body sm:mt-6 sm:max-lg:[@media(max-height:30rem)]:mt-2.5 sm:max-lg:[@media(max-height:30rem)]:max-w-none">{sentence}</p>
          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:max-lg:[@media(max-height:30rem)]:mt-4">{children}</div>
          {/* On a desk the note stops short of the lily that leans in at the hero's right: priced in dollars ("11,99 US$")
              the Spanish note ran one line to 1,274px and into the flower (the deep test of 23 Nov 2026). */}
          {note ? <p className="mt-4 max-w-[31rem] text-sm leading-relaxed text-page-body lg:max-w-[28rem]">{note}</p> : null}
        </div>
        <div className={HERO_PHONE_BOX}>
          <HeroFlatlay
            slug={manifest.slug}
            name={manifest.name[locale]}
            locale={locale}
            art={heroFlatlayArt(SITE_FLOWERS)}
            preview={manifest.thumbnail.webm}
            frame={{ from: templateFilmStart(manifest.slug) }}
            width="var(--hero-phone)"
            up="var(--fl-up)"
            down="var(--fl-down)"
            sizes={HERO_SIZES}
            className={HERO_PHONE_PLACE}
          />
        </div>
      </div>
    </section>
  );
}

/** A quiet text link: 44px to a thumb, underlined in the page's hairline. */
export const QUIET_LINK = "inline-flex min-h-11 items-center text-[0.9375rem] text-page-ink underline decoration-page-line underline-offset-4 transition-colors hover:decoration-page-ink active:text-page-accent";

/** The strong text link of an opened card: the one way into the editor. */
const CARD_LINK = "inline-flex min-h-11 items-center gap-1.5 text-[0.9375rem] font-medium text-page-accent underline-offset-4 hover:underline active:text-page-accent-hover";

/**
 * One picture card: a gift, and an idea for it.
 * - `title`: the idea, at most nine words.
 * - `line`: the one line the card opens to.
 * - `borrow`: a line to type into the gift, shown in handwriting under the name of the field it goes in. Where the
 *   field is a run of short lines (the bubbles of a Text Thread), `text` holds the first few, one to a row.
 *   `whole` is the line as it was written for the field, where the card shows only its opening: what "Copy" takes.
 * - `also`: other gifts of the same kind, linked by name.
 * - `full`: the idea in full, kept in a closed row inside the opened card.
 */
export type IdeaCard = {
  manifest: TemplateManifest;
  title: string;
  line: string;
  borrow?: { where: string; text: string; whole?: string };
  also?: readonly TemplateManifest[];
  full?: string;
  /** Where "Make this gift" goes: the gift's editor, with the page's ref. */
  make: string;
  /** Says the idea can be sent free, where it can: the idea, not only its template (content/idea-cards.ts, kindIdeaIsFree). */
  free?: boolean;
};

/** `copy` and `copied` are the two states of the button beside a line to borrow: "Copy", then "Copied". */
export type IdeaCardLabels = { make: string; watch: string; free: string; also?: string; full?: string; copy?: string; copied?: string };

/**
 * How wide a card's picture is drawn, for the browser's choice of file. Under 640px one card is a
 * screen wide; from 640px two stand side by side; from 1152px the spread's right column holds
 * three, each 240px or a little more, and from 1280px a card is 250px at most. Three across began
 * at 1024px once, where a card was 197px: a title ran to five rows and an opened card was 1,269px
 * tall (the test of 23 Nov 2026), so a laptop or a tablet on its side keeps two until three fit.
 * The set of five is two, then three (from 768px), then five across.
 */
const CARD_SIZES = {
  3: "(min-width: 1280px) 250px, (min-width: 1152px) 22vw, (min-width: 1024px) 32vw, (min-width: 640px) 45vw, 92vw",
  5: "(min-width: 1280px) 250px, (min-width: 768px) 31vw, (min-width: 640px) 45vw, 92vw",
} as const;

/**
 * How many cards stand in a row. Whole class names, so Tailwind finds them.
 * - Three: two from 640px, three from 1152px. A short last row is centred under the full ones, as the five kinds
 *   are: seven ideas left the seventh alone at the left with two empty places beside it (the deep test of 23 Nov
 *   2026). The grid is of half-columns, every card takes two, and the short row's first card starts one half-column
 *   in per empty place (shortRow).
 * - Five (exactly five cards: the kinds of /digital-cards): no row is left with an empty place. Two
 *   and two with the fifth centred under them, then from 768px three with the last two centred
 *   under them, then from 1280px, where a card is wide enough to be opened and read, five across.
 *   The centring is a grid of half-columns: every card takes two, and the first card of the short
 *   row starts one half-column in.
 */
const CARD_COLUMNS = {
  3: "sm:grid-cols-4 sm:[&>li]:col-span-2 min-[72rem]:grid-cols-6",
  5: "sm:grid-cols-4 sm:[&>li]:col-span-2 sm:max-md:[&>li:nth-child(5)]:col-start-2 md:grid-cols-6 md:max-xl:[&>li:nth-child(4)]:col-start-2 xl:grid-cols-5 xl:[&>li]:col-span-1",
} as const;

/** The classes that centre the short last row of a set of three-across cards: at two across (640px to 1152px) and at three. */
function shortRow(count: number): string {
  return cn(count % 2 === 1 && "sm:max-[72rem]:[&>li:last-child]:col-start-2", count % 3 === 1 && "min-[72rem]:[&>li:last-child]:col-start-3", count % 3 === 2 && "min-[72rem]:[&>li:nth-last-child(2)]:col-start-2");
}

/**
 * A set of picture cards. A closed card is a picture and a title: the gift's poster, its name and
 * the idea. It opens (a native <details>, so what it holds is in the HTML and it works without
 * script) to one line, the line to borrow in handwriting, and the two ways on: into the editor,
 * and to watch the gift play. One card of a set is open at a time. Under those, where a page has
 * the idea written out in full, a closed row holds it: the paragraph the first version printed for
 * every idea is no longer on show, and is still in the HTML for whoever wants all of it and for
 * search (DESIGN-LESS-TEXT.md: "longer words that search needs go in a native <details>").
 *
 * On a phone a set of cards is never shown all at once (the owner, 22 Nov 2026: six stacked cards
 * "looks clustered… a swipe function where you only see one at a time"): under 640px the set is
 * one row, one card to a screen, swiped sideways, with the gift page's dots under it. From 640px
 * it is a grid: `columns` is how many across on a desk.
 *
 * In the grid a row of closed cards ends on one line: every card is as tall as the tallest of its
 * row, however many lines its title or its gift's name runs to (a three-line title beside a
 * one-line one left the row ragged, and no fixed room for the title holds at every width and in
 * both languages). While a card is open the row is no longer stretched, so the open one grows
 * alone and its neighbours are not pulled down beside it (one selector, `:has()`); and every card
 * is held at the height its row had closed (level-cards.tsx), so a card nobody touched does not
 * move. Without script, each card keeps its own height, as before.
 *
 * The selector says "while a card is open, not stretched", not "while none is open, stretched": a
 * `:not(:has())` made the browser look the whole page over again each time anything was added to
 * it, which on a slow phone held every press back (performance pass, 24 Nov 2026).
 */
export function IdeaCards({ id, cards, locale, labels, columns = 3 }: { id: string; cards: readonly IdeaCard[]; locale: GiftLocale; labels: IdeaCardLabels; columns?: 3 | 5 }) {
  return (
    <div className="min-w-0">
      <ul
        id={id}
        data-cards
        className={cn(
          "-mx-5 flex snap-x snap-mandatory scroll-px-5 items-start gap-5 overflow-x-auto px-5 scrollbar-none sm:mx-0 sm:grid sm:snap-none sm:gap-x-5 sm:gap-y-6 sm:overflow-visible sm:px-0",
          // A card of its own, not the closed row inside one: "the idea in full" stays open in a card that is shut, and the
          // row was left unstretched after that card closed (the deep test of 23 Nov 2026).
          "sm:items-stretch sm:has-[>li>details[open]]:items-start",
          CARD_COLUMNS[columns],
          columns === 3 && shortRow(cards.length),
        )}
      >
        {cards.map((card) => {
          const name = card.manifest.name[locale];
          return (
            <li key={card.manifest.slug} data-card className="w-full shrink-0 snap-start sm:w-auto">
              {/* The card's heading, for whoever moves through a page by its headings. A heading inside <summary> is lost: the
                  summary is exposed as a button, and a button's contents are read as its name only (the check of 22 Nov 2026).
                  The title a reader sees is in the summary, so the card is still pressed by its words. */}
              <h3 className="sr-only">{card.title}</h3>
              <details name={`${id}-open`} className="group/card rounded-[1.25rem] border border-page-line bg-page-raised shadow-page-card transition-shadow duration-300 hover:shadow-page-lift open:shadow-page-lift motion-reduce:transition-none sm:h-full">
                {/* As tall as its card, with its rows packed at the top: the plus stays in the card's corner when the card is taller than its words. */}
                <summary className="relative grid cursor-pointer list-none content-start rounded-[1.25rem] outline-offset-4 active:opacity-90 sm:h-full [&::-webkit-details-marker]:hidden">
                  {/* On a phone the one card showing is a screen wide, so its picture is cropped squarer and the title stays on the screen with it.
                      A phone on its side is the same case from the other end: two cards across, and a tall poster alone was taller than the screen. */}
                  <span className="relative block aspect-[5/4] overflow-hidden rounded-t-[1.2rem] bg-page-band sm:aspect-[4/5] sm:max-lg:[@media(max-height:30rem)]:aspect-[3/2]">
                    {/* What the poster shows, in the gift's own words. Its name is the next thing read, so it is not said here too. */}
                    <Image src={card.manifest.thumbnail.poster} alt={card.manifest.tagline[locale]} fill sizes={CARD_SIZES[columns]} className="object-cover object-[50%_32%]" />
                  </span>
                  <span className="block px-5 pt-4 text-page-label text-page-body">
                    {name}
                    {card.free ? <span className="text-page-accent"> · {labels.free}</span> : null}
                  </span>
                  <span data-card-title className="mt-2 block px-5 pr-10 pb-5 font-display text-[1.25rem] leading-[1.18] text-page-ink">
                    {card.title}
                  </span>
                  <Plus aria-hidden="true" className="absolute right-4 bottom-5 size-4 text-page-body transition-transform duration-200 group-open/card:rotate-45 motion-reduce:transition-none" strokeWidth={1.6} />
                </summary>
                <div data-reveal className="px-5 pb-4">
                  <p className="border-t border-page-line pt-4 text-[0.9375rem] leading-relaxed text-page-body">{card.line}</p>
                  {card.borrow ? (
                    // The field's name with "Copy" beside it, and the line under them. Where the card is narrow (a phone, or three
                    // across on a desk) a long field's name in spaced capitals ran to four rows beside "Copy" (the deep test of
                    // 23 Nov 2026): there the name has the whole row, and "Copy" goes under the line it copies.
                    <div className="mt-4 @container">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
                        <p className="text-page-label text-page-body @max-[20rem]:col-span-2">{card.borrow.where}</p>
                        {labels.copy && labels.copied ? (
                          <CopyLine text={card.borrow.whole ?? card.borrow.text} label={labels.copy} done={labels.copied} field={card.borrow.where} className="col-start-2 row-start-1 @max-[20rem]:row-start-3 @max-[20rem]:my-0 @max-[20rem]:mt-1 @max-[20rem]:justify-self-end" />
                        ) : null}
                        {/* A run of bubbles keeps its rows, a little apart, so a bubble that wraps is still one bubble. */}
                        <p data-line className="col-span-2 mt-1.5 font-hand text-[1.45rem] leading-[1.15] text-page-ink">
                          {card.borrow.text.split("\n").map((row, i) => (
                            <span key={row} className={cn("block", i > 0 && "mt-2")}>
                              {row}
                            </span>
                          ))}
                        </p>
                      </div>
                    </div>
                  ) : null}
                  {card.also && card.also.length > 0 ? (
                    // A sentence of names, each a link a thumb can hit: its height is padding, so the rows of the sentence stay 32px apart.
                    <p className="mt-3 text-[0.9375rem] leading-8 text-page-body">
                      {labels.also}{" "}
                      {card.also.map((m, i) => (
                        <span key={m.slug}>
                          {i > 0 ? ", " : null}
                          <Link href={`/templates/${m.slug}`} className="py-[0.8125rem] text-page-ink underline decoration-page-line underline-offset-4 hover:decoration-page-ink">
                            {m.name[locale]}
                          </Link>
                        </span>
                      ))}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-x-5">
                    <Link href={card.make} data-testid="idea-make" className={CARD_LINK}>
                      {labels.make}
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                    {/* Named by the words on it and then the gift: a voice-control user says what the button says (WCAG 2.5.3). */}
                    <Link href={`/demo/${card.manifest.slug}`} data-testid="idea-watch" aria-label={`${labels.watch}: ${name}`} className={cn(CARD_LINK, "font-normal text-page-ink")}>
                      <Play aria-hidden="true" className="size-3.5 fill-current" />
                      {labels.watch}
                    </Link>
                  </div>
                  {card.full && labels.full ? (
                    <details data-idea-full className="group/full mt-1 border-t border-page-line">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-sm text-[0.9375rem] text-page-body outline-offset-2 hover:text-page-ink active:opacity-80 [&::-webkit-details-marker]:hidden">
                        {labels.full}
                        <Plus aria-hidden="true" className="size-3.5 shrink-0 transition-transform duration-200 group-open/full:rotate-45 motion-reduce:transition-none" strokeWidth={1.6} />
                      </summary>
                      <p data-reveal className="pb-2 text-[0.9375rem] leading-relaxed text-page-body">
                        {card.full}
                      </p>
                    </details>
                  ) : null}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
      <IdeasDots target={id} count={cards.length} className="mt-4 sm:hidden" />
      <LevelCards target={id} />
      <KeepCards target={id} />
    </div>
  );
}

/** A section that is the spread: the left column's words beside `children`, with the loose art of the section round it. */
export function Spread({ id, label, heading, line, intro, art, className, children }: { id: string; label: string; heading: string; line?: string; intro?: ReactNode; art?: readonly PlacedArt[]; className?: string; children: ReactNode }) {
  return (
    <section className="relative" aria-labelledby={id}>
      {art ? <ArtLayer items={art} flowers={SITE_FLOWERS} /> : null}
      <div className={cn(SPREAD, className)}>
        {/* Twelve picture cards are four rows and two screens tall, and beside them the heading's column stood empty from
            the second row down. So on a desk the heading stays in view under the site's header while its cards scroll
            past, and stops with the section's foot. Beside a short column it has nowhere to go and is where it was. */}
        <div className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
          <Intro id={id} label={label} heading={heading} line={line}>
            {intro}
          </Intro>
        </div>
        {children}
      </div>
    </section>
  );
}

/**
 * A closed block at the foot of the questions: the longer words the page no longer shows and a
 * search still needs (at most 180 words, tests/unit/spread-budget.test.ts), as "More about" is on
 * a gift's page.
 */
export function MoreRow({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details data-more-about className="group border-b border-page-line">
      <summary className={cn(QUESTION_ROW, "text-page-body")}>
        {summary}
        <Plus aria-hidden="true" className={QUESTION_PLUS} strokeWidth={1.6} />
      </summary>
      <div data-reveal className="flex max-w-2xl flex-col gap-3 pr-8 pb-5 text-[0.9375rem] leading-relaxed text-page-body">
        {children}
      </div>
    </details>
  );
}

/** (…) Questions: the closed list, a plus on each row, every answer in the HTML. `children` are the closed blocks under it. */
export function QuestionsSpread({
  id,
  name,
  label,
  heading,
  line,
  faq,
  before,
  art,
  className = "pt-16 pb-20 sm:pt-20 lg:pt-28 lg:pb-44",
  children,
}: {
  id: string;
  name: string;
  label: string;
  heading: string;
  line?: string;
  faq: readonly { q: string; a: string }[];
  /** Closed rows that come before the questions: an occasion's three how-tos. */
  before?: ReactNode;
  art?: readonly PlacedArt[];
  /** The section's own room above and below. The default leaves the foot the lily of the last section lies across. */
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Spread id={id} label={label} heading={heading} line={line} art={art} className={className}>
      <div className="border-t border-page-line">
        {before}
        {faq.map((item) => (
          <QuestionRow key={item.q} q={item.q} a={item.a} name={name} />
        ))}
        {children}
      </div>
    </Spread>
  );
}

/** One poster of the last section: a page, shown by the gift it leads with. */
export type PosterPage = { href: string; label: string; manifest: TemplateManifest };

/**
 * The page's last section, as "More like this" on a gift's page: four tall posters, each the way
 * to a neighbouring page, and under them one row of quiet links to the rest.
 */
export function WhereNext({ id, label, heading, posters, locale, navLabel, links }: { id: string; label: string; heading: string; posters: readonly PosterPage[]; locale: GiftLocale; navLabel: string; links: readonly { href: string; label: string }[] }) {
  return (
    <Raised labelledBy={id} flowers={SITE_FLOWERS} art={NEXT_ART}>
      <Intro id={id} label={label} heading={heading} />
      <nav aria-label={navLabel}>
        <ul className={POSTER_ROW}>
          {posters.map((page) => (
            <li key={page.href}>
              <PosterLink href={page.href} poster={page.manifest.thumbnail.poster} alt={page.manifest.tagline[locale]} label={page.label} />
            </li>
          ))}
        </ul>
        {links.length > 0 ? (
          <ul className="mt-9 flex flex-wrap gap-x-7 gap-y-0 border-t border-page-line pt-4">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={QUIET_LINK}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </nav>
    </Raised>
  );
}
