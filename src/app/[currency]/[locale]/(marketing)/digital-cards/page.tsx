import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, Play } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/config/site";
import type { GiftLocale } from "@/lib/gift/schema";
import { breadcrumbNode, faqNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { PRODUCTS, chargedCurrency, formatAmount, type Currency } from "@/lib/pricing/products";
import { sendsFree } from "@/lib/gift/free-tier";
import { DIGITAL_CARDS_PATH, DIGITAL_CARDS_REF, digitalCardsCopy, finderIsBuilt, type DigitalCardsFacts } from "@/content/digital-cards";
import { DIGITAL_GIFT_IDEAS } from "@/content/digital-gifts";
import { GIFT_GUIDES, GIFT_GUIDE_SLUGS } from "@/content/gift-guides";
import { RECIPIENTS, RECIPIENT_GUIDES, recipientSlug } from "@/content/recipients";
import { getManifest, listManifests } from "@/templates/manifests";
import { Button } from "@/components/ui/button";
import { CHIP } from "@/components/marketing/chip";
import { FaqList } from "@/components/shared/faq-list";
import { JsonLd } from "@/components/shared/json-ld";

const TEXT_LINK = "inline-flex min-h-11 items-center gap-1.5 rounded-sm text-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50";

/** What the copy reads from the code: the prices in this page's currency, written the locale's way, the counts, and whether the finder is there to link to. */
function facts(currency: Currency, locale: string): DigitalCardsFacts {
  const price = (id: "single" | "pick3" | "everything" | "extras") => formatAmount(PRODUCTS[id].amounts[currency], currency, locale);
  return { single: price("single"), pick3: price("pick3"), everything: price("everything"), extras: price("extras"), count: listManifests().length, ideas: DIGITAL_GIFT_IDEAS.length, finder: finderIsBuilt() };
}

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/digital-cards">, "searchParams">): Promise<Metadata> {
  const { currency, locale } = await params;
  const copy = digitalCardsCopy(locale as GiftLocale, facts(chargedCurrency(currency), locale));
  return pageMetadata({ locale, path: DIGITAL_CARDS_PATH, title: copy.title, description: copy.description });
}

/**
 * What a digital card is: the definition, the two things it gets mistaken for, the five kinds with
 * one real card shown for each, how one is made and sent, what it costs in this page's currency,
 * and the questions. The one page that carries the category line, as the eyebrow of its heading.
 */
export default async function DigitalCardsPage({ params }: PageProps<"/[currency]/[locale]/digital-cards">) {
  const { currency, locale } = await params;
  setRequestLocale(locale);
  const l = locale as GiftLocale;
  const t = await getTranslations("recipients");
  const copy = digitalCardsCopy(l, facts(chargedCurrency(currency), locale));
  const url = localizedUrl(locale, DIGITAL_CARDS_PATH);
  const kinds = copy.kinds.items.flatMap((kind) => {
    const manifest = getManifest(kind.template);
    return manifest ? [{ ...kind, manifest, also: kind.also.flatMap((slug) => getManifest(slug) ?? []) }] : [];
  });

  return (
    <div data-testid="digital-cards">
      <JsonLd
        nodes={[
          {
            "@type": "ItemList",
            name: copy.kinds.heading,
            itemListElement: kinds.map((kind, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: kind.title,
              url: localizedUrl(locale, `/templates/${kind.template}`),
            })),
          },
          breadcrumbNode([
            { name: SITE.name, url: localizedUrl(locale) },
            { name: copy.breadcrumb, url },
          ]),
          faqNode(copy.faq.items),
        ]}
      />

      <header className="container-x pt-12 pb-12 sm:pt-16 sm:pb-16">
        {/* The category line, then what it means: one heading, both read, as on a template's page. */}
        <h1 className="max-w-3xl">
          <span className="mb-5 block text-eyebrow text-ink-soft">{copy.eyebrow}</span>
          <span className="block display-xl">{copy.h1}</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft sm:text-xl">{copy.definition}</p>
        <div className="mt-8">
          <Button asChild size="lg" className="h-12 rounded-full px-6 text-base">
            <Link href="/templates">
              {copy.browse}
              <ArrowRight className="size-4" data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </header>

      <section className="container-x grid gap-x-10 gap-y-6 border-t border-line py-14 lg:grid-cols-12 lg:py-16" aria-labelledby="not-the-same">
        <h2 id="not-the-same" className="display-md max-w-[14em] lg:col-span-4">
          {copy.compare.heading}
        </h2>
        <dl className="divide-y divide-line border-y border-line lg:col-span-8">
          {copy.compare.rows.map((row) => (
            <div key={row.term} className="grid gap-x-8 gap-y-1.5 py-5 sm:grid-cols-[13rem_1fr]">
              <dt className="font-display text-xl leading-snug">{row.term}</dt>
              <dd className="leading-relaxed text-ink-soft">{row.is}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="container-x border-t border-line pt-14 lg:pt-16" aria-labelledby="kinds">
        <h2 id="kinds" className="display-lg">
          {copy.kinds.heading}
        </h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">{copy.kinds.lead}</p>
        <ul className="mt-10 border-b border-line">
          {kinds.map((kind) => {
            const name = kind.manifest.name[l];
            return (
              <li key={kind.template} data-testid="card-kind" className="grid grid-cols-[6rem_1fr] gap-x-5 gap-y-5 border-t border-line py-8 sm:grid-cols-[9rem_1fr] sm:gap-x-8 sm:gap-y-3 lg:grid-cols-[9rem_minmax(0,38rem)_1fr]">
                <Link href={`/templates/${kind.template}`} className="sm:row-span-2" tabIndex={-1} aria-hidden="true">
                  {/* Hidden from screen readers (the name beside it is the real link), so this alt text is for image search alone. */}
                  <Image src={kind.manifest.thumbnail.poster} alt={`${name}: ${kind.manifest.tagline[l]}`} width={144} height={222} sizes="(min-width: 640px) 144px, 96px" className="h-[148px] w-24 rounded-xl bg-muted object-cover sm:h-[222px] sm:w-36" />
                </Link>
                <div className="self-center sm:self-start">
                  <p className="text-mono-meta text-muted-foreground">
                    {/* 44px to a thumb, pulled back into the line by its negative margin, so nothing moves. */}
                    <Link href={`/templates/${kind.template}`} className="-my-3.5 inline-flex min-h-11 items-center rounded-sm underline-offset-4 outline-none hover:text-ink hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
                      {name}
                    </Link>
                    {sendsFree(kind.manifest) ? ` · ${t("free")}` : null}
                  </p>
                  <h3 className="mt-2 font-display text-2xl leading-tight sm:text-[1.75rem]">{kind.title}</h3>
                </div>
                <div className="col-span-2 sm:col-span-1 sm:col-start-2">
                  <p className="leading-relaxed text-ink-soft">{kind.body}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-5">
                    <Link href={`/demo/${kind.template}`} data-testid="kind-watch" aria-label={t("watchNamed", { name })} className={`${TEXT_LINK} font-semibold text-coral active:text-coral-deep`}>
                      <Play aria-hidden="true" className="size-3.5" />
                      {copy.kinds.watch}
                    </Link>
                    <Link href={`/create/${kind.template}?ref=${DIGITAL_CARDS_REF}`} data-testid="kind-make" className={`${TEXT_LINK} font-medium text-ink-soft hover:text-ink active:text-ink`}>
                      {copy.kinds.make}
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  </div>
                </div>
                {/* The rest of the kind, small: beside the text on a wide screen, under it on a phone. Left-aligned, so the label starts at the same place on every row however many cards follow. */}
                <div className="col-span-2 sm:col-span-1 sm:col-start-2 lg:col-start-3 lg:row-span-2 lg:row-start-1">
                  <p className="text-mono-meta text-muted-foreground">{copy.kinds.also}</p>
                  <ul className="mt-3 flex gap-3">
                    {kind.also.map((m) => (
                      <li key={m.slug} className="w-[4.5rem]">
                        <Link href={`/templates/${m.slug}`} className="group block rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                          <Image src={m.thumbnail.poster} alt="" width={72} height={111} sizes="72px" className="h-[111px] w-[4.5rem] rounded-lg bg-muted object-cover transition-opacity group-hover:opacity-85 group-active:opacity-75" />
                          <span className="mt-1.5 block text-xs leading-tight text-ink-soft underline-offset-2 group-hover:text-ink group-hover:underline">{m.name[l]}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="container-narrow pt-14 pb-16 lg:pt-16">
        <section aria-labelledby="how">
          <h2 id="how" className="display-md">
            {copy.steps.heading}
          </h2>
          <ol className="mt-6 grid gap-6">
            {copy.steps.items.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span aria-hidden="true" className="font-display flex size-9 shrink-0 items-center justify-center rounded-full border border-line text-lg text-ink">
                  {i + 1}
                </span>
                <div>
                  <h3 className="pt-1 font-medium text-ink">{step.title}</h3>
                  <p className="mt-1 leading-relaxed text-ink-soft">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16" aria-labelledby="cost">
          <h2 id="cost" className="display-md">
            {copy.cost.heading}
          </h2>
          <p className="mt-3 leading-relaxed text-ink-soft">{copy.cost.lead}</p>
          <dl className="mt-5 divide-y divide-line border-y border-line" data-testid="card-prices">
            {copy.cost.rows.map((row) => (
              <div key={row.label} className="py-4">
                <div className="flex items-baseline justify-between gap-6">
                  <dt className="font-medium text-ink">{row.label}</dt>
                  <dd className="font-display text-2xl leading-none tabular-nums">{row.price}</dd>
                </div>
                <dd className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-soft">{row.note}</dd>
              </div>
            ))}
          </dl>
          <Link href="/pricing" className={`${TEXT_LINK} mt-2 font-semibold text-coral active:text-coral-deep`}>
            {copy.cost.more}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </section>

        <section className="mt-16" aria-labelledby="questions">
          <h2 id="questions" className="display-md mb-6">
            {copy.faq.heading}
          </h2>
          <FaqList items={copy.faq.items} name="faq-digital-cards" />
        </section>

        <nav className="mt-16" aria-labelledby="onward">
          <h2 id="onward" className="display-md">
            {copy.onward.heading}
          </h2>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {copy.onward.links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="group flex min-h-12 items-center justify-between gap-4 py-3 font-medium outline-none transition-colors hover:text-coral focus-visible:ring-3 focus-visible:ring-ring/50 active:text-coral-deep"
                >
                  {link.label}
                  <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-coral motion-reduce:transition-none" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="container-x border-t border-line pt-10 pb-24">
        <nav aria-labelledby="cards-by-kind">
          <h2 id="cards-by-kind" className="text-eyebrow text-ink-soft">
            {copy.onward.byKind}
          </h2>
          <ul className="mt-5 flex flex-wrap gap-2">
            {GIFT_GUIDE_SLUGS.map((slug) => (
              <li key={slug}>
                <Link href={`/gifts/${slug}`} className={CHIP}>
                  {GIFT_GUIDES[slug][l].label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav className="mt-10" aria-labelledby="cards-by-person">
          <h2 id="cards-by-person" className="text-eyebrow text-ink-soft">
            {copy.onward.byPerson}
          </h2>
          <ul className="mt-5 flex flex-wrap gap-2">
            {RECIPIENTS.map((r) => (
              <li key={r}>
                <Link href={`/gifts/${recipientSlug(r)}`} className={CHIP}>
                  {RECIPIENT_GUIDES[r][l].label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
