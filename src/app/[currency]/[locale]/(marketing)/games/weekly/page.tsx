import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/config/site";
import { WEEKLY_FAQ } from "@/content/game-pages";
import { DEFAULT_PAGE_THEME, PAGE_THEME_MARK, pageThemeChromeCss, pageThemeStyle } from "@/content/template-page-themes";
import { GAMES } from "@/lib/games/catalogue";
import { dayOf } from "@/lib/games/daily";
import { WEEKLY_SETS, weekOf, weeklyCards, weeklySet } from "@/lib/games/weekly";
import { breadcrumbNode, faqNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { JsonLd } from "@/components/shared/json-ld";
import { eitherOr } from "@/components/games/question-list";
import { TODAY_ART, TODAY_FLOWERS, TODAY_FOOT_ART } from "@/components/games/today/placements";
import { NowOnly, WhenText } from "@/components/games/weekly/in-view";
import { WeeklyChallenge } from "@/components/games/weekly/weekly-challenge";
import { WeeklyTogether } from "@/components/games/weekly/weekly-together";
import { ArtLayer, BandEdge } from "@/components/templates/page/art";
import { Intro, SPREAD } from "@/components/templates/page/spread";
import { DocumentMark } from "@/components/shared/document-mark";

type Props = PageProps<"/[currency]/[locale]/games/weekly">;

/**
 * The week turns on Monday at midnight UTC by itself, without a deploy: the page is rendered again
 * every five minutes, so last week's set is served for five minutes at most after the turn, and the
 * browser checks the week once it has loaded (the cards stay inert until it has). As /games/today.
 */
export const revalidate = 300;

/** The key of this page's colours on <body> (content/template-page-themes.ts, pageThemeChromeCss). */
const THEME = "games-weekly";
const PATH = "/games/weekly";

/** A quiet link in a row: underlined, and a thumb's target by its padding (today's question's). */
const QUIET_LINK = "py-[0.8125rem] text-page-ink underline decoration-page-line underline-offset-4 transition-colors hover:decoration-page-ink";

export async function generateMetadata({ params }: Omit<Props, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "games.weekly" });
  // No image: the site's generic card, which never carries a name or a pick.
  return pageMetadata({ locale, path: PATH, title: t("seoTitle"), description: t("seoDescription") });
}

/**
 * The weekly challenge: five cards on one theme, the same for everyone, new each Monday. Laid out as
 * today's question is (docs/marketing/growth-build/DESIGN-LESS-TEXT.md): a spread with the heading
 * on the left and the three picks on the right, one at a time; then a band with the question and
 * the dare to do together, and the ways into the whole games. On the cream, not on the games'
 * table. The server renders the week's first pick, its question and its dare as text, and all five
 * in a closed list; the link a person was sent is read in the browser, and nothing in it ever
 * reaches a server.
 */
export default async function WeeklyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = locale === "es" ? "es" : "en";
  const t = await getTranslations("games.weekly");
  const tg = await getTranslations("games");
  const root = await getTranslations();
  const theme = DEFAULT_PAGE_THEME;
  // The week the page is rendered with, as today's question reads its day: the browser checks it again once loaded.
  const week = weekOf(dayOf(new Date().getTime()));
  const cards = weeklyCards(weeklySet(week));
  const faq = WEEKLY_FAQ.map(({ q, a }) => ({ q: q[l], a: a[l].replace("{count}", String(WEEKLY_SETS.length)) }));
  const href = (key: "thisthat" | "deck" | "dare") => GAMES.find((g) => g.key === key)!.href;
  const five = [...cards.picks.map((p) => eitherOr(p.a[l], p.b[l], l)), cards.ask[l], cards.dare[l]];

  return (
    <>
      <JsonLd
        nodes={[
          breadcrumbNode([
            { name: SITE.name, url: localizedUrl(locale) },
            { name: root("nav.games"), url: localizedUrl(locale, "/games") },
            { name: t("label"), url: localizedUrl(locale, PATH) },
          ]),
          faqNode(faq),
        ]}
      />
      <style>{pageThemeChromeCss(THEME, theme)}</style>
      <DocumentMark on="body" name={PAGE_THEME_MARK} value={THEME} />
      <div data-page-theme={THEME} style={pageThemeStyle(theme)} className="relative isolate -mt-[var(--header-h)] pt-[var(--header-h)]">
        <section className="relative" aria-labelledby="weekly-title">
          <ArtLayer items={TODAY_ART} flowers={TODAY_FLOWERS} className="[@media(orientation:landscape)_and_(max-height:520px)]:hidden" />
          {/* The same spread as today's question, with its two tighter forms: a small phone (320 by 568) keeps the heading and both cards on the first screen (the line under the heading waits on a taller one), and a phone on its side is the two columns too. */}
          <div className={cn(SPREAD, "gap-y-6 pt-3 pb-24 [@media(orientation:portrait)_and_(max-height:600px)]:gap-y-4 [@media(orientation:portrait)_and_(max-height:600px)]:[&_h1+p]:hidden sm:gap-y-9 sm:pt-10 lg:content-start lg:items-start lg:pt-14 lg:pb-6", "[@media(orientation:landscape)_and_(max-height:520px)]:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] [@media(orientation:landscape)_and_(max-height:520px)]:items-start [@media(orientation:landscape)_and_(max-height:520px)]:gap-x-8 [@media(orientation:landscape)_and_(max-height:520px)]:pt-2!")}>
            {/* The server's words are this week's; a link from another week turns them to that week's in the browser. */}
            <Intro level={1} id="weekly-title" label={t("label")} heading={<WhenText now={t("h1")} last={t("h1Last")} older={t("h1Older")} />} line={t("line")} />
            <div className="min-w-0 lg:pt-7">
              <WeeklyChallenge week={week} />
            </div>
          </div>
        </section>

        <section className="relative" aria-labelledby="weekly-together">
          <BandEdge side="top" className="text-page-raised" />
          <div className="relative -mt-px bg-page-raised">
            <ArtLayer items={TODAY_FOOT_ART} flowers={TODAY_FLOWERS} />
            <div className={cn(SPREAD, "pt-12 pb-14 lg:pt-16")}>
              <Intro id="weekly-together" label={t("together.label")} heading={t("together.heading")} line={<WhenText now={t("together.line")} last={t("together.lineThen")} older={t("together.lineThen")} />} />
              <div className="min-w-0 lg:pt-7">
                <WeeklyTogether week={week} labels={{ ask: t("together.ask"), dare: t("together.dare") }} />
              </div>
            </div>
            <div className={cn(SPREAD, "pb-20 sm:pb-24 lg:pb-28")}>
              <Intro id="weekly-more" label={t("more.label")} heading={t("more.heading")} line={t("more.line")} />
              <div className="min-w-0 lg:pt-7">
                <ul className="flex flex-wrap gap-x-6 leading-8">
                  {(["thisthat", "deck", "dare"] as const).map((key) => (
                    <li key={key}>
                      <Link href={href(key)} className={cn(QUIET_LINK, key === "thisthat" && "font-medium")}>
                        {tg(`${key}.title`)}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link href="/games/today" className={QUIET_LINK}>
                      {tg("hub.todayTitle")}
                    </Link>
                  </li>
                  <li>
                    <Link href="/games" className={QUIET_LINK}>
                      {t("more.all")}
                    </Link>
                  </li>
                </ul>
                <h3 className="sr-only">{t("more.faq")}</h3>
                <div className="mt-6 border-b border-page-line">
                  {faq.map(({ q, a }) => (
                    <details key={q} className="group border-t border-page-line">
                      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-4 text-left text-[0.9375rem] font-medium text-page-ink [&::-webkit-details-marker]:hidden">
                        {q}
                        <Plus aria-hidden="true" className="size-4 shrink-0 text-page-body transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" strokeWidth={1.6} />
                      </summary>
                      <p className="max-w-2xl pr-8 pb-5 text-[0.9375rem] leading-relaxed text-page-body">{a}</p>
                    </details>
                  ))}
                  {/* All five of the week's cards as text, closed: the three picks are dealt one at a time above, and only the first is in the page until it is tapped. Gone while another week's set is in view, so it never sits under it unexplained. */}
                  <NowOnly setId={weeklySet(week).id}>
                    <details data-five className="group border-t border-page-line">
                      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-4 text-left text-[0.9375rem] font-medium text-page-body [&::-webkit-details-marker]:hidden">
                        {t("more.cards")}
                        <Plus aria-hidden="true" className="size-4 shrink-0 text-page-body transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" strokeWidth={1.6} />
                      </summary>
                      <ol className="grid max-w-2xl list-decimal gap-2 pr-8 pb-5 pl-5 text-[0.9375rem] leading-relaxed text-page-body">
                        {five.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ol>
                    </details>
                  </NowOnly>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
