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
  return <span className={cn("rounded-[5px] border px-2 py-1 text-page-label", strong ? "border-page-ink/70 text-page-ink" : "border-page-line text-page-body")}>{children}</span>;
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
      <div className={HERO_GRID}>
        <div className="lg:max-w-[33rem]">
          {tags ? <div className="mb-7 flex flex-wrap items-center gap-2">{tags}</div> : null}
          <h1>
            {label ? <span className="mb-3 block text-page-label text-page-body">{label}</span> : null}
            {/* A heading here is a phrase, not a gift's two-word name, so it is set a size down from a gift page's. */}
            <span className="block max-w-[14em] font-display text-[clamp(2.25rem,4.5vw,3.75rem)] leading-[1.02] tracking-[-0.028em] text-balance text-page-ink">{heading}</span>
          </h1>
          <p className="mt-4 font-display text-[clamp(1.3rem,2vw,1.6rem)] leading-snug text-page-body italic">{line}</p>
          <p className="mt-6 max-w-[31rem] text-base leading-relaxed text-page-body">{sentence}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">{children}</div>
          {note ? <p className="mt-4 max-w-[31rem] text-sm leading-relaxed text-page-body">{note}</p> : null}
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
 * - `borrow`: a line to type into the gift, shown in handwriting under the name of the field it goes in.
 * - `also`: other gifts of the same kind, linked by name.
 */
export type IdeaCard = {
  manifest: TemplateManifest;
  title: string;
  line: string;
  borrow?: { where: string; text: string };
  also?: readonly TemplateManifest[];
  /** Where "Make this gift" goes: the gift's editor, with the page's ref. */
  make: string;
  /** Says the gift can be sent free, where it can. */
  free?: boolean;
};

export type IdeaCardLabels = { make: string; watch: string; watchNamed: (name: string) => string; free: string; also?: string };

/**
 * A set of picture cards. A closed card is a picture and a title: the gift's poster, its name and
 * the idea. It opens (a native <details>, so what it holds is in the HTML and it works without
 * script) to one line, the line to borrow in handwriting, and the two ways on: into the editor,
 * and to watch the gift play. One card of a set is open at a time.
 *
 * On a phone a set of cards is never shown all at once (the owner, 22 Nov 2026: six stacked cards
 * "looks clustered… a swipe function where you only see one at a time"): under 640px the set is
 * one row, one card to a screen, swiped sideways, with the gift page's dots under it. From 640px
 * it is a grid: `columns` is how many across on a desk.
 */
export function IdeaCards({ id, cards, locale, labels, columns = 3 }: { id: string; cards: readonly IdeaCard[]; locale: GiftLocale; labels: IdeaCardLabels; columns?: 3 | 5 }) {
  return (
    <div className="min-w-0">
      <ul
        id={id}
        data-cards
        className={cn(
          "-mx-5 flex snap-x snap-mandatory scroll-px-5 items-start gap-5 overflow-x-auto px-5 scrollbar-none sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-x-5 sm:gap-y-6 sm:overflow-visible sm:px-0",
          columns === 5 ? "md:grid-cols-3 lg:grid-cols-5" : "lg:grid-cols-3",
        )}
      >
        {cards.map((card) => {
          const name = card.manifest.name[locale];
          return (
            <li key={card.manifest.slug} data-card className="w-full shrink-0 snap-start sm:w-auto">
              <details name={`${id}-open`} className="group/card rounded-[1.25rem] border border-page-line bg-page-raised shadow-page-card transition-shadow duration-300 hover:shadow-page-lift open:shadow-page-lift motion-reduce:transition-none">
                <summary className="relative grid cursor-pointer list-none rounded-[1.25rem] outline-offset-4 active:opacity-90 [&::-webkit-details-marker]:hidden">
                  {/* On a phone the one card showing is a screen wide, so its picture is cropped squarer and the title stays on the screen with it. */}
                  <span className="relative block aspect-[5/4] overflow-hidden rounded-t-[1.2rem] bg-page-band sm:aspect-[4/5]">
                    {/* The gift's name and tagline: what the poster shows, for image search and a screen reader. */}
                    <Image src={card.manifest.thumbnail.poster} alt={`${name}: ${card.manifest.tagline[locale]}`} fill sizes="(min-width: 1280px) 250px, (min-width: 640px) 45vw, 92vw" className="object-cover object-[50%_32%]" />
                  </span>
                  <span className="block px-5 pt-4 text-page-label text-page-body">
                    {name}
                    {card.free ? <span className="text-page-accent"> · {labels.free}</span> : null}
                  </span>
                  <h3 className="mt-2 px-5 pr-12 pb-5 font-display text-[1.25rem] leading-[1.18] text-page-ink">{card.title}</h3>
                  <Plus aria-hidden="true" className="absolute right-4 bottom-5 size-4 text-page-body transition-transform duration-200 group-open/card:rotate-45 motion-reduce:transition-none" strokeWidth={1.6} />
                </summary>
                <div data-reveal className="px-5 pb-4">
                  <p className="border-t border-page-line pt-4 text-[0.9375rem] leading-relaxed text-page-body">{card.line}</p>
                  {card.borrow ? (
                    <>
                      <p className="mt-4 text-page-label text-page-body">{card.borrow.where}</p>
                      <p data-line className="mt-1.5 font-hand text-[1.45rem] leading-[1.15] text-page-ink">
                        {card.borrow.text}
                      </p>
                    </>
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
                    <Link href={`/demo/${card.manifest.slug}`} data-testid="idea-watch" aria-label={labels.watchNamed(name)} className={cn(CARD_LINK, "font-normal text-page-ink")}>
                      <Play aria-hidden="true" className="size-3.5 fill-current" />
                      {labels.watch}
                    </Link>
                  </div>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
      <IdeasDots target={id} count={cards.length} className="mt-4 sm:hidden" />
    </div>
  );
}

/** A section that is the spread: the left column's words beside `children`, with the loose art of the section round it. */
export function Spread({ id, label, heading, line, intro, art, className, children }: { id: string; label: string; heading: string; line?: string; intro?: ReactNode; art?: readonly PlacedArt[]; className?: string; children: ReactNode }) {
  return (
    <section className="relative" aria-labelledby={id}>
      {art ? <ArtLayer items={art} flowers={SITE_FLOWERS} /> : null}
      <div className={cn(SPREAD, className)}>
        <Intro id={id} label={label} heading={heading} line={line}>
          {intro}
        </Intro>
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
