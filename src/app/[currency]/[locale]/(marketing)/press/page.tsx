import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BRAND } from "@/config/brand";
import { SITE } from "@/config/site";
import { ABOUT_PATH, ABOUT_PROFILES } from "@/content/about";
import { LEGAL_ENTITY } from "@/content/legal";
import { PRESS_COPY, PRESS_PATH, pressCompany, pressFounderLine } from "@/content/press";
import { pressDate, pressFigures, pressTemplates, type PressLocale } from "@/lib/press/figures";
import { shownPress } from "@/lib/press/shown";
import { breadcrumbNode, localizedUrl, organizationNode, pageMetadata } from "@/lib/seo";
import { getManifest, listManifests } from "@/templates/manifests";
import { JsonLd } from "@/components/shared/json-ld";
import { PRESS_BUTTON, PRESS_LINK, PressArticle, PressContact, PressFigures, PressHero, PressMethod, PressMostMade, PressPage, SampleTag } from "@/components/press/press-page";

type Props = PageProps<"/[currency]/[locale]/press">;

export async function generateMetadata({ params }: Omit<Props, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const shown = shownPress();
  if (!shown) return {};
  const copy = PRESS_COPY[locale === "es" ? "es" : "en"];
  // absoluteTitle: "Ethos in numbers … · Ethos" would say the name twice.
  const meta = pageMetadata({ locale, path: PRESS_PATH, title: copy.metaTitle, description: copy.metaDescription, absoluteTitle: true });
  return shown.sample ? { ...meta, robots: { index: false, follow: false } } : meta;
}

/**
 * Ethos in numbers: a page for anyone writing about Ethos, with the figures of the committed
 * snapshot (content/press-numbers.ts), the name and the makers, pictures to use and an address.
 * Static, and it reads no database: the snapshot and the catalogue are all it needs. While the
 * snapshot is not whole the page is a 404 (lib/press/shown.ts), except on a dev server started
 * with PRESS_PREVIEW=1, which shows invented figures under a tag that says so.
 */
export default async function PressRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const shown = shownPress();
  if (!shown) notFound();

  const l: PressLocale = locale === "es" ? "es" : "en";
  const copy = PRESS_COPY[l];
  const { numbers, sample } = shown;
  const url = localizedUrl(locale, PRESS_PATH);
  const figures = pressFigures(numbers, l).map((f) => ({ id: f.id, value: f.value, ...copy.numbers.figures[f.id] }));
  const cards = pressTemplates(numbers, l).flatMap(({ slug, share }) => {
    const manifest = getManifest(slug);
    return manifest ? [{ manifest, share }] : [];
  });
  // A whole snapshot always has five. The band's phone shows the second, so the Letter's cover is not on the page twice.
  const lead = cards[0]?.manifest;
  const second = cards[1]?.manifest ?? lead;
  if (!lead || !second) notFound();
  const fill = (s: string) => s.replace("{name}", BRAND.name).replace("{domain}", BRAND.domain).replace("{company}", pressCompany(LEGAL_ENTITY.name, l)).replace("{count}", String(listManifests().length));

  return (
    <>
      <JsonLd
        nodes={[
          organizationNode(),
          { "@type": "WebPage", "@id": `${url}#page`, url, name: copy.h1, description: copy.metaDescription, inLanguage: l, dateModified: numbers.asOf, isPartOf: { "@id": `${SITE.url}/#website` }, about: { "@id": `${SITE.url}/#organization` } },
          breadcrumbNode([
            { name: SITE.name, url: localizedUrl(locale) },
            { name: copy.h1, url },
          ]),
        ]}
      />
      {sample ? <SampleTag>{copy.sample}</SampleTag> : null}
      <PressPage>
        <PressHero maker={BRAND.categoryLine[l]} heading={copy.h1} line={pressFounderLine(l)} sentence={copy.sentence} poster={lead.thumbnail.poster} posterAlt={`${lead.name[l]}: ${lead.tagline[l]}`}>
          <a href={`mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(copy.mailSubject)}`} className={PRESS_BUTTON}>
            {copy.write}
          </a>
        </PressHero>
        <PressFigures label={copy.numbers.label} heading={copy.numbers.heading} line={copy.numbers.line} figures={figures} asOf={copy.numbers.asOf.replace("{date}", pressDate(numbers.asOf, l))} day={numbers.asOf} />
        <PressMostMade label={copy.made.label} heading={copy.made.heading} line={copy.made.line} cards={cards} locale={l} />
        <PressArticle label={copy.article.label} heading={copy.article.heading} checks={copy.article.checks.map(fill)} poster={second.thumbnail.poster}>
          {/* The app icon (a heart on cream), the one mark public/ holds: there is no wordmark file yet, so it is not called a logo. */}
          <a href="/icons/icon-512.png" download="ethos-app-icon.png" className={PRESS_LINK}>
            {copy.article.logo}
          </a>
          <Link href="/templates" className={PRESS_LINK}>
            {copy.article.templates}
          </Link>
        </PressArticle>
        <PressMethod label={copy.method.label} heading={copy.method.heading} faq={copy.method.faq} />
        <PressContact label={copy.contact.label} heading={copy.contact.heading} line={copy.contact.line} email={BRAND.supportEmail} subject={copy.mailSubject}>
          <li>
            <Link href={ABOUT_PATH} className={PRESS_LINK}>
              {copy.contact.about}
            </Link>
          </li>
          {ABOUT_PROFILES.map((profile) => (
            <li key={profile.name}>
              <a href={profile.href} rel="me noopener" target="_blank" className={PRESS_LINK}>
                {profile.name}
              </a>
            </li>
          ))}
        </PressContact>
      </PressPage>
    </>
  );
}
