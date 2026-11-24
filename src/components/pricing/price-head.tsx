import { ArrowRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { PRODUCTS, formatAmount, type Currency } from "@/lib/pricing/products";
import { BEST_SELLERS } from "@/lib/gift/finder";
import { artSrcSet, pageArt, slotStyle } from "@/content/page-art";
import type { TemplateManifest } from "@/templates/types";
import { Link } from "@/i18n/navigation";
import { CutoutImg } from "@/components/marketing/home/cutouts";
import { ArtLayer } from "@/components/templates/page/art";
import { CoverInScreen } from "@/components/templates/page/cover-in-screen";
import { HERO_ART } from "@/components/templates/page/placements";
import { HERO_BUTTON, HERO_BUTTON_QUIET } from "@/components/templates/page/hero-art";
import { DEFAULT_PAGE_THEME } from "@/content/template-page-themes";
import { ChooseButton } from "./pricing-choice";
import { headLine, pricingGifts } from "./free-gifts";

/**
 * The site's flowers, as the pages built from a gift's page have them (spread/sections.tsx, SITE_FLOWERS). Not imported
 * from there: that module brings the playing hero phone, whose messages this page would then have to send.
 */
const SITE_FLOWERS = DEFAULT_PAGE_THEME.flowers;

/** The picture's width as the browser picks its file: half the column on a desk, the screen on a phone. */
const PHONE_SIZES = "(min-width: 1280px) 560px, (min-width: 1024px) 44vw, 92vw";

/**
 * The head of /pricing (remade 24 Nov 2026, PLAN-pricing.md 1): a gift's price, first and plainly.
 * The gallery's head pattern on the site's paper (a small label, the heading, one italic line), then
 * the price itself in the display face, one filled button and one quiet link. Beside it on a desk
 * (after the button on a phone) the gift page's phone lying on its lilies, still: a best seller's
 * cover in its screen, so the first screen shows what the money buys. No film and no tap: here it
 * is a picture, not a demo.
 *
 * With `?template=<slug>` of a paid gift, the heading names that gift, its cover is in the phone,
 * and the button is the "One gift" card's own (PricingChoice): it opens the same picker with that
 * gift chosen, as the card would.
 */
export async function PriceHead({
  currency,
  manifests,
  template,
  subscriptions,
}: {
  currency: Currency;
  manifests: TemplateManifest[];
  template?: string;
  /** Ethos for Two sold as a renewing plan: the band below then sells a subscription, so the head doesn't say there is none. */
  subscriptions: boolean;
}) {
  const t = await getTranslations("pricing.page");
  const locale = (await getLocale()) === "es" ? "es" : "en";
  // Only a paid gift is bought with "One gift": a free one's unlock is "Make it special", sold in its editor.
  const named = manifests.find((m) => m.slug === template && m.tier === "premium");
  // The best sellers in their own order: the first of them that is bought as one gift.
  const bestSeller = BEST_SELLERS.map((slug) => manifests.find((m) => m.slug === slug && m.tier === "premium")).find(Boolean);
  const cover = named ?? bestSeller ?? manifests[0];
  // What is free, as the gallery counts it; "No subscription." only while the band sells none (free-gifts.ts).
  // With a gift named, the buyer came to pay for it: no line about what is free, and no link away to it.
  const head = named ? null : headLine(pricingGifts(manifests).free, subscriptions);
  const line = head ? t(head.key, head.name ? { name: head.name.name[locale] } : undefined) : null;
  const art = pageArt("hero-flatlay", SITE_FLOWERS);
  const screen = art.slots.screen;

  return (
    <section className="relative" aria-labelledby="price-title" data-price-head>
      <ArtLayer items={HERO_ART} flowers={SITE_FLOWERS} />
      <div className="container-x relative grid items-center gap-y-6 pt-10 pb-6 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-x-10 lg:pt-10 lg:pb-0 xl:gap-x-16">
        <div className="lg:max-w-[34rem]">
          <p className="text-page-label text-page-body">{t("label")}</p>
          <h1 id="price-title" className="mt-4 max-w-[13em] font-display text-[2.25rem] leading-[1.02] tracking-[-0.028em] text-balance text-page-ink sm:text-[clamp(2.75rem,5vw,4rem)]">
            {named ? t("titleTemplate", { name: named.name[locale] }) : t("title")}
          </h1>
          {line ? <p className="mt-3 font-display text-[clamp(1.25rem,2vw,1.6rem)] leading-snug text-page-body italic sm:mt-4">{line}</p> : null}

          <p className="mt-7 flex flex-wrap items-baseline gap-x-3 gap-y-1 sm:mt-9">
            <span data-testid="head-price" className="font-display text-[3.5rem] leading-none tracking-[-0.03em] text-page-ink tabular-nums sm:text-[4.25rem]">
              {formatAmount(PRODUCTS.single.amounts[currency], currency, locale)}
            </span>
            <span className="text-[0.9375rem] text-page-body">{t("priceNote")}</span>
          </p>

          <div className="mt-7 flex flex-col items-start gap-x-6 gap-y-2 sm:flex-row sm:items-center">
            {named ? (
              <ChooseButton product="single" className={HERO_BUTTON}>
                {t("buyTemplate")}
                <ArrowRight aria-hidden="true" className="size-4" />
              </ChooseButton>
            ) : (
              <Link href="/templates" data-testid="head-make" className={HERO_BUTTON}>
                {t("make")}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            )}
            {named ? null : (
              <Link href="/templates?tier=free" className={HERO_BUTTON_QUIET}>
                {t("seeFree")}
              </Link>
            )}
          </div>
        </div>

        {/* The phone lying on its lilies, with the gift's cover laid into its screen by the render's own matrix and the render's rim over it. */}
        <div className="relative -mx-5 overflow-hidden sm:mx-0 sm:overflow-visible">
          <div data-flatlay="hero" className="relative mx-auto w-[min(30rem,118%)] max-w-none -translate-x-[4%] sm:w-[min(30rem,100%)] sm:translate-x-0 lg:w-full lg:max-w-[35rem]" style={{ aspectRatio: `${art.width} / ${art.height}` }}>
            <span data-decor="hero-flatlay" className="absolute inset-0 block">
              <CutoutImg src={art.src1x} srcSet={artSrcSet(art)} sizes={PHONE_SIZES} width={art.width} height={art.height} eager className="block w-full" />
            </span>
            {screen && cover ? (
              <div data-cover className="absolute overflow-hidden bg-night" style={slotStyle(art, screen)}>
                <CoverInScreen poster={cover.thumbnail.poster} sizes="(min-width: 1024px) 200px, 40vw" />
              </div>
            ) : null}
            {art.bezel ? <CutoutImg src={art.bezel.src1x} srcSet={`${art.bezel.src1x} ${art.width1x}w, ${art.bezel.src} ${art.width}w`} sizes={PHONE_SIZES} width={art.width} height={art.height} className="absolute inset-0 block w-full" /> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
