import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClientMessages } from "@/i18n/client-messages";
import { featuredFor } from "@/config/featured";
import { REF_PATTERN } from "@/lib/attribution/ref";
import { MAKE_OWN_REF } from "@/lib/attribution/recipient";
import { BRAND } from "@/config/brand";
import { listManifests } from "@/templates/manifests";
import type { TemplateManifest } from "@/templates/types";
import { PageHeader } from "@/components/shared/page-header";
import { TemplateCard } from "@/components/templates/template-card";
import { sendsFree } from "@/lib/gift/free-tier";
import { cn } from "@/lib/utils";
import { firstRow, wordsSpan } from "./first-row";

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/made-with-ethos">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "madeWith" });
  // A page for whoever taps a free gift's footer, not one to be found by searching.
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: true } };
}

/**
 * How many columns the free shelf's words take beside its cards, at each width the grid changes:
 * whatever the cards leave of their row (lib: ./first-row.ts). Written out, as Tailwind reads
 * class names from the source.
 */
const WORDS_SPAN = {
  sm: ["", "sm:col-span-1", "sm:col-span-2"],
  lg: ["", "lg:col-span-1", "lg:col-span-2", "lg:col-span-3"],
  xl: ["", "xl:col-span-1", "xl:col-span-2", "xl:col-span-3", "xl:col-span-4"],
} as const;

/**
 * Where a free gift's "Made with Ethos" footer leads (?ref=watermark&template=<the gift's>): someone
 * has just been given one and is curious, not ready to pay. So it says what they're looking at and
 * that making one back starts free, then shows the free templates first and the premium ones after.
 * Every card opens a demo or the editor, never a checkout, and carries the ref on to the editor,
 * where it rides with any purchase.
 *
 * A gift's end screen sends people here too ("or make one for someone else", ?ref=g): they are not
 * answering the sender, and their gift may have been a paid one with no footer, so two lines change
 * for them. The eyebrow is what Ethos makes (BRAND.categoryLine): this is the first page of the
 * site most recipients ever see.
 *
 * The gift they were given is the first card under the heading, marked, whichever kind it is: a
 * free template leads the free shelf, and a premium one stands in front of it, in the same row.
 * (It used to lead the premium shelf, a screen and a half down, under a picture of The Letter.)
 * That first row is one grid: their card, the free cards, and the free shelf's words in what is
 * left of the row, so a shelf of one card (The Letter, since the free note) is a card with its words
 * beside it and not a card and three empty columns. On a phone the words come before the free
 * cards, as a shelf's heading does.
 */
export default async function MadeWithEthosPage({ params, searchParams }: PageProps<"/[currency]/[locale]/made-with-ethos">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const t = await getTranslations("madeWith");
  const ref = typeof query.ref === "string" ? query.ref.trim().toLowerCase() : "";
  const linkQuery = REF_PATTERN.test(ref) ? `?ref=${ref}` : "";
  const theirs = typeof query.template === "string" ? query.template : null;
  const forSomeoneElse = ref === MAKE_OWN_REF;
  const { lead, free, premium } = firstRow(listManifests(), theirs, sendsFree);
  const first = (lead ? 1 : 0) + free.length;
  const card = (m: TemplateManifest, index: number) => (
    <TemplateCard key={m.slug} manifest={m} index={index} badge={featuredFor(m.slug)} linkQuery={linkQuery} marker={m.slug === theirs ? t("yours") : undefined} />
  );

  return (
    <ClientMessages scope="(marketing)/made-with-ethos/page" locale={locale}>
      <PageHeader eyebrow={BRAND.categoryLine[locale === "es" ? "es" : "en"]} title={t("title")} subtitle={t(forSomeoneElse ? "subtitleElse" : "subtitle")} />
      <div className="container-x flex flex-col gap-20 pb-24" data-testid="made-with-ethos">
        <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {lead ? <div data-lead>{card(lead, 0)}</div> : null}
          {/* Its heading and its cards are cells of the grid above, beside the card that leads. */}
          <section aria-labelledby="shelf-free" data-shelf="free" className="contents">
            <header
              className={cn(
                // A phone: a shelf's heading, over its cards. Wider: the last cell of the row, beside them.
                "-mb-4 border-b border-line pb-5 sm:order-last sm:mb-0 sm:border-b-0 sm:pt-1 sm:pb-0",
                WORDS_SPAN.sm[wordsSpan(first, 2)],
                WORDS_SPAN.lg[wordsSpan(first, 3)],
                WORDS_SPAN.xl[wordsSpan(first, 4)],
              )}
            >
              <p className="text-eyebrow text-ink-soft">{t("free.eyebrow")}</p>
              <h2 id="shelf-free" className="display-md mt-2 max-w-md text-balance">
                {t("free.title")}
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{t(forSomeoneElse ? "free.blurbElse" : "free.blurb")}</p>
            </header>
            {free.map((m, i) => card(m, (lead ? 1 : 0) + i))}
          </section>
        </div>
        <section aria-labelledby="shelf-premium" data-shelf="premium">
          <header className="mb-8 border-b border-line pb-5 md:flex md:items-end md:justify-between md:gap-8">
            <div>
              <p className="text-eyebrow text-ink-soft">{t("premium.eyebrow")}</p>
              <h2 id="shelf-premium" className="display-md mt-2">
                {t("premium.title")}
              </h2>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground md:mt-0 md:pb-1">{t("premium.blurb")}</p>
          </header>
          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{premium.map((m, i) => card(m, first + i))}</div>
        </section>
      </div>
    </ClientMessages>
  );
}
