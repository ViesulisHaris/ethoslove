import { Check } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { ideaImage } from "@/lib/dates/art";
import { ideaById } from "@/lib/dates/ideas";
import { TRIPS, tripImageSm } from "@/lib/trips/presets";
import type { Currency, MembershipPlan } from "@/lib/pricing/products";
import { Cutout, FloralFrame } from "@/components/marketing/home/cutouts";
import { PlayingCard, type BackTone } from "@/components/games/cards";
import { PhoneFrame } from "@/components/shared/phone-frame";
import { MembershipOffer } from "./membership-offer";
import { SealMark } from "./seal-mark";

/**
 * Ethos for Two on /pricing (remade 24 Nov 2026, PLAN-pricing.md 3): one band in the site's own dark,
 * the wine of the front page's closing band, with the lilies at its edges, after the single gifts.
 * A spread: at the left the seal, the label, the heading, one line, three ticks and the offer (the
 * plan, the price, the button and what happens); at the right the collage of what the membership
 * is. The rest of what it holds is in the table under it.
 *
 * Server-rendered: the words, the list and the collage cost the phone nothing; only the offer
 * itself (the plan, the price, the button, who is signed in) is a client island.
 */
export async function MembershipHero({
  currency,
  paymentsEnabled,
  subscriptions,
  initialPlan,
  highlight,
  renewAsked = false,
}: {
  currency: Currency;
  paymentsEnabled: boolean;
  /** STRIPE_SUBSCRIPTIONS_ENABLED, read on the server: off, it sells the one-time year. */
  subscriptions: boolean;
  initialPlan: MembershipPlan;
  highlight: boolean;
  renewAsked?: boolean;
}) {
  const t = await getTranslations("membership");
  // Three short ticks; all six things it holds are rows of the table under the band.
  const ticks = (await getTranslations("pricing.page")).raw("forTwoTicks") as string[];

  return (
    <section
      id="for-two"
      data-testid="membership-hero"
      aria-labelledby="for-two-title"
      className="relative isolate scroll-mt-[var(--header-h)] overflow-hidden bg-forest text-cream"
    >
      <FloralFrame frame="forTwo" ground="dark" />
      <div className="relative container-x grid items-center gap-x-10 gap-y-12 py-20 sm:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:py-28 xl:gap-x-16">
        <div className="min-w-0 lg:max-w-[33rem]">
          <p className="flex items-center gap-2.5 text-page-label text-cream/75">
            <SealMark className="size-7" />
            {t("hero.eyebrow")}
          </p>
          <h2 id="for-two-title" className="mt-5 max-w-[13em] font-display text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.02] tracking-[-0.028em] text-balance text-cream">
            {t.rich("hero.title", { em: (chunks) => <em>{chunks}</em> })}
          </h2>
          <h3 className="sr-only">{t("features.title")}</h3>
          <ul className="mt-6 flex flex-col gap-2.5 sm:mt-7">
            {ticks.map((tick) => (
              <li key={tick} className="flex items-start gap-2.5 text-[0.9375rem] leading-snug text-cream/90">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-starlight" strokeWidth={2.2} />
                <span>{tick}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 max-w-[30rem]">
            <MembershipOffer
              currency={currency}
              paymentsEnabled={paymentsEnabled}
              subscriptions={subscriptions}
              initialPlan={initialPlan}
              highlight={highlight}
              renewAsked={renewAsked}
            />
          </div>
        </div>

        <div className="min-w-0">
          <MembershipArt />
        </div>
      </div>
    </section>
  );
}

const PACK_BACKS: BackTone[] = ["gold", "ocean", "wine"];
const POSTERS = ["birthday-cinema", "constellations", "bouquet"] as const;

/**
 * What the membership is, shown with the site's own things rather than drawn: a phone open on My
 * dates (real pictures, real words in the page's language, the partner's initial on a card), the
 * planetarium from the dates ideas as a polaroid, three real template posters fanned out, the three
 * game packs' card backs, and a few scraps from the collage templates: felt stars, the gift tag and
 * the paper couple on the horizon. Measured in the box's own width (container units), so it is one
 * composition from a phone to a wide screen and nothing moves as the pictures arrive. Decorative as
 * a whole: the list beside it says the same in words.
 */
async function MembershipArt() {
  const t = await getTranslations("membership.hero.art");
  const locale = (await getLocale()) === "es" ? "es" : "en";
  const picnic = ideaById("golden-hour-picnic");
  const museum = ideaById("museum-then-wine");
  const lisbon = TRIPS.find((trip) => trip.id === "lisbon-slow-weekend");
  // The trip second: the third card runs off the phone's foot under the packs and the paper couple, and the one
  // card that shows a trip is saved too must be in sight (the deep test of 24 Nov 2026, D7).
  const cards = [
    { image: ideaImage("golden-hour-picnic"), title: picnic?.title[locale] ?? "", meta: `${t("cities.paris")} · ${t("saturday")}`, count: t("stops", { n: 4 }), trip: false, from: true },
    { image: lisbon?.image ? tripImageSm(lisbon.image) : ideaImage("pasta-and-a-slow-walk"), title: lisbon?.title[locale] ?? "", meta: t("trip"), count: t("days", { n: lisbon?.days ?? 3 }), trip: true, from: false },
    { image: ideaImage("museum-then-wine"), title: museum?.title[locale] ?? "", meta: `${t("cities.rome")} · ${t("friday")}`, count: t("stops", { n: 3 }), trip: false, from: false },
  ];

  return (
    <div aria-hidden="true" data-flatlay="for-two" className="relative mx-auto aspect-[20/21] w-full max-w-[600px] select-none [container-type:inline-size]">
      {/* the night out, as a polaroid */}
      <figure className="absolute top-[7cqw] left-[1cqw] w-[45cqw] -rotate-[7deg] rounded-[1.2cqw] bg-photo-paper p-[2cqw] pb-[1.4cqw] shadow-dusk-photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ideaImage("stars-and-planets")} alt="" width={960} height={720} loading="lazy" decoding="async" className="aspect-[5/4] w-full rounded-[0.5cqw] object-cover" />
        <figcaption className="mt-[1.2cqw] text-center font-hand text-[4.4cqw] leading-none text-dusk">{t("polaroid")}</figcaption>
      </figure>

      {/* every template: three real posters, fanned */}
      <div className="absolute top-[63cqw] left-[3cqw] h-[36cqw] w-[44cqw]">
        {POSTERS.map((slug, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={slug}
            src={`/templates/${slug}/poster.jpg`}
            alt=""
            width={1170}
            height={1800}
            loading="lazy"
            decoding="async"
            className="absolute top-0 w-[19.5cqw] rounded-[1.6cqw] object-cover shadow-dusk-poster ring-[0.5cqw] ring-photo-paper/90"
            style={{ left: `${i * 11}cqw`, rotate: `${[-12, -2, 9][i]}deg`, translate: `0 ${[1.5, 0, 2][i]}cqw`, zIndex: i === 1 ? 2 : 1 }}
          />
        ))}
        <span className="absolute -bottom-[1cqw] left-[9cqw] z-10 rounded-full bg-starlight px-[2.2cqw] py-[0.9cqw] text-[2.5cqw] font-bold whitespace-nowrap text-dusk-deep shadow-dusk-label">
          {t("templates")}
        </span>
      </div>

      {/* the phone: My dates, shared */}
      <div className="absolute top-[2cqw] right-[4cqw] z-10 rotate-[4deg]">
        <PhoneFrame width="44cqw" screenClassName="bg-paper">
          <div className="flex h-full flex-col bg-paper px-[2.2cqw] pt-[9.5cqw] text-forest">
            <div className="flex items-end justify-between gap-[1cqw]">
              <div className="min-w-0">
                <p className="font-display text-[4.2cqw] leading-none">{t("myDates")}</p>
                <p className="mt-[0.9cqw] truncate text-[1.9cqw] text-forest/65">{t("shared", { name: t("partner") })}</p>
              </div>
              <span className="flex shrink-0 -space-x-[0.9cqw]">
                <span className="grid size-[5cqw] place-items-center rounded-full bg-horizon text-[2.1cqw] font-bold text-dusk-deep ring-[0.4cqw] ring-paper">A</span>
                <span className="grid size-[5cqw] place-items-center rounded-full bg-forest text-[2.1cqw] font-bold text-starlight ring-[0.4cqw] ring-paper">S</span>
              </span>
            </div>
            <ul className="mt-[2.4cqw] grid gap-[2.2cqw]">
              {cards.map((card) => (
                <li key={card.title}>
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={card.image} alt="" width={800} height={600} loading="lazy" decoding="async" className="aspect-[16/10] w-full rounded-[2cqw] object-cover" />
                    <span className="absolute top-[1.2cqw] left-[1.2cqw] rounded-full bg-white/90 px-[1.3cqw] py-[0.4cqw] text-[1.6cqw] font-semibold text-forest">{card.trip ? t("trip") : t("date")}</span>
                    {card.from ? (
                      <span className="absolute top-[1.1cqw] right-[1.1cqw] grid size-[4.2cqw] place-items-center rounded-full bg-forest text-[1.8cqw] font-bold text-starlight ring-[0.35cqw] ring-white">S</span>
                    ) : null}
                  </div>
                  <p className="mt-[1cqw] truncate text-[2.1cqw] leading-tight font-semibold">{card.title}</p>
                  <p className="mt-[0.3cqw] truncate text-[1.75cqw] leading-tight text-forest/65">
                    {card.meta} · {card.count}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </PhoneFrame>
        <Cutout id="tag-tofrom" className="absolute -top-[2cqw] -right-[3cqw] w-[16cqw] rotate-[18deg] drop-shadow-dusk-tag" />
      </div>

      {/* every pack: the three packs' card backs */}
      <div className="absolute right-[3cqw] bottom-[3cqw] z-20 h-[22cqw] w-[30cqw]">
        {PACK_BACKS.map((tone, i) => (
          <div key={tone} className="absolute bottom-0 w-[12.5cqw]" style={{ left: `${i * 8}cqw`, rotate: `${[-14, -2, 11][i]}deg`, translate: `0 ${[0, -1.4, 0.6][i]}cqw` }}>
            <PlayingCard faceDown back={tone} radius={8} className="aspect-[5/7] w-full" />
          </div>
        ))}
        <span className="absolute -bottom-[1.4cqw] left-[6cqw] z-10 rounded-full bg-starlight px-[2.2cqw] py-[0.9cqw] text-[2.5cqw] font-bold whitespace-nowrap text-dusk-deep shadow-dusk-label">
          {t("packs")}
        </span>
      </div>

      {/* the two of them, cut from an old recipe page, standing on the horizon looking up */}
      <Cutout id="paper-couple" className="absolute -bottom-[2.5cqw] left-[49.5cqw] z-30 w-[14.5cqw] rotate-[3deg] drop-shadow-dusk-tag" />

      {/* scraps: gold felt stars in the sky */}
      <Cutout id="star-felt" className="absolute top-[0cqw] left-[40cqw] w-[7cqw] -rotate-[14deg] drop-shadow-dusk-scrap" />
      <Cutout id="star-felt" className="absolute top-[52cqw] left-[1cqw] w-[4.5cqw] rotate-[12deg] opacity-90 drop-shadow-dusk-scrap" />
      <Cutout id="star-felt" className="absolute top-[58cqw] right-[0cqw] w-[4cqw] rotate-[24deg] opacity-80 drop-shadow-dusk-scrap" />
    </div>
  );
}
