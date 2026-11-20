import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { GiftLocale } from "@/lib/gift/schema";
import { SITE } from "@/config/site";
import { ABOUT_ADDRESS, ABOUT_FOUNDED, ABOUT_PATH, ABOUT_PROFILES, aboutCopy } from "@/content/about";
import { LEGAL_ENTITY } from "@/content/legal";
import { PRODUCTS, chargedCurrency, formatAmount } from "@/lib/pricing/products";
import { proofNumbers, shownReactions } from "@/lib/proof/proof";
import { localizedUrl, organizationNode, pageMetadata } from "@/lib/seo";
import { listManifests } from "@/templates/manifests";
import { JsonLd } from "@/components/shared/json-ld";
import { PageHeader } from "@/components/shared/page-header";

/** The count of gifts opened and the reactions are read from the database: drawn again hourly, as on /gifts. */
export const revalidate = 3600;

/** Real reactions are shown from this many up; fewer stay unseen, and samples are never put here. */
const REACTIONS_MIN = 3;

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/about">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const copy = aboutCopy(locale === "es" ? "es" : "en", { templates: listManifests().length, single: "" });
  return pageMetadata({ locale, path: ABOUT_PATH, title: copy.metaTitle, description: copy.metaDescription, absoluteTitle: true });
}

/**
 * Who makes Ethos (content/about.ts says why the page exists and where each fact comes from). The
 * company's details sit beside the text and in the page's structured data, on the same Organization
 * every other page names, so a search engine or an assistant reads one company, not two.
 */
export default async function AboutPage({ params }: PageProps<"/[currency]/[locale]/about">) {
  const { currency, locale } = await params;
  setRequestLocale(locale);
  const lang: GiftLocale = locale === "es" ? "es" : "en";
  const shown = chargedCurrency(currency);
  const copy = aboutCopy(lang, { templates: listManifests().length, single: formatAmount(PRODUCTS.single.amounts[shown], shown, lang) });
  const t = await getTranslations("home.reactions");
  const [numbers, reactions] = await Promise.all([proofNumbers(), shownReactions(6, lang)]);
  const count = numbers ? `${new Intl.NumberFormat(lang).format(numbers.opened)}${numbers.more ? "+" : ""}` : "";
  const url = localizedUrl(locale, ABOUT_PATH);
  const E = LEGAL_ENTITY;

  return (
    <>
      <JsonLd
        nodes={[
          {
            ...organizationNode(),
            legalName: E.name,
            vatID: E.vat,
            foundingDate: ABOUT_FOUNDED,
            address: { "@type": "PostalAddress", ...ABOUT_ADDRESS },
          },
          {
            "@type": "AboutPage",
            "@id": `${url}#page`,
            url,
            name: copy.title,
            description: copy.metaDescription,
            inLanguage: lang,
            isPartOf: { "@id": `${SITE.url}/#website` },
            about: { "@id": `${SITE.url}/#organization` },
          },
        ]}
      />
      <PageHeader eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.subtitle}>
        {numbers ? (
          <p className="text-lg font-semibold leading-snug text-ink" data-testid="about-numbers">
            {numbers.opensEach
              ? t("openedEach", { count, times: new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(numbers.opensEach) })
              : t("opened", { count })}
          </p>
        ) : null}
      </PageHeader>
      <div className="container-x grid gap-12 pb-24 lg:grid-cols-[1fr_300px] lg:gap-20" data-testid="about">
        <article className="max-w-2xl">
          {copy.sections.map((section) => (
            <section key={section.id} id={section.id} className="mt-10 scroll-mt-28 first:mt-0">
              <h2 className="font-display text-2xl">{section.heading}</h2>
              {section.paragraphs.map((p, i) => (
                <p key={i} className="mt-3 leading-relaxed text-ink-soft">
                  {p}
                </p>
              ))}
              {section.links ? (
                <ul className="mt-2 flex flex-wrap gap-x-6">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      {/* 44px tall for a thumb, like every text link on a phone. */}
                      <Link href={link.href} className="inline-flex min-h-11 items-center text-sm font-semibold text-rose-deep underline underline-offset-4">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          {reactions.length >= REACTIONS_MIN ? (
            <section className="mt-12" data-testid="about-reactions">
              <h2 className="font-display text-2xl">{copy.reactionsHeading}</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {reactions.map((r, i) => (
                  <figure key={i} className="flex flex-col gap-3 rounded-lg border border-line bg-paper p-5">
                    <p className="rounded-xl rounded-bl-sm bg-paper-deep px-3.5 py-2.5 text-sm [overflow-wrap:anywhere]">{r.text}</p>
                    <span className="text-2xl" aria-hidden="true">
                      {r.emoji}
                    </span>
                  </figure>
                ))}
              </div>
              <p className="text-mono-meta mt-4 text-muted-foreground">{copy.reactionsNote}</p>
            </section>
          ) : null}

          <section className="mt-12">
            <h2 className="font-display text-2xl">{copy.profilesHeading}</h2>
            <ul className="mt-2 flex flex-wrap gap-x-6">
              {ABOUT_PROFILES.map((profile) => (
                <li key={profile.href}>
                  <a href={profile.href} rel="me noopener" target="_blank" className="inline-flex min-h-11 items-center text-sm font-semibold text-rose-deep underline underline-offset-4">
                    {profile.name}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </article>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-6 text-sm leading-relaxed text-muted-foreground">
            <h2 className="text-eyebrow text-ink-soft">{copy.company.heading}</h2>
            <p className="mt-4 font-medium text-ink">{E.name}</p>
            <dl className="mt-3 grid gap-3">
              <div>
                <dt className="text-xs">{copy.company.regNo}</dt>
                <dd className="text-ink">{E.regNo}</dd>
              </div>
              <div>
                <dt className="text-xs">{copy.company.vat}</dt>
                <dd className="text-ink">{E.vat}</dd>
              </div>
              <div>
                <dt className="text-xs">{copy.company.registered}</dt>
                <dd className="text-ink">{copy.registeredOn}</dd>
              </div>
              <div>
                <dt className="text-xs">{copy.company.address}</dt>
                <dd className="text-ink">{E.address}</dd>
              </div>
              <div>
                <dt className="text-xs">{copy.company.email}</dt>
                <dd>
                  <a href={`mailto:${E.email}`} className="inline-flex min-h-11 items-center font-medium text-ink underline underline-offset-4">
                    {E.email}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </>
  );
}
