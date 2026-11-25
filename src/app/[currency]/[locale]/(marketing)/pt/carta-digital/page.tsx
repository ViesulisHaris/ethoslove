import type { Metadata } from "next";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/config/site";
import { ABOUT_PATH } from "@/content/about";
import { PT_LETTER_LANG, PT_LETTER_PATH, ptLetterCopy } from "@/content/pt-letter";
import { PRODUCTS, chargedCurrency, formatAmount } from "@/lib/pricing/products";
import { faqNode, organizationNode } from "@/lib/seo";
import { getManifest } from "@/templates/manifests";
import { JsonLd } from "@/components/shared/json-ld";
import { PageHeader } from "@/components/shared/page-header";

/** The template this page is about; its editor and demo are where the buttons lead. */
const SLUG = "the-letter";
/** One address whichever language the visitor's menus are in: the proxy serves it there in either, and sends /es/pt/carta-digital here. */
const PAGE_URL = `${SITE.url}${PT_LETTER_PATH}`;

export function generateMetadata(): Metadata {
  const copy = ptLetterCopy({ price: "", currency: "eur" });
  const image = `${SITE.url}${getManifest(SLUG)?.thumbnail.poster ?? SITE.ogImage}`;
  return {
    title: { absolute: `${copy.metaTitle} · ${SITE.name}` },
    description: copy.metaDescription,
    alternates: { canonical: PAGE_URL, languages: { [PT_LETTER_LANG]: PAGE_URL } },
    openGraph: { type: "website", url: PAGE_URL, siteName: SITE.name, locale: "pt_BR", title: copy.metaTitle, description: copy.metaDescription, images: [{ url: image, alt: copy.posterAlt }] },
    twitter: { card: "summary_large_image", site: SITE.twitterHandle, title: copy.metaTitle, description: copy.metaDescription, images: [image] },
  };
}

/**
 * The Letter in Brazilian Portuguese (content/pt-letter.ts says why, and what it promises). The
 * page's own words are marked `lang="pt-BR"`; the menus around it stay in the site's language, and
 * the buttons lead to the same editor and demo every other page does.
 */
export default async function CartaDigitalPage({ params }: PageProps<"/[currency]/[locale]/pt/carta-digital">) {
  const { currency, locale } = await params;
  setRequestLocale(locale);
  const shown = chargedCurrency(currency);
  // Brazilian prices are written "9,99 €": the number is formatted the Portuguese way.
  const copy = ptLetterCopy({ price: formatAmount(PRODUCTS.extras.amounts[shown], shown, "pt-BR"), currency: shown });
  const poster = getManifest(SLUG)?.thumbnail.poster;
  const button = "inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-medium transition-colors";

  return (
    <div lang={PT_LETTER_LANG} data-testid="carta-digital">
      <JsonLd
        nodes={[
          organizationNode(),
          {
            "@type": "WebPage",
            "@id": `${PAGE_URL}#page`,
            url: PAGE_URL,
            name: copy.title,
            description: copy.metaDescription,
            inLanguage: PT_LETTER_LANG,
            isPartOf: { "@id": `${SITE.url}/#website` },
            about: { "@id": `${SITE.url}/#organization` },
          },
          faqNode(copy.faq.items),
        ]}
      />
      <PageHeader eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.subtitle}>
        <div className="flex flex-wrap gap-3">
          <Link href={`/create/${SLUG}`} className={`${button} bg-forest text-cream hover:bg-forest-raised`}>
            {copy.ctaMake}
          </Link>
          <Link href={`/demo/${SLUG}`} className={`${button} border border-line text-ink hover:bg-paper-deep`}>
            {copy.ctaDemo}
          </Link>
        </div>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {copy.languageNote}{" "}
          <Link href={`/create/${SLUG}`} locale="es" className="font-medium text-ink underline underline-offset-4">
            {copy.spanishEditor}
          </Link>
        </p>
      </PageHeader>

      <div className="container-x grid gap-12 pb-24 lg:grid-cols-[1fr_320px] lg:gap-20">
        <article className="max-w-2xl">
          <section>
            <h2 className="font-display text-2xl">{copy.steps.heading}</h2>
            <ol className="mt-5 grid gap-5">
              {copy.steps.items.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span aria-hidden="true" className="font-display flex size-9 shrink-0 items-center justify-center rounded-full border border-line text-lg text-ink">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-medium text-ink">{step.title}</h3>
                    <p className="mt-1 leading-relaxed text-ink-soft">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl">{copy.pricing.heading}</h2>
            <ul className="mt-4 grid gap-3 leading-relaxed text-ink-soft">
              <li>{copy.pricing.free}</li>
              <li>{copy.pricing.paid}</li>
              <li>{copy.pricing.once}</li>
            </ul>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl">{copy.lines.heading}</h2>
            <p className="mt-3 leading-relaxed text-ink-soft">{copy.lines.intro}</p>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
              {copy.lines.items.map((item) => (
                <li key={item.when} className="rounded-lg border border-line bg-paper p-5">
                  <p className="text-mono-meta text-muted-foreground">{item.when}</p>
                  <p className="font-display mt-2 text-lg leading-snug text-ink">{item.line}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl">{copy.faq.heading}</h2>
            <div className="mt-4 divide-y divide-line border-y border-line">
              {copy.faq.items.map((item) => (
                // No script: <details> opens and closes by itself, and every answer is in the page for a crawler.
                <details key={item.q} className="group">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 font-medium text-ink [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="pb-4 leading-relaxed text-ink-soft">{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl">{copy.more.heading}</h2>
            <p className="mt-3 leading-relaxed text-ink-soft">{copy.more.body}</p>
            <ul className="mt-2 flex flex-wrap gap-x-6">
              <li>
                <Link href="/templates" className="inline-flex min-h-11 items-center text-sm font-semibold text-rose-deep underline underline-offset-4">
                  {copy.more.link}
                </Link>
              </li>
              <li>
                <Link href={ABOUT_PATH} className="inline-flex min-h-11 items-center text-sm font-semibold text-rose-deep underline underline-offset-4">
                  {copy.more.about}
                </Link>
              </li>
            </ul>
          </section>
        </article>

        {poster ? (
          <aside className="order-first lg:order-none lg:sticky lg:top-24 lg:self-start">
            <Link href={`/demo/${SLUG}`} aria-label={copy.ctaDemo} className="relative block aspect-[13/20] w-full max-w-[320px] overflow-hidden rounded-3xl border border-line shadow-soft">
              <Image src={poster} alt={copy.posterAlt} fill sizes="(min-width: 1024px) 320px, 80vw" quality={75} priority className="object-cover" />
            </Link>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
