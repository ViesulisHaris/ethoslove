import type { ReactNode } from "react";
import Image from "next/image";
import { ArrowRight, Check, Heart, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { GiftLocale } from "@/lib/gift/schema";
import { PT_LETTER_LANG, PT_LETTER_PATH } from "@/content/pt-letter";
import { SAMPLE_PHOTO, artSrcSet, pageArt, slotStyle } from "@/content/page-art";
import type { BorrowField, TemplateGuideContent } from "@/content/template-guides";
import type { Flowers } from "@/content/template-page-themes";
import { listManifests } from "@/templates/manifests";
import type { FieldMeta, TemplateManifest } from "@/templates/types";
import { CutoutImg } from "@/components/marketing/home/cutouts";
import { Art, ArtLayer, ArtWithSlot, BandEdge } from "./art";
import { IdeasToggle } from "./ideas-toggle";
import { CLOSED_BLOCK_WORDS, countWords, fitSentences } from "./lead";
import { HOW_ART, MORE_ART, WRITE_ART } from "./placements";

/**
 * A gift's page below its hero, as the owner's mock-up lays it out (docs/marketing/growth-build/
 * DESIGN-LESS-TEXT.md): each section a short left column (a label, a heading, one line) beside
 * something to look at. The colours are the page's (--page-*, globals.css), the flowers the page
 * art's, and every word a template's own or a line of messages/*.json.
 */

/** A section's left column: the label, the heading, at most one line and at most one button. */
function Intro({ id, label, heading, line, children }: { id?: string; label: string; heading: string; line?: string; children?: ReactNode }) {
  return (
    <div className="lg:pt-7">
      <p className="text-page-label text-page-body">{label}</p>
      <h2 id={id} className="mt-4 max-w-[22rem] display-lg text-balance text-page-ink">
        {heading}
      </h2>
      {line ? <p className="mt-4 max-w-[21rem] text-[0.9375rem] leading-relaxed text-page-body">{line}</p> : null}
      {children}
    </div>
  );
}

/** The two-column spread every section below the hero shares. */
const SPREAD = "container-x relative grid gap-y-9 lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:gap-x-12 xl:grid-cols-[22.5rem_minmax(0,1fr)] xl:gap-x-20";

/**
 * One of the three pictures of "How to send", from the page art: a polaroid with the sample photo
 * laid into it, a note card with a line of handwriting written on it, a small phone showing a
 * sealed envelope. `data-flatlay` marks what is laid in as part of a picture, as a phone's screen is.
 */
function StepPicture({ step, flowers, noteLine }: { step: 0 | 1 | 2; flowers: Flowers; noteLine: string }) {
  if (step === 0)
    return (
      <span data-flatlay="step" className="block w-[5.5rem] sm:w-[9.25rem]">
        <ArtWithSlot id="step-photo" flowers={flowers} slot="photo" shown="150px">
          <Image src={SAMPLE_PHOTO.src} alt="" fill sizes="130px" className="object-cover" />
        </ArtWithSlot>
      </span>
    );
  if (step === 1)
    return (
      <span data-flatlay="step" className="block w-[6.75rem] sm:w-[11.5rem]">
        {/* The card is a container, so the handwriting is sized by the card and keeps its place at any width. */}
        <ArtWithSlot id="step-note" flowers={flowers} slot="card" shown="190px" slotClassName="[container-type:inline-size]">
          <span className="flex h-full items-center px-[9cqw] font-hand text-[12.5cqw] leading-[1.08] text-page-ink">{noteLine}</span>
        </ArtWithSlot>
      </span>
    );
  return <Art id="step-send" flowers={flowers} shown="100px" className="w-[3.4rem] sm:w-[5.6rem]" />;
}

/** (2) How to send: three small picture cards, numbered because they are an order. */
export async function HowToSend({ locale, heading, flowers, noteLine }: { locale: GiftLocale; heading: string; flowers: Flowers; noteLine: string }) {
  const t = await getTranslations({ locale, namespace: "templates.guide" });
  const steps = [t("step1Title"), t("step2Title"), t("step3Title")];
  return (
    <section className="relative" aria-labelledby="template-how">
      <ArtLayer items={HOW_ART} flowers={flowers} />
      <div className={cn(SPREAD, "py-14 sm:py-20 lg:py-28")}>
        <Intro id="template-how" label={t("eyebrow")} heading={heading} line={t("howLine")} />
        <ol className="grid gap-3 sm:grid-cols-3 sm:gap-x-9 lg:gap-x-10">
          {steps.map((title, i) => (
            <li
              key={title}
              className="relative grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-x-5 rounded-[1.4rem] border border-page-line bg-page-raised/70 py-4 pr-4 pl-5 shadow-page-card sm:block sm:px-4 sm:pt-10 sm:pb-7 sm:text-center"
            >
              <span className="absolute top-1/2 -left-3 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-page-badge font-display text-base text-page-ink ring-4 ring-page-ground sm:-top-5 sm:left-1/2 sm:size-10 sm:-translate-x-1/2 sm:translate-y-0 sm:text-lg">
                {i + 1}
              </span>
              <h3 className="order-last font-display text-[1.25rem] leading-tight text-page-ink sm:text-[1.3rem]">{title}</h3>
              <span className="grid h-28 place-items-center sm:mt-5 sm:h-40">
                <StepPicture step={i as 0 | 1 | 2} flowers={flowers} noteLine={noteLine} />
              </span>
              {i < 2 ? <ArrowRight aria-hidden="true" className="absolute top-1/2 -right-[1.6rem] hidden size-4 -translate-y-1/2 text-page-body sm:block lg:-right-[1.75rem]" /> : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/**
 * The line written on the note card of step two. From the template's own guide where it has one:
 * the first line to borrow that is short enough to be read on a card that small. Otherwise the
 * title of the template's own demo. Either way a line the product already shows, never one made up
 * for the picture.
 */
export async function stepNoteLine(slug: string, locale: GiftLocale, guide: TemplateGuideContent | null): Promise<string> {
  const fits = (line: string) => line.length >= 8 && line.length <= 30;
  const borrowed = guide?.ideas.items.map((idea) => idea.borrow.line).find(fits);
  if (borrowed) return borrowed;
  try {
    const mod = (await import(`@/templates/${slug}/demo-data`)) as { demoData?: Record<GiftLocale, { title?: string }> };
    return mod.demoData?.[locale]?.title ?? "";
  } catch {
    return "";
  }
}

/** A template's own fields, by the names its editor gives them. */
async function fieldLabels(slug: string, locale: GiftLocale): Promise<Record<string, string>> {
  try {
    const mod = (await import(`@/templates/${slug}/field-meta`)) as { fieldMeta?: Record<GiftLocale, Record<string, FieldMeta>> };
    return Object.fromEntries(Object.entries(mod.fieldMeta?.[locale] ?? {}).map(([key, meta]) => [key, meta.label]));
  } catch {
    return {};
  }
}

/** (3) What to write: six quiet title cards; a card opens to its line to borrow, in handwriting. */
export async function WhatToWrite({ manifest, locale, guide, flowers }: { manifest: TemplateManifest; locale: GiftLocale; guide: TemplateGuideContent; flowers: Flowers }) {
  const t = await getTranslations({ locale });
  const own = await fieldLabels(manifest.slug, locale);
  const shared: Partial<Record<BorrowField, string>> = {
    title: t("editor.fields.title"),
    message: t("editor.fields.message"),
    note: t("editor.fields.message"),
    caption: t("editor.photos.caption"),
    recipientName: t("editor.fields.recipientName"),
    senderName: t("editor.fields.senderName"),
    "countdown.label": t("templates.featureCountdown"),
    "surprise.text": t("templates.featureSurprise"),
  };
  const fieldName = (field: BorrowField) => (field.startsWith("fields.") ? own[field.slice("fields.".length)] : shared[field]) ?? "";
  const gridId = `ideas-${manifest.slug}`;
  return (
    <section className="relative" aria-labelledby="template-guide">
      <ArtLayer items={WRITE_ART} flowers={flowers} />
      <div className={cn(SPREAD, "pt-4 pb-16 sm:pb-20 lg:pt-6 lg:pb-32")}>
        <Intro id="template-guide" label={t("templates.guide.ideasLabel")} heading={guide.ideas.title} line={t("templates.guide.ideasLine", { count: guide.ideas.items.length })}>
          <IdeasToggle target={gridId} show={t("templates.guide.ideasShow")} hide={t("templates.guide.ideasHide")} className="mt-6" />
        </Intro>
        <ul id={gridId} className="grid gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {guide.ideas.items.map((idea) => (
            <li key={idea.heading}>
              <details className="group relative h-full rounded-[1.25rem] border border-page-line bg-page-raised/55 transition-colors duration-200 open:bg-page-raised hover:bg-page-raised sm:min-h-[10.25rem]">
                {/* The whole card is the button: the summary's ::after covers it. The heart fills when its line is showing. */}
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-[1.25rem] px-5 py-4 after:absolute after:inset-0 after:rounded-[1.25rem] sm:block sm:px-6 sm:pt-6 sm:pb-0 [&::-webkit-details-marker]:hidden">
                  <h3 className="font-display text-[1.0625rem] leading-snug text-page-ink">{idea.heading}</h3>
                  <Heart aria-hidden="true" className="size-4 shrink-0 text-page-accent transition-[fill] duration-200 group-open:fill-current sm:absolute sm:bottom-5 sm:left-1/2 sm:-translate-x-1/2" strokeWidth={1.6} />
                </summary>
                <div data-reveal className="relative px-5 pt-1 pb-5 sm:px-6 sm:pt-3 sm:pb-12">
                  <p className="text-page-label text-page-body">{fieldName(idea.borrow.field)}</p>
                  <p className="mt-1.5 font-hand text-[1.45rem] leading-[1.15] text-page-ink">{idea.borrow.line}</p>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * The picture of "The experience": the page art's `experience-flatlay`, a larger phone lying on
 * lilies with a polaroid resting on it, and the sample photo laid into the polaroid by the
 * render's own matrix. On a phone it is drawn wider than the screen and most of it is off the
 * sides, so `sizes` asks for less than it is drawn at: the half-size file is sharp enough there.
 */
function ExperienceFlatlay({ flowers }: { flowers: Flowers }) {
  const art = pageArt("experience-flatlay", flowers);
  const photo = art.slots.photo;
  return (
    <div data-flatlay="experience" className="relative" style={{ aspectRatio: `${art.width} / ${art.height}` }}>
      <span data-decor="experience-flatlay" className="absolute inset-0 block">
        <CutoutImg src={art.src1x} srcSet={artSrcSet(art)} sizes="(min-width: 1024px) 50vw, 80vw" width={art.width} height={art.height} className="block w-full" />
      </span>
      {photo ? (
        <div className="absolute overflow-hidden" style={slotStyle(art, photo)}>
          <Image src={SAMPLE_PHOTO.src} alt="" fill sizes="(min-width: 1024px) 220px, 45vw" className="object-cover" />
        </div>
      ) : null}
    </div>
  );
}

/** (4) The experience: the deeper band with soft curved edges, a large picture and three checks. */
export async function Experience({ manifest, locale, flowers }: { manifest: TemplateManifest; locale: GiftLocale; flowers: Flowers }) {
  const t = await getTranslations({ locale, namespace: "templates.guide" });
  const checks = [t("experienceCheck1"), t("experienceCheck2"), t("experienceCheck3")];
  return (
    <section className="relative" aria-labelledby="template-experience">
      <BandEdge side="top" className="text-page-band" />
      {/* Clipped: on a desk the phone's foot runs off the band, under its curved lower edge, as the mock-up has it. */}
      <div className="relative isolate -mt-px overflow-hidden bg-page-band">
        <div className="container-x grid items-center gap-y-6 pt-4 pb-20 sm:pb-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)] lg:gap-x-12 lg:pt-0 lg:pb-0">
          {/* The picture is wider than its column and runs off the page's left side and under the band's lower edge. */}
          <div className="-mx-[14%] sm:mx-auto sm:w-[34rem] lg:-mt-6 lg:-mb-[9%] lg:-ml-[24%] lg:mr-[-4%] lg:w-auto">
            <ExperienceFlatlay flowers={flowers} />
          </div>
          <div className="lg:py-24">
            <p className="text-page-label text-page-body">{t("experienceLabel")}</p>
            <h2 id="template-experience" className="mt-4 display-xl text-balance text-page-ink">
              {t("experienceHeading")}
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-page-body">{t("experienceBody", { name: manifest.name[locale] })}</p>
            <ul className="mt-7 flex flex-col gap-3">
              {checks.map((check) => (
                <li key={check} className="flex items-start gap-3 text-[0.9375rem] leading-snug text-page-ink">
                  <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-page-accent" />
                  {check}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <BandEdge side="bottom" className="absolute inset-x-0 -bottom-px z-10 text-page-ground" />
      </div>
    </section>
  );
}

/**
 * (5) Questions: the closed list, a plus on each row. Native <details>, every answer in the HTML
 * for a search engine, one open at a time (components/shared/faq-list.tsx says why). Under them,
 * one more closed block holds the words the page no longer shows and a search still needs: the
 * rest of the template's description, what to do with each idea or the three steps in full, and
 * the links to the days it is made for.
 */
export async function Questions({
  manifest,
  locale,
  faq,
  guide,
  about,
}: {
  manifest: TemplateManifest;
  locale: GiftLocale;
  faq: { q: string; a: string }[];
  guide: TemplateGuideContent | null;
  /** What of the template's description the hero had no room for. */
  about: string;
}) {
  const t = await getTranslations({ locale });
  const g = await getTranslations({ locale, namespace: "templates.guide" });
  const { photos, music, countdown, surprise } = manifest.features;
  // Without a guide the block holds the three steps in full, as far as its 180 words allow after the
  // description: how it is sent first, then the photos, the extras, the song, and the advice last.
  const steps = guide
    ? []
    : fitSentences(
        [g("step1Body", { min: photos.min, max: photos.max }), music ? g("step1Music") : null, g("step2Body"), countdown && surprise ? g("step2Extras") : null, g("step3Body")],
        [4, 0, 3, 1, 2],
        CLOSED_BLOCK_WORDS - countWords(about),
      );
  // With a guide it holds what to do with each idea, in the cards' order, as many as fit.
  const said = (idea: TemplateGuideContent["ideas"]["items"][number]) => `${idea.heading}. ${idea.how}`;
  const fitted = new Set(guide ? fitSentences(guide.ideas.items.map(said), guide.ideas.items.map((_, i) => i), CLOSED_BLOCK_WORDS - countWords(about)) : []);
  const row = "flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-4 text-left text-[0.9375rem] font-medium text-page-ink [&::-webkit-details-marker]:hidden";
  const plus = "size-4 shrink-0 text-page-body transition-transform duration-200 group-open:rotate-45";
  return (
    <section className="relative" aria-labelledby="template-questions">
      <div className={cn(SPREAD, "pt-16 pb-20 sm:pt-20 lg:pt-28 lg:pb-44")}>
        <Intro id="template-questions" label={g("faqLabel")} heading={g("faqTitle")} line={g("faqLine")} />
        <div className="border-t border-page-line">
          {faq.map((item) => (
            <details key={item.q} name={`faq-${manifest.slug}`} className="group border-b border-page-line">
              <summary className={row}>
                {item.q}
                <Plus aria-hidden="true" className={plus} strokeWidth={1.6} />
              </summary>
              <p data-reveal className="max-w-2xl pr-8 pb-5 text-[0.9375rem] leading-relaxed text-page-body">
                {item.a}
              </p>
            </details>
          ))}
          <details data-more-about className="group border-b border-page-line">
            <summary className={cn(row, "text-page-body")}>
              {g("moreAbout", { name: manifest.name[locale] })}
              <Plus aria-hidden="true" className={plus} strokeWidth={1.6} />
            </summary>
            <div data-reveal className="max-w-2xl pr-8 pb-5 text-[0.9375rem] leading-relaxed text-page-body">
              {about ? <p className="mb-3">{about}</p> : null}
              {guide ? (
                <ul className="flex flex-col gap-1.5">
                  {guide.ideas.items
                    .filter((idea) => fitted.has(said(idea)))
                    .map((idea) => (
                      <li key={idea.heading}>
                        <span className="text-page-ink">{idea.heading}.</span> {idea.how}
                      </li>
                    ))}
                </ul>
              ) : (
                <ol className="flex flex-col gap-1.5">
                  {steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              )}
              <p className="mt-3">
                {g("madeFor")}{" "}
                {manifest.occasions.map((o, i) => (
                  <span key={o}>
                    {i > 0 ? ", " : null}
                    <Link href={`/occasions/${o}`} className="inline-flex min-h-11 items-center text-page-ink underline decoration-page-line underline-offset-4 hover:decoration-page-ink">
                      {t(`occasions.${o}`)}
                    </Link>
                  </span>
                ))}
                .
              </p>
              {manifest.slug === "the-letter" ? (
                // The Letter has a page in Portuguese (content/pt-letter.ts): a link here is how a crawler finds it.
                <p>
                  <a href={PT_LETTER_PATH} hrefLang={PT_LETTER_LANG} lang={PT_LETTER_LANG} className="inline-flex min-h-11 items-center underline decoration-page-line underline-offset-4 hover:text-page-ink">
                    Também em português: carta digital
                  </a>
                </p>
              ) : null}
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}

/** (6) More like this: four tall poster cards with the gifts' names, made for the same day. */
export async function MoreLikeThis({ manifest, locale, flowers }: { manifest: TemplateManifest; locale: GiftLocale; flowers: Flowers }) {
  const t = await getTranslations({ locale, namespace: "templates.guide" });
  const occasion = manifest.occasions[0];
  const more = (occasion ? listManifests({ occasion }) : listManifests()).filter((m) => m.slug !== manifest.slug).slice(0, 4);
  if (more.length === 0) return null;
  return (
    <section className="relative" aria-labelledby="template-more">
      <BandEdge side="top" className="text-page-raised" />
      <div className="relative -mt-px bg-page-raised">
        <ArtLayer items={MORE_ART} flowers={flowers} />
        <div className={cn(SPREAD, "pt-12 pb-20 sm:pb-24 lg:pt-16 lg:pb-28")}>
          <Intro id="template-more" label={t("moreTitle")} heading={t("moreHeading")} />
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 lg:gap-x-6">
            {more.map((m) => (
              <li key={m.slug}>
                <Link href={`/templates/${m.slug}`} className="group block rounded-[1.25rem]">
                  <span className="relative block aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-page-band shadow-page-card transition-[translate,box-shadow] duration-300 ease-(--ease-out-quint) group-hover:-translate-y-1 group-hover:shadow-page-lift">
                    {/* The tagline says what the poster shows; Bing flags an empty alt on a linked picture. */}
                    <Image src={m.thumbnail.poster} alt={m.tagline[locale]} fill sizes="(min-width: 1280px) 190px, (min-width: 640px) 22vw, 45vw" className="object-cover object-[50%_32%]" />
                  </span>
                  <span className="mt-3.5 block font-display text-xl leading-tight text-page-ink">{m.name[locale]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
