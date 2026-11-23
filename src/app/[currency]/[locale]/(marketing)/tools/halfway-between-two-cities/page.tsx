import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ClientMessages } from "@/i18n/client-messages";
import { SITE } from "@/config/site";
import { HALFWAY_TOOL, HALFWAY_TOOL_PATH } from "@/content/halfway-tool";
import { HALFWAY_ART, HALFWAY_FOOT_ART, ROOMS_THEME } from "@/content/rooms-art";
import { pageThemeChromeCss, pageThemeStyle } from "@/content/template-page-themes";
import { waysData } from "@/lib/ldr/ways-data";
import { breadcrumbNode, faqNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { HalfwayFinder } from "@/components/ldr/halfway-finder";
import { JsonLd } from "@/components/shared/json-ld";
import { ArtLayer, BandEdge } from "@/components/templates/page/art";
import { Intro, SPREAD } from "@/components/templates/page/spread";

type Props = PageProps<"/[currency]/[locale]/tools/halfway-between-two-cities">;

export async function generateMetadata({ params }: Omit<Props, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const copy = HALFWAY_TOOL[locale === "es" ? "es" : "en"];
  // One address whatever the towns: the canonical is the bare path, and the towns ride in the query.
  return pageMetadata({ locale, path: HALFWAY_TOOL_PATH, title: copy.title, description: copy.description });
}

/** The key of this page's colours on <body> (content/template-page-themes.ts, pageThemeChromeCss). */
const THEME = "halfway";

/** A quiet link in a row: underlined, and a thumb's target by its padding (the finder's own). */
const QUIET_LINK = "py-[0.8125rem] text-page-ink underline decoration-page-line underline-offset-4 transition-colors hover:decoration-page-ink";
/** The questions' rows, as a gift's page draws them (components/templates/page/sections.tsx). */
const ROW = "flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-4 text-left text-[0.9375rem] font-medium text-page-ink [&::-webkit-details-marker]:hidden";
const PLUS = "size-4 shrink-0 text-page-body transition-transform duration-200 group-open:rotate-45";

/**
 * Halfway between two cities: the long-distance room's halfway calculation on a page of its own,
 * laid out as the gift finder is (DESIGN-LESS-TEXT.md): the words and one line on the left, the
 * tool and its three ways on at the right, then a band with four closed questions and a row of
 * quiet links. Static: the page never reads its query; a link's towns are read in the browser.
 */
export default async function HalfwayToolPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = locale === "es" ? "es" : "en";
  const copy = HALFWAY_TOOL[l];
  const theme = ROOMS_THEME;

  return (
    <ClientMessages scope="(marketing)/tools/halfway-between-two-cities/page" locale={locale}>
      <JsonLd
        nodes={[
          breadcrumbNode([
            { name: SITE.name, url: localizedUrl(locale) },
            { name: copy.h1, url: localizedUrl(locale, HALFWAY_TOOL_PATH) },
          ]),
          faqNode(copy.faq),
        ]}
      />
      {/* The footer, the header's button and the ground behind them take the page's colours while it is open. */}
      <style>{pageThemeChromeCss(THEME, theme)}</style>
      <div data-page-theme={THEME} style={pageThemeStyle(theme)} className="relative isolate -mt-[var(--header-h)] pt-[var(--header-h)]">
        <section className="relative" aria-labelledby="halfway-title">
          <ArtLayer items={HALFWAY_ART} flowers={theme.flowers} />
          <div className={cn(SPREAD, "gap-y-6 pt-3 pb-24 sm:gap-y-9 sm:pt-10 lg:min-h-[40rem] lg:content-start lg:items-start lg:pt-14 lg:pb-32")}>
            <Intro level={1} id="halfway-title" label={copy.label} heading={copy.h1} line={copy.line} />
            <div className="min-w-0 lg:pt-7">
              <HalfwayFinder ways={waysData(l)} />
            </div>
          </div>
        </section>

        <section className="relative" aria-labelledby="halfway-questions">
          <BandEdge side="top" className="text-page-raised" />
          <div className="relative -mt-px bg-page-raised">
            <ArtLayer items={HALFWAY_FOOT_ART} flowers={theme.flowers} />
            <div className={cn(SPREAD, "pt-12 pb-20 sm:pb-24 lg:pt-16 lg:pb-28")}>
              <Intro id="halfway-questions" label={copy.questionsLabel} heading={copy.questionsHeading} line={copy.questionsLine} />
              <div className="min-w-0 lg:pt-7">
                {/* Closed, native, and no data-reveal inside: opened near the foot of a screen, revealed text stayed unseen. */}
                <div className="border-t border-page-line">
                  {copy.faq.map((item) => (
                    <details key={item.q} name="faq-halfway" className="group border-b border-page-line">
                      <summary className={ROW}>
                        {item.q}
                        <Plus aria-hidden="true" className={PLUS} strokeWidth={1.6} />
                      </summary>
                      <p className="max-w-2xl pr-8 pb-5 text-[0.9375rem] leading-relaxed text-page-body">{item.a}</p>
                    </details>
                  ))}
                </div>
                <nav aria-label={copy.moreLabel} className="mt-8">
                  <ul className="flex flex-wrap gap-x-6 leading-8">
                    {copy.links.map((link) => (
                      <li key={link.href}>
                        <Link href={link.href} className={QUIET_LINK}>
                          {link.text}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </section>
      </div>
    </ClientMessages>
  );
}
