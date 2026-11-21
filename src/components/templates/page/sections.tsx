import type { ReactNode } from "react";
import Image from "next/image";
import { ArrowRight, Check, Heart, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { GiftLocale } from "@/lib/gift/schema";
import { SAMPLE_PHOTO, artSrcSet, pageArt, slotStyle } from "@/content/page-art";
import type { BorrowField, TemplateGuideContent } from "@/content/template-guides";
import type { TemplateSteps } from "@/content/template-steps";
import type { Flowers } from "@/content/template-page-themes";
import { FREE_NOTE_MAX_CHARS } from "@/lib/gift/free-tier";
import { listManifests } from "@/templates/manifests";
import type { FieldMeta, TemplateManifest } from "@/templates/types";
import { CutoutImg } from "@/components/marketing/home/cutouts";
import { ArtLayer, ArtWithSlot, BandEdge } from "./art";
import { IdeasToggle } from "./ideas-toggle";
import { CLOSED_BLOCK_WORDS, countWords, fitSentences } from "./lead";
import { stepQuote, type QuoteSource } from "./quote";
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

/** A photo a picture on the page shows: the gift's own first sample photo, where its demo has one. */
export type SamplePhoto = { src: string; width: number; height: number };

/**
 * One of the three pictures of "How to send", from the page art, chosen by what the step is: a
 * polaroid with the gift's sample photo laid into it for a step about photos, a note card with a
 * line of that gift in handwriting for a step about words or choices, and for sending it a small
 * phone with the gift's own cover in its screen, under the render's rim. `data-flatlay` marks
 * what is laid in as part of a picture, as a phone's screen is.
 */
function StepPicture({ kind, flowers, line, photo, poster }: { kind: "photo" | "note" | "phone"; flowers: Flowers; line: string; photo: SamplePhoto; poster: string }) {
  if (kind === "photo")
    return (
      <span data-flatlay="step" className="block w-[5.5rem] sm:w-[9.25rem]">
        <ArtWithSlot id="step-photo" flowers={flowers} slot="photo" shown="150px">
          <Image src={photo.src} alt="" fill sizes="130px" className="object-cover" />
        </ArtWithSlot>
      </span>
    );
  if (kind === "note")
    return (
      <span data-flatlay="step" className="block w-[8.25rem] sm:w-[11.5rem]">
        {/*
         * The card is a container, so the handwriting is sized by the card and keeps its place at any
         * width. Never under 12px: on a phone the card is small, and an eighth of its width was 8px
         * of handwriting, a scribble where the step shows a real value of the gift ("Berlin → Riga").
         * There the line takes a second or third row of the card.
         */}
        <ArtWithSlot id="step-note" flowers={flowers} slot="card" shown="190px" slotClassName="[container-type:inline-size]">
          <span data-note-line className="flex h-full items-center px-[9cqw] font-hand text-[max(12.5cqw,12px)] leading-[1.08] text-page-ink">{line}</span>
        </ArtWithSlot>
      </span>
    );
  return (
    <span data-flatlay="step" className="block w-[3.4rem] sm:w-[5.6rem]">
      <ArtWithSlot id="step-phone" flowers={flowers} slot="screen" shown="100px" slotClassName="bg-night">
        <Image src={poster} alt="" fill sizes="110px" className="object-cover" />
      </ArtWithSlot>
    </span>
  );
}

/** (2) How to send: three small picture cards, numbered because they are an order, each this gift's own step. */
export async function HowToSend({
  locale,
  heading,
  flowers,
  steps,
  lines,
  source,
  photo,
  poster,
}: {
  locale: GiftLocale;
  heading: string;
  flowers: Flowers;
  /** The gift's own three steps (content/template-steps.ts); without them, the three every gift shares. */
  steps: TemplateSteps | null;
  /** Lines of this gift for a note card whose step names no field. */
  lines: string[];
  /** Where a note card finds a value of the field its step is about (./quote). */
  source: QuoteSource;
  photo: SamplePhoto;
  poster: string;
}) {
  const t = await getTranslations({ locale, namespace: "templates.guide" });
  const shown: { title: string; kind: "photo" | "note" | "phone"; quote?: string | readonly string[]; sample?: string }[] = steps
    ? steps.steps.map((step) => ({ title: step[locale], kind: step.picture, quote: step.quote, sample: step.sample?.[locale] }))
    : [
        { title: t("step1Title"), kind: "photo" },
        { title: t("step2Title"), kind: "note" },
        { title: t("step3Title"), kind: "phone" },
      ];
  const pictured = shown.map((step) => ({ ...step, line: step.kind === "note" ? noteLine(step, lines, source) : "" }));
  return (
    <section className="relative" aria-labelledby="template-how">
      <ArtLayer items={HOW_ART} flowers={flowers} />
      <div className={cn(SPREAD, "py-14 sm:py-20 lg:py-28")}>
        <Intro id="template-how" label={t("eyebrow")} heading={heading} line={t("howLine")} />
        <ol className="grid gap-3 sm:grid-cols-3 sm:gap-x-9 lg:gap-x-10">
          {pictured.map((step, i) => (
            <li
              key={step.title}
              className="relative grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-x-3.5 rounded-[1.4rem] border border-page-line bg-page-raised/70 py-4 pr-4 pl-5 shadow-page-card sm:block sm:px-4 sm:pt-10 sm:pb-7 sm:text-center"
            >
              <span className="absolute top-1/2 -left-3 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-page-badge font-display text-base text-page-ink ring-4 ring-page-ground sm:-top-5 sm:left-1/2 sm:size-10 sm:-translate-x-1/2 sm:translate-y-0 sm:text-lg">
                {i + 1}
              </span>
              <h3 className="order-last font-display text-[1.25rem] leading-tight text-page-ink sm:text-[1.3rem]">{step.title}</h3>
              <span className="grid h-28 place-items-center sm:mt-5 sm:h-40">
                <StepPicture kind={step.kind} flowers={flowers} line={step.line} photo={photo} poster={poster} />
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
 * The line a note card shows. A step that names its field shows a value of that field (./quote),
 * or, where the field has nothing short enough, the short line written for that step
 * (content/template-steps.ts, `sample`). It never borrows from another field: the card under
 * "Write the fortunes" showed the lucky numbers, and "List the good deeds" a caption about a crime
 * (the deep test of 21 Nov 2026). Only a step that names no field (the three every gift shared
 * before each had its own) shows the gift's first short line.
 */
export function noteLine(step: { quote?: string | readonly string[]; sample?: string }, lines: readonly string[], source: QuoteSource): string {
  if (!step.quote) return lines[0] ?? "";
  return stepQuote(step.quote, source) ?? step.sample ?? "";
}

/**
 * What the pictures on a gift's page show of that gift: lines to write on a note card, and its
 * first sample photo. The lines are ones the product already has, never made up for the picture:
 * the gift's own lines to borrow that are short enough to read on a card that small, then the
 * title of its demo, held to the same thirty characters (Front Page's, at 35 and 40, was not).
 * The photo is the first of its demo's, or the sample every demo shares.
 */
export async function templateSamples(slug: string, locale: GiftLocale, guide: TemplateGuideContent | null): Promise<{ lines: string[]; photo: SamplePhoto; source: QuoteSource }> {
  const fits = (line: string) => line.length >= 8 && line.length <= 30;
  const lent = guide?.ideas.items.map((idea) => ({ field: idea.borrow.field as string, line: idea.borrow.line })) ?? [];
  const lines = lent.map((l) => l.line).filter(fits);
  let photo: SamplePhoto = SAMPLE_PHOTO;
  let demo: Record<string, unknown> | null = null;
  try {
    const mod = (await import(`@/templates/${slug}/demo-data`)) as { demoData?: Record<GiftLocale, { title?: string; photos?: { url: string; width?: number; height?: number }[] }> };
    const found = mod.demoData?.[locale];
    demo = (found as Record<string, unknown> | undefined) ?? null;
    if (found?.title && fits(found.title) && !lines.includes(found.title)) lines.push(found.title);
    const first = found?.photos?.[0];
    if (first?.url && first.width && first.height) photo = { src: first.url, width: first.width, height: first.height };
  } catch {
    // A template without a demo file shows the shared sample.
  }
  const options = Object.fromEntries(Object.entries(await fieldMetaOf(slug, locale)).flatMap(([key, meta]) => (meta.options ? [[key, meta.options]] : [])));
  return { lines: [...new Set(lines)], photo, source: { lent, demo, options } };
}

/** A template's own fields as its editor shows them: their names and the names of their choices. */
async function fieldMetaOf(slug: string, locale: GiftLocale): Promise<Record<string, FieldMeta>> {
  try {
    const mod = (await import(`@/templates/${slug}/field-meta`)) as { fieldMeta?: Record<GiftLocale, Record<string, FieldMeta>> };
    return mod.fieldMeta?.[locale] ?? {};
  } catch {
    return {};
  }
}

/** A template's own fields, by the names its editor gives them. */
async function fieldLabels(slug: string, locale: GiftLocale): Promise<Record<string, string>> {
  return Object.fromEntries(Object.entries(await fieldMetaOf(slug, locale)).map(([key, meta]) => [key, meta.label]));
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
              <details data-card className="group relative h-full rounded-[1.25rem] border border-page-line bg-page-raised/55 transition-colors duration-200 open:bg-page-raised hover:bg-page-raised sm:min-h-[10.25rem]">
                {/* The whole card is the button: the summary's ::after covers it, and the keyboard's ring is drawn round the card (globals.css). The heart fills when its line is showing. */}
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
 * lilies with a polaroid resting on it, and the gift's sample photo laid into the polaroid by the
 * render's own matrix. On a phone it is drawn wider than the screen and most of it is off the
 * sides, so `sizes` asks for less than it is drawn at: the half-size file (900 wide) is sharp
 * enough there. Two thirds of the screen's width, so a phone with three device pixels to a pixel
 * still picks it up to 454px wide: at "80vw" an iPhone asked for 936 and was sent the full file,
 * twice the bytes (the deep test of 21 Nov 2026).
 */
function ExperienceFlatlay({ flowers, photo: sample }: { flowers: Flowers; photo: SamplePhoto }) {
  const art = pageArt("experience-flatlay", flowers);
  const photo = art.slots.photo;
  return (
    <div data-flatlay="experience" className="relative" style={{ aspectRatio: `${art.width} / ${art.height}` }}>
      <span data-decor="experience-flatlay" className="absolute inset-0 block">
        <CutoutImg src={art.src1x} srcSet={artSrcSet(art)} sizes="(min-width: 1024px) 50vw, (min-width: 640px) 80vw, 66vw" width={art.width} height={art.height} className="block w-full" />
      </span>
      {photo ? (
        <div className="absolute overflow-hidden" style={slotStyle(art, photo)}>
          <Image src={sample.src} alt="" fill sizes="(min-width: 1024px) 220px, 45vw" className="object-cover" />
        </div>
      ) : null}
    </div>
  );
}

/** Something about a gift its sender picks from a list, by the names the editor shows: what it is called, the choices a check lists, and how many more there are. */
export type GiftChoice = { label: string; options: readonly string[]; more: number };

/** The most words a check may take to list a gift's choices, and the most choices it lists in full. */
const CHOICE_WORDS = 12;
const CHOICE_LISTED = 5;

/**
 * The choice a gift's page names in "The experience": the first of the template's own settings
 * that is picked from a list of three or more (The Letter's paper, the Music Box's tune, the room
 * behind the Frosted Window), with its choices by the editor's own names. A setting whose choices
 * make too long a line, or have a comma of their own, is passed over for the next; one with more
 * than five choices gives its first three and how many more there are. Chosen from the English
 * names (`meta`) and said in the page's (`shown`), so a gift's page names the same setting in
 * both languages.
 */
export function giftChoice(meta: Record<string, FieldMeta>, shown: Record<string, FieldMeta> = meta): GiftChoice | null {
  const picked = (key: string, take?: number): GiftChoice => {
    const all = Object.keys(meta[key].options ?? {});
    // "Cream and red, Blush and 8 more" would read as three things; a choice with an "and" of its own is not one of the three named.
    const kept = take === undefined ? all : all.filter((id) => !/ and /.test(meta[key].options![id])).slice(0, take);
    return { label: shown[key]?.label ?? meta[key].label, options: kept.map((id) => shown[key]?.options?.[id] ?? meta[key].options![id]), more: all.length - kept.length };
  };
  const lists = Object.entries(meta).filter(([, field]) => {
    const options = Object.values(field.options ?? {});
    return options.length >= 3 && options.every((option) => !option.includes(","));
  });
  for (const [key, field] of lists) {
    const options = Object.values(field.options!);
    if (options.length <= CHOICE_LISTED && countWords(`${field.label} ${options.join(" ")}`) + 1 <= CHOICE_WORDS) return picked(key);
  }
  for (const [key, field] of lists) if (Object.keys(field.options!).length > CHOICE_LISTED) return picked(key, 3);
  return null;
}

/** A gift's choice as one check: "Paper: Cream, White or Kraft", or "The page: Blush, Lilac, Baby blue and 7 more". */
export function choiceCheck(choice: GiftChoice, locale: GiftLocale, say: (key: ExperienceKey, values?: Record<string, string | number>) => string): string {
  if (choice.more > 0) return say("experienceChoiceMore", { label: choice.label, choices: choice.options.join(", "), count: choice.more });
  // "u" before "Oliva", as Spanish has it; "A, B or C" without the American comma.
  return say("experienceChoice", { label: choice.label, choices: new Intl.ListFormat(locale === "es" ? "es" : "en-GB", { style: "long", type: "disjunction" }).format(choice.options) });
}

/**
 * The three checks of "The experience", each read off the gift: what the person who gets it does
 * (its row of content/template-steps.ts), how many photos it is made of (its manifest), and a
 * third that the first has not said. For a gift that listens or feels a shake, that a finger does
 * it too (its manifest's `needs`: every such gift also takes a tap or a swipe); it used to name
 * the action again, "blow" on the page of a gift they cheer into (Cap Toss), and "shake" under a
 * first check that had just said it. For every other gift, something of its own to choose
 * (`choice`): it was "Carries the song you choose" on 50 of the 61 pages (the deep test of
 * 21 Nov 2026), which the list under the hero says anyway.
 * They were "Works on any phone or laptop", "Edit it after sending" and "Print its QR code"
 * on all 61 pages, which the three questions under the band answer anyway.
 */
export function experienceChecks(
  manifest: TemplateManifest,
  line: string | null,
  /** The free version is the short note, which has no photos (lib/gift/free-tier.ts). */
  note: boolean,
  /** The page's translator for templates.guide. Not named `t`: tests/unit/messages.test.ts checks every literal key handed to a `t` against the translator declared above it in the file. */
  say: (key: ExperienceKey, values?: Record<string, string | number>) => string,
  /** The gift's own choice, already as a line (choiceCheck). */
  choice: string | null = null,
): string[] {
  const { photos, music, needs = [] } = manifest.features;
  const made = note
    ? say("experienceNote", { chars: FREE_NOTE_MAX_CHARS })
    : photos.min === 0
      ? say("experiencePhotosNone", { max: photos.max })
      : photos.min === 1
        ? say("experiencePhotosOne", { max: photos.max })
        : say("experiencePhotosMany", { min: photos.min, max: photos.max });
  const asks = needs.includes("microphone") ? say("experienceMic") : needs.includes("deviceMotion") ? say("experienceMotion") : (choice ?? (music ? say("experienceSong") : say("experienceTouch")));
  // The line is a sentence where it is written; a check has no full stop.
  return [line ? line.replace(/\.$/, "") : say("experienceOpens"), made, asks];
}

export type ExperienceKey = "experienceOpens" | "experienceNote" | "experiencePhotosNone" | "experiencePhotosOne" | "experiencePhotosMany" | "experienceMic" | "experienceMotion" | "experienceSong" | "experienceTouch" | "experienceChoice" | "experienceChoiceMore";

/** (4) The experience: the deeper band with soft curved edges, a large picture and three checks. */
export async function Experience({ manifest, locale, flowers, photo, line, note }: { manifest: TemplateManifest; locale: GiftLocale; flowers: Flowers; photo: SamplePhoto; line: string | null; note: boolean }) {
  const t = await getTranslations({ locale, namespace: "templates.guide" });
  const say = (key: ExperienceKey, values?: Record<string, string | number>) => t(key, values);
  const choice = giftChoice(await fieldMetaOf(manifest.slug, "en"), await fieldMetaOf(manifest.slug, locale));
  const checks = experienceChecks(manifest, line, note, say, choice ? choiceCheck(choice, locale, say) : null);
  return (
    <section className="relative" aria-labelledby="template-experience">
      <BandEdge side="top" className="text-page-band" />
      {/*
       * Cut along its foot and its sides only: the picture runs off the page's left side and under the
       * band's curved lower edge, as the mock-up has it, while its top leaves lie over the upper edge
       * whole. `overflow: hidden` would cut those along a straight line.
       */}
      <div className="relative isolate -mt-px bg-page-band [clip-path:inset(-24rem_0_0_0)]">
        <div className="container-x grid items-center gap-y-6 pt-4 pb-20 sm:pb-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)] lg:gap-x-12 lg:pt-0 lg:pb-0">
          {/* The picture is wider than its column and runs off the page's left side and under the band's lower edge. */}
          <div className="-mx-[14%] sm:mx-auto sm:w-[34rem] lg:-mt-6 lg:-mb-[9%] lg:-ml-[24%] lg:mr-[-4%] lg:w-auto">
            <ExperienceFlatlay flowers={flowers} photo={photo} />
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
              {/*
               * A sentence, so each day is said as it is in one ("an anniversary", "saying sorry"): the menu's labels read "Made for Anniversary, Apology".
               * Each day is a link a thumb can hit, 44px tall, and that height is padding, not the
               * line's: as `inline-flex min-h-11` every row of the sentence stood 44px from the next,
               * double-spaced under a list set at 24 (the deep test of 21 Nov 2026). The rows are
               * 32px apart, so one link's padding stops short of the words on the row above it.
               */}
              <p className="mt-3 leading-8">
                {g("madeFor")}{" "}
                {manifest.occasions.map((o, i) => (
                  <span key={o}>
                    {i > 0 ? ", " : null}
                    <Link href={`/occasions/${o}`} className="py-[0.8125rem] text-page-ink underline decoration-page-line underline-offset-4 hover:decoration-page-ink">
                      {g(`madeForDay.${o}`)}
                    </Link>
                  </span>
                ))}
                .
              </p>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}

/**
 * The four gifts a page links to: the next four made for the same day, counted on from this gift's
 * own place in that day's list and round to its start. Every page of an occasion used to show the
 * list's first four, so The Letter and Constellations linked to the same gifts and most of the
 * list was linked from nowhere.
 *
 * A day with few gifts (Thanksgiving has two, graduation four) left a single card in a row of four.
 * So the row is topped up: from the gift's next days in turn, then from every gift, each list
 * counted on from the gift's own place in it. `full` says whether the gift's first day filled the
 * row by itself: only then is the row headed by that day.
 */
export function moreLikeThis(manifest: TemplateManifest, count = 4): TemplateManifest[] {
  return moreGifts(manifest, count).gifts;
}

export function moreGifts(manifest: TemplateManifest, count = 4): { gifts: TemplateManifest[]; full: boolean } {
  const gifts: TemplateManifest[] = [];
  let full = false;
  const lists = [...manifest.occasions.map((occasion) => listManifests({ occasion })), listManifests()];
  lists.forEach((list, i) => {
    const at = list.findIndex((m) => m.slug === manifest.slug);
    const round = at < 0 ? list : [...list.slice(at + 1), ...list.slice(0, at)];
    for (const m of round) if (gifts.length < count && m.slug !== manifest.slug && !gifts.some((g) => g.slug === m.slug)) gifts.push(m);
    if (i === 0) full = gifts.length >= count;
  });
  return { gifts, full };
}

/** (6) More like this: four tall poster cards with the gifts' names, made for the same day. */
export async function MoreLikeThis({ manifest, locale, flowers }: { manifest: TemplateManifest; locale: GiftLocale; flowers: Flowers }) {
  const t = await getTranslations({ locale, namespace: "templates.guide" });
  const { gifts: more, full } = moreGifts(manifest);
  if (more.length === 0) return null;
  // "More gifts for Thanksgiving" over a row that is half something else would not be true.
  const occasion = full ? manifest.occasions[0] : undefined;
  return (
    <section className="relative" aria-labelledby="template-more">
      <BandEdge side="top" className="text-page-raised" />
      <div className="relative -mt-px bg-page-raised">
        <ArtLayer items={MORE_ART} flowers={flowers} />
        <div className={cn(SPREAD, "pt-12 pb-20 sm:pb-24 lg:pt-16 lg:pb-28")}>
          <Intro id="template-more" label={t("moreTitle")} heading={occasion ? t(`moreFor.${occasion}`) : t("moreHeading")} />
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
