import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { GiftLocale } from "@/lib/gift/schema";
import { TEMPLATE_SLUGS, getManifest } from "@/templates/manifests";
import { AdTemplateView } from "@/components/shared/ad-pixels";
import { Button } from "@/components/ui/button";
import { TemplatePhonePreview } from "@/components/templates/template-phone-preview";
import { PRODUCTS, chargedCurrency, formatAmount } from "@/lib/pricing/products";
import { proofNumbers, shownReactions } from "@/lib/proof/proof";

/*
 * Where a paid ad lands: the gift the ad showed, playing, on the first screen, and one button.
 *
 * The template page (/templates/<slug>) is written for search: on a phone it opens with the name and a
 * paragraph, and the phone preview starts a screen further down. Someone who has just watched the gift
 * in a video ad left there three times in four (25–26 Oct). This page says the ad's own line, runs
 * the real gift where they can tap it, and keeps the price and "Make yours" docked at the bottom.
 * It's for ad links only, so it stays out of search and the sitemap.
 */

/** The proof line's count, read at most once an hour (lib/proof). */
export const revalidate = 3600;

export function generateStaticParams() {
  return TEMPLATE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: Omit<PageProps<"/[currency]/[locale]/try/[slug]">, "searchParams">): Promise<Metadata> {
  const { locale, slug } = await params;
  const manifest = getManifest(slug);
  if (!manifest) return {};
  const t = await getTranslations({ locale, namespace: "adLanding" });
  const hook = `hooks.${slug}` as const;
  return {
    title: t.has(hook) ? t(hook) : manifest.tagline[locale as GiftLocale],
    description: t("description"),
    robots: { index: false, follow: true },
  };
}

export default async function TryTemplatePage({ params }: PageProps<"/[currency]/[locale]/try/[slug]">) {
  const { currency: shown, locale, slug } = await params;
  const manifest = getManifest(slug);
  if (!manifest) notFound();
  setRequestLocale(locale);
  const l = locale as GiftLocale;
  const t = await getTranslations("adLanding");
  const tt = await getTranslations("templates");
  const tr = await getTranslations("home.reactions");
  const tm = await getTranslations("money.paywall");
  const currency = chargedCurrency(shown);
  const free = manifest.tier === "free";
  // A premium template is bought as one; a free one only ever costs its "make it special" extras.
  const price = formatAmount(PRODUCTS[free ? "extras" : "single"].amounts[currency], currency, l);
  const hook = `hooks.${slug}` as const;
  // Real reactions only, and only with three of them: no samples on a page that asks for money.
  const [numbers, reactions] = await Promise.all([proofNumbers(), shownReactions(3, l === "es" ? "es" : "en")]);
  const count = numbers ? `${new Intl.NumberFormat(locale).format(numbers.opened)}${numbers.more ? "+" : ""}` : "";

  const featureList: [boolean, string][] = [
    [true, tt("featurePhotos", { max: manifest.features.photos.max })],
    [manifest.features.music, tt("featureMusic")],
    [manifest.features.captions, tt("featureCaptions")],
    [manifest.features.countdown, tt("featureCountdown")],
    [manifest.features.surprise, tt("featureSurprise")],
    [manifest.features.video, tt("featureVideo")],
  ];
  const steps = [t("step1"), t("step2"), free ? t("step3Free") : t("step3Paid", { price })];

  return (
    <>
      {/* For the ad pixels' per-template audiences (lib/analytics/ads.ts); nothing without consent. */}
      <AdTemplateView slug={manifest.slug} tier={manifest.tier} />
      <div className="container-x pt-3 lg:pt-10">
        <h1 className="mx-auto max-w-md text-center font-display text-[1.75rem] leading-[1.15] text-balance sm:text-4xl">
          {t.has(hook) ? t(hook) : manifest.tagline[l]}
        </h1>
        {/* Above the phone, not under it: on a first visit the cookie strip covers the phone's foot,
            and a gift nobody knows is live reads as a still picture. */}
        <p className="mt-2 text-center text-sm font-medium text-coral">{t("tapHint")}</p>
        {/*
         * The phone has to fit between the heading and the dock on the first screen, so its width
         * comes from the screen's height: what's left after the header, heading, hint and dock
         * (--above: ≈ 19.5rem on a phone, more from `sm` where the heading is bigger and from `lg`
         * where the page starts lower), over the frame's 844:390. Instagram's browser on an iPhone
         * leaves about 660px, hence the small floor: 160px still shows the whole gift above the dock.
         * Never wider than 300.
         */}
        <div className="mt-3 [--above:19.5rem] sm:[--above:21.25rem] lg:[--above:23.5rem]">
          <TemplatePhonePreview
            slug={manifest.slug}
            locale={l}
            autoStart
            width="clamp(160px, (100svh - var(--above)) * 0.462, min(300px, 100vw - 2.5rem))"
          />
        </div>

        <div className="mx-auto mt-14 max-w-md pb-10">
          <h2 className="mb-4 text-eyebrow text-muted-foreground">{t("whatTheySee")}</h2>
          <p className="text-base leading-relaxed text-ink-soft">{manifest.description[l]}</p>

          {numbers ? (
            <p className="mt-10 text-lg font-semibold leading-snug text-ink" data-testid="proof-numbers">
              {numbers.opensEach
                ? tr("openedEach", {
                    count,
                    times: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(numbers.opensEach),
                  })
                : tr("opened", { count })}
            </p>
          ) : null}

          <h2 className="mt-10 mb-4 text-eyebrow text-muted-foreground">{t("stepsTitle")}</h2>
          <ol className="grid gap-4">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-base leading-relaxed">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-sm font-semibold text-paper">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          {free ? null : <p className="mt-5 text-sm text-ink-soft">{tm("guarantee")}</p>}

          {reactions.length >= 3 ? (
            <>
              <h2 className="mt-10 mb-4 text-eyebrow text-muted-foreground">{t("reactionsTitle")}</h2>
              <ul className="grid gap-3" data-testid="reactions-real">
                {reactions.map((r, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-lg border border-line bg-paper p-4">
                    <span className="text-2xl leading-none" aria-hidden="true">
                      {r.emoji}
                    </span>
                    <p className="text-sm [overflow-wrap:anywhere]">{r.text}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-mono-meta text-muted-foreground">{tr("realLabel")}</p>
            </>
          ) : null}

          <h2 className="mt-10 mb-4 text-eyebrow text-muted-foreground">{tt("included")}</h2>
          <ul className="grid gap-2">
            {featureList
              .filter(([on]) => on)
              .map(([, label]) => (
                <li key={label} className="flex items-center gap-2 text-sm">
                  <Check className="size-4 text-coral" />
                  {label}
                </li>
              ))}
          </ul>
        </div>
      </div>

      {/*
       * The dock: sticky rather than fixed, so it rides the bottom of the screen while the page is
       * read and settles above the footer at the end instead of covering its last row. The cookie
       * strip docks just above it (data-bottom-dock, globals.css).
       */}
      <div
        data-bottom-dock
        className="sticky bottom-0 z-40 border-t border-line bg-paper px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto flex max-w-md flex-col gap-2">
          {/* One line, which the cookie strip's offset (globals.css) counts on: smaller under 360px. */}
          <p className="text-center text-sm text-ink-soft max-[359px]:text-xs">
            {free ? t("priceFree", { price }) : t("pricePaid", { price })}
          </p>
          <Button asChild size="lg" className="h-12 w-full rounded-full text-base shadow-lift">
            <Link href={`/create/${manifest.slug}`}>
              {t("make")}
              <ArrowRight className="size-4" data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}
