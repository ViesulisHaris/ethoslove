import { BellRing, Bookmark, Gamepad2, Gift, Route, UsersRound, type LucideIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { ideaImage } from "@/lib/dates/art";
import { ideaById } from "@/lib/dates/ideas";
import { TRIPS, tripImageSm } from "@/lib/trips/presets";
import type { Currency, MembershipPlan } from "@/lib/pricing/products";
import { Cutout, TornEdge } from "@/components/marketing/home/cutouts";
import { PlayingCard, type BackTone } from "@/components/games/cards";
import { PhoneFrame } from "@/components/shared/phone-frame";
import { MembershipOffer } from "./membership-offer";
import { SealMark } from "./seal-mark";

const FEATURES: { key: "saved" | "shared" | "templates" | "packs" | "reminders" | "maps"; Icon: LucideIcon }[] = [
  { key: "saved", Icon: Bookmark },
  { key: "shared", Icon: UsersRound },
  { key: "templates", Icon: Gift },
  { key: "packs", Icon: Gamepad2 },
  { key: "reminders", Icon: BellRing },
  { key: "maps", Icon: Route },
];

/**
 * Ethos for Two, as the top of /pricing: it is the offer the page is for. Its own colours (dusk,
 * docs/MEMBERSHIP.md 4.1) so it reads as a different thing from the rose of the one-time gifts
 * below it, and it pulls itself up under the floating header like the other heroes.
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

  return (
    <section
      id="for-two"
      data-testid="membership-hero"
      className="relative isolate -mt-[var(--header-h)] overflow-hidden bg-dusk-sky pt-[var(--header-h)] text-cream"
    >
      {/* A band of stars over the top edge, round the floating header, where no words sit. */}
      <div aria-hidden="true" className="dusk-stars absolute inset-x-0 top-0 h-36 [mask-image:linear-gradient(180deg,#000_45%,transparent)]" />
      <div aria-hidden="true" className="grain-overlay opacity-[0.14] mix-blend-overlay" />
      <div className="relative container-x grid items-start gap-x-8 gap-y-10 pt-10 pb-14 sm:pt-14 sm:pb-20 lg:grid-cols-12 lg:gap-y-8 lg:pt-16 lg:pb-28 xl:gap-x-12">
        <div className="lg:col-span-6 lg:row-span-2">
          <p className="flex items-center gap-2.5 text-eyebrow text-starlight">
            <SealMark className="size-7" />
            {t("hero.eyebrow")}
          </p>
          <h1 className="mt-5 max-w-[12em] font-display text-[clamp(2.5rem,6.4vw,4.4rem)] leading-[1] tracking-[-0.03em] text-balance text-cream lg:text-[clamp(2.75rem,4.7vw,4.4rem)]">
            {t.rich("hero.title", { em: (chunks) => <em className="text-starlight">{chunks}</em> })}
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-moonlight/80 sm:text-lg">{subscriptions ? t("hero.sub") : t("hero.subPass")}</p>

          <div className="mt-8 max-w-xl">
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

        {/* On a phone the list follows the button; on a wide screen it captions the picture above it. */}
        <div className="lg:col-span-6 lg:col-start-7 lg:row-start-2 lg:pl-4">
          <h2 className="sr-only">{t("features.title")}</h2>
          <ul className="grid max-w-xl gap-x-6 gap-y-3.5 sm:grid-cols-2">
            {FEATURES.map(({ key, Icon }) => (
              <li key={key} className="flex items-start gap-3 text-[15px] leading-snug text-cream/90">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-starlight/12 ring-1 ring-starlight/25">
                  <Icon aria-hidden="true" className="size-3.5 text-starlight" />
                </span>
                <span className="pt-1">{t(`features.${key}`)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-6 lg:col-start-7 lg:row-start-1">
          <MembershipArt />
        </div>
      </div>
      <TornEdge from="transparent" to="var(--brand-paper)" fibre="rgba(255,255,255,0.35)" />
    </section>
  );
}

const PACK_BACKS: BackTone[] = ["gold", "ocean", "wine"];
const POSTERS = ["birthday-cinema", "constellations", "bouquet"] as const;

/**
 * What the membership is, shown with the site's own things rather than drawn: a phone open on My
 * dates (real pictures, real words in the page's language, the partner's initial on a card), the
 * planetarium from the dates ideas as a polaroid, three real template posters fanned out, the three
 * game packs' card backs, and a few scraps from the collage templates. Measured in the box's own
 * width (container units), so it is one composition from a phone to a wide screen and nothing moves
 * as the pictures arrive. Decorative as a whole: the list beside it says the same in words.
 */
async function MembershipArt() {
  const t = await getTranslations("membership.hero.art");
  const locale = (await getLocale()) === "es" ? "es" : "en";
  const picnic = ideaById("golden-hour-picnic");
  const museum = ideaById("museum-then-wine");
  const lisbon = TRIPS.find((trip) => trip.id === "lisbon-slow-weekend");
  const cards = [
    { image: ideaImage("golden-hour-picnic"), title: picnic?.title[locale] ?? "", meta: `${t("cities.paris")} · ${t("saturday")}`, count: t("stops", { n: 4 }), trip: false, from: true },
    { image: ideaImage("museum-then-wine"), title: museum?.title[locale] ?? "", meta: `${t("cities.rome")} · ${t("friday")}`, count: t("stops", { n: 3 }), trip: false, from: false },
    { image: lisbon?.image ? tripImageSm(lisbon.image) : ideaImage("pasta-and-a-slow-walk"), title: lisbon?.title[locale] ?? "", meta: t("trip"), count: t("days", { n: lisbon?.days ?? 3 }), trip: true, from: false },
  ];

  return (
    <div aria-hidden="true" className="relative mx-auto aspect-[20/21] w-full max-w-[600px] select-none [container-type:inline-size]">
      {/* The stars live round the picture, never behind words: a dot beside a word reads as a full stop. */}
      <div className="dusk-stars absolute -top-[14cqw] -right-[24cqw] -bottom-[12cqw] -left-[6cqw] [mask-image:radial-gradient(closest-side,#000_62%,transparent)]" />
      {/* the night out, as a polaroid */}
      <figure className="absolute top-[7cqw] left-[1cqw] w-[45cqw] -rotate-[7deg] rounded-[1.2cqw] bg-[#fffdf8] p-[2cqw] pb-[1.4cqw] shadow-[0_4cqw_7cqw_-3cqw_rgba(4,5,20,0.75)]">
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
            className="absolute top-0 w-[19.5cqw] rounded-[1.6cqw] object-cover shadow-[0_3cqw_5cqw_-2cqw_rgba(4,5,20,0.8)] ring-[0.5cqw] ring-white/90"
            style={{ left: `${i * 11}cqw`, rotate: `${[-12, -2, 9][i]}deg`, translate: `0 ${[1.5, 0, 2][i]}cqw`, zIndex: i === 1 ? 2 : 1 }}
          />
        ))}
        <span className="absolute -bottom-[1cqw] left-[9cqw] z-10 rounded-full bg-starlight px-[2.2cqw] py-[0.9cqw] text-[2.5cqw] font-bold whitespace-nowrap text-dusk-deep shadow-[0_1cqw_3cqw_-1cqw_rgba(0,0,0,0.6)]">
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
                <p className="mt-[0.9cqw] truncate text-[1.9cqw] text-forest/60">{t("shared", { name: t("partner") })}</p>
              </div>
              <span className="flex shrink-0 -space-x-[0.9cqw]">
                <span className="grid size-[5cqw] place-items-center rounded-full bg-horizon text-[2.1cqw] font-bold text-dusk-deep ring-[0.4cqw] ring-paper">A</span>
                <span className="grid size-[5cqw] place-items-center rounded-full bg-dusk text-[2.1cqw] font-bold text-starlight ring-[0.4cqw] ring-paper">S</span>
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
                      <span className="absolute top-[1.1cqw] right-[1.1cqw] grid size-[4.2cqw] place-items-center rounded-full bg-dusk text-[1.8cqw] font-bold text-starlight ring-[0.35cqw] ring-white">S</span>
                    ) : null}
                  </div>
                  <p className="mt-[1cqw] truncate text-[2.1cqw] leading-tight font-semibold">{card.title}</p>
                  <p className="mt-[0.3cqw] truncate text-[1.75cqw] leading-tight text-forest/60">
                    {card.meta} · {card.count}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </PhoneFrame>
        <Cutout id="tag-tofrom" className="absolute -top-[2cqw] -right-[3cqw] w-[16cqw] rotate-[18deg] drop-shadow-[0_1.5cqw_2cqw_rgba(0,0,0,0.45)]" />
      </div>

      {/* every pack: the three packs' card backs */}
      <div className="absolute right-[3cqw] bottom-[3cqw] z-20 h-[22cqw] w-[30cqw]">
        {PACK_BACKS.map((tone, i) => (
          <div key={tone} className="absolute bottom-0 w-[12.5cqw]" style={{ left: `${i * 8}cqw`, rotate: `${[-14, -2, 11][i]}deg`, translate: `0 ${[0, -1.4, 0.6][i]}cqw` }}>
            <PlayingCard faceDown back={tone} radius={8} className="aspect-[5/7] w-full" />
          </div>
        ))}
        <span className="absolute -bottom-[1.4cqw] left-[6cqw] z-10 rounded-full bg-starlight px-[2.2cqw] py-[0.9cqw] text-[2.5cqw] font-bold whitespace-nowrap text-dusk-deep shadow-[0_1cqw_3cqw_-1cqw_rgba(0,0,0,0.6)]">
          {t("packs")}
        </span>
      </div>

      {/* scraps: gold felt stars in the sky */}
      <Cutout id="star-felt" className="absolute top-[0cqw] left-[40cqw] w-[7cqw] -rotate-[14deg] drop-shadow-[0_1cqw_1.5cqw_rgba(0,0,0,0.4)]" />
      <Cutout id="star-felt" className="absolute top-[52cqw] left-[1cqw] w-[4.5cqw] rotate-[12deg] opacity-90 drop-shadow-[0_1cqw_1.5cqw_rgba(0,0,0,0.4)]" />
      <Cutout id="star-felt" className="absolute top-[58cqw] right-[0cqw] w-[4cqw] rotate-[24deg] opacity-80 drop-shadow-[0_1cqw_1.5cqw_rgba(0,0,0,0.4)]" />
    </div>
  );
}
