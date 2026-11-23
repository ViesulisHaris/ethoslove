import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/config/site";
import { TODAY_FAQ } from "@/content/game-pages";
import { DEFAULT_PAGE_THEME, pageThemeChromeCss, pageThemeStyle } from "@/content/template-page-themes";
import { RATHER_PAIRS } from "@/lib/games/content";
import { dayOf } from "@/lib/games/daily";
import { breadcrumbNode, faqNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { JsonLd } from "@/components/shared/json-ld";
import { TODAY_ART, TODAY_FLOWERS, TODAY_FOOT_ART } from "@/components/games/today/placements";
import { TodayQuestion } from "@/components/games/today/today-question";
import { TodaySteps } from "@/components/games/today/today-steps";
import { ArtLayer, BandEdge } from "@/components/templates/page/art";
import { Intro, SPREAD } from "@/components/templates/page/spread";

type Props = PageProps<"/[currency]/[locale]/games/today">;

/** The day turns at midnight UTC by itself, without a deploy: the page is rendered again every hour, and the browser checks the day once it has loaded. */
export const revalidate = 3600;

/** The key of this page's colours on <body> (content/template-page-themes.ts, pageThemeChromeCss). */
const THEME = "games-today";
const PATH = "/games/today";

/** A quiet link in a row: underlined, and a thumb's target by its padding (the finder's). */
const QUIET_LINK = "py-[0.8125rem] text-page-ink underline decoration-page-line underline-offset-4 transition-colors hover:decoration-page-ink";

export async function generateMetadata({ params }: Omit<Props, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "games.today" });
  // No image: the site's generic card, which never carries a name or an answer.
  return pageMetadata({ locale, path: PATH, title: t("seoTitle"), description: t("seoDescription") });
}

/**
 * Today's question: one "Would you rather" pair a day, the same for everyone, that one person
 * answers and sends to the other. Laid out as the finder's page is (docs/marketing/growth-build/
 * DESIGN-LESS-TEXT.md): a spread with the heading on the left and the question on the right, then
 * a band with how it goes and the way into the whole game. On the cream, not on the games' table:
 * it is a landing page with one tap in it. The server renders the day's pair as text; the link a
 * person was sent is read in the browser, and nothing in it ever reaches a server.
 */
export default async function TodayPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = locale === "es" ? "es" : "en";
  const t = await getTranslations("games.today");
  const root = await getTranslations();
  const theme = DEFAULT_PAGE_THEME;
  const count = RATHER_PAIRS.length;
  // The day the page is rendered with, as the finder reads its season: the browser checks it again once loaded.
  const day = dayOf(new Date().getTime());
  const faq = TODAY_FAQ.map(({ q, a }) => ({ q: q[l], a: a[l].replace("{count}", String(count)) }));

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
      <div data-page-theme={THEME} style={pageThemeStyle(theme)} className="relative isolate -mt-[var(--header-h)] pt-[var(--header-h)]">
        <section className="relative" aria-labelledby="today-title">
          <ArtLayer items={TODAY_ART} flowers={TODAY_FLOWERS} />
          <div className={cn(SPREAD, "gap-y-6 pt-3 pb-24 sm:gap-y-9 sm:pt-10 lg:min-h-[38rem] lg:content-start lg:items-start lg:pt-14 lg:pb-32")}>
            <Intro level={1} id="today-title" label={t("label")} heading={t("h1")} line={t("line")} />
            <div className="min-w-0 lg:pt-7">
              <TodayQuestion day={day} />
            </div>
          </div>
        </section>

        <section className="relative" aria-labelledby="today-how">
          <BandEdge side="top" className="text-page-raised" />
          <div className="relative -mt-px bg-page-raised">
            <ArtLayer items={TODAY_FOOT_ART} flowers={TODAY_FLOWERS} />
            <div className={cn(SPREAD, "pt-12 pb-14 lg:pt-16")}>
              <Intro id="today-how" label={t("how.label")} heading={t("how.heading")} line={t("how.line")} />
              <div className="min-w-0 lg:pt-7">
                <TodaySteps steps={[t("how.steps.pick"), t("how.steps.send"), t("how.steps.see")]} />
              </div>
            </div>
            <div className={cn(SPREAD, "pb-20 sm:pb-24 lg:pb-28")}>
              <Intro id="today-more" label={t("more.label")} heading={t("more.heading", { count })} line={t("more.line")} />
              <div className="min-w-0 lg:pt-7">
                <ul className="flex flex-wrap gap-x-6 leading-8">
                  <li>
                    <Link href="/games/rather" className={cn(QUIET_LINK, "font-medium")}>
                      {t("more.play")}
                    </Link>
                  </li>
                  <li>
                    <Link href="/games" className={QUIET_LINK}>
                      {t("more.all")}
                    </Link>
                  </li>
                </ul>
                <h3 className="sr-only">{t("more.faq")}</h3>
                <div className="mt-6">
                  {faq.map(({ q, a }) => (
                    <details key={q} className="group border-t border-page-line last:border-b">
                      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-4 text-left text-[0.9375rem] font-medium text-page-ink [&::-webkit-details-marker]:hidden">
                        {q}
                        <Plus aria-hidden="true" className="size-4 shrink-0 text-page-body transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" strokeWidth={1.6} />
                      </summary>
                      <p className="max-w-2xl pr-8 pb-5 text-[0.9375rem] leading-relaxed text-page-body">{a}</p>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
