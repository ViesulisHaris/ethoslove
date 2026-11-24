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
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PREMIUM_SHOWN, firstRow, freeSpan, wordsSpan } from "./first-row";

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/made-with-ethos">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "madeWith" });
  // A page for whoever taps a free gift's footer, not one to be found by searching.
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: true } };
}

/**
 * Column classes for the first row at each width the grid changes (./first-row.ts). Written out, as
 * Tailwind reads class names from the source.
 */
const SPAN = {
  sm: ["", "sm:col-span-1", "sm:col-span-2"],
  lg: ["", "lg:col-span-1", "lg:col-span-2", "lg:col-span-3"],
  xl: ["", "xl:col-span-1", "xl:col-span-2", "xl:col-span-3", "xl:col-span-4"],
} as const;
const COLS = {
  sm: ["", "sm:grid-cols-1", "sm:grid-cols-2"],
  lg: ["", "lg:grid-cols-1", "lg:grid-cols-2", "lg:grid-cols-3"],
  xl: ["", "xl:grid-cols-1", "xl:grid-cols-2", "xl:grid-cols-3", "xl:grid-cols-4"],
} as const;
/** The premium shelf is one row: two cards from a small tablet, three on a laptop, four wider. */
const PREMIUM_FROM = ["", "", "hidden lg:block", "hidden xl:block"] as const;

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
 * The gift they were given is the first card under the heading, with "The one you got" over it (a
 * pill on its picture covered the preview's own headline). A free one leads the free shelf. A premium
 * one stands in front of the shelf in a column of its own, so the row reads "The one you got", then
 * "Free", and never a paid card under the free heading. With no card in front of it the free shelf
 * is a spread: its words first, its cards beside them.
 *
 * Every recipient lands here, mostly on a phone, so the page stays short: their card, the free
 * shelf, one row of premium cards, and a link to all of them (/templates). It used to list all 61:
 * twenty-five phone screens.
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
  // Their card carries no pill on its picture (one covered the preview's own headline): a label over
  // it says which it is, and its "popular" badge stays off so the picture is left as it is.
  const card = (m: TemplateManifest, index: number) => (
    <TemplateCard key={m.slug} manifest={m} index={index} badge={m.slug === theirs ? undefined : featuredFor(m.slug)} linkQuery={linkQuery} />
  );
  // A free gift's card leads the free shelf with the same label over it; the cards beside it keep the
  // label's room, empty, so the row's pictures start level (on a phone, one under another, they don't).
  const theirsIsFree = free[0]?.slug === theirs;
  const freeCard = (m: TemplateManifest, index: number) =>
    theirsIsFree ? (
      <div key={m.slug} className="flex flex-col gap-3">
        {m.slug === theirs ? (
          <p className="text-eyebrow text-ink-soft" data-yours>
            {t("yours")}
          </p>
        ) : (
          <p aria-hidden="true" className="text-eyebrow invisible max-sm:hidden">
            {"\u00a0"}
          </p>
        )}
        {card(m, index)}
      </div>
    ) : (
      card(m, index)
    );
  const shown = premium.slice(0, PREMIUM_SHOWN);
  const first = (lead ? 1 : 0) + free.length;
  // Each shelf is a header over its cards. Where two stand in a row (their card's, the free one) they
  // share the row's two lines, so the headers start level and so do the cards.
  const shelf = "grid grid-rows-[auto_1fr] gap-y-5 sm:row-span-2 sm:grid-rows-subgrid";

  const freeWords = (
    <header>
      <p className="text-eyebrow text-ink-soft">{t("free.eyebrow")}</p>
      <h2 id="shelf-free" className="display-md mt-2 max-w-md text-balance">
        {t("free.title")}
      </h2>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{t(forSomeoneElse ? "free.blurbElse" : "free.blurb")}</p>
    </header>
  );

  return (
    <ClientMessages scope="(marketing)/made-with-ethos/page" locale={locale}>
      <PageHeader eyebrow={BRAND.categoryLine[locale === "es" ? "es" : "en"]} title={t("title")} subtitle={t(forSomeoneElse ? "subtitleElse" : "subtitle")} />
      <div className="container-x flex flex-col gap-20 pb-24" data-testid="made-with-ethos">
        {lead ? (
          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <section aria-labelledby="shelf-yours" data-lead className={shelf}>
              <h2 id="shelf-yours" className="text-eyebrow text-ink-soft">
                {t("yours")}
              </h2>
              {card(lead, 0)}
            </section>
            <section
              aria-labelledby="shelf-free"
              data-shelf="free"
              className={cn(shelf, SPAN.sm[freeSpan(free.length, 2)], SPAN.lg[freeSpan(free.length, 3)], SPAN.xl[freeSpan(free.length, 4)])}
            >
              {freeWords}
              <div className={cn("grid gap-x-6 gap-y-12", COLS.sm[freeSpan(free.length, 2)], COLS.lg[freeSpan(free.length, 3)], COLS.xl[freeSpan(free.length, 4)])}>
                {free.map((m, i) => card(m, 1 + i))}
              </div>
            </section>
          </div>
        ) : (
          <section aria-labelledby="shelf-free" data-shelf="free" className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* A phone: the shelf's heading over its cards. Wider: first in the row, its cards beside it. */}
            <div className={cn("-mb-4 border-b border-line pb-5 sm:mb-0 sm:border-b-0 sm:pb-0", SPAN.sm[wordsSpan(first, 2)], SPAN.lg[wordsSpan(first, 3)], SPAN.xl[wordsSpan(first, 4)])}>
              {freeWords}
            </div>
            {free.map((m, i) => freeCard(m, i))}
          </section>
        )}
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
          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((m, i) => (
              <div key={m.slug} className={PREMIUM_FROM[i]}>
                {card(m, first + i)}
              </div>
            ))}
          </div>
          <Link
            href={`/templates${linkQuery}`}
            className="group mt-8 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-ink underline-offset-4 hover:underline focus-visible:underline"
            data-testid="made-with-all"
          >
            {t("all")}
            <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </Link>
        </section>
      </div>
    </ClientMessages>
  );
}
