import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, Ban, Mail, Megaphone, UserCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BRAND } from "@/config/brand";
import { SITE } from "@/config/site";
import { CREATOR_COMMISSION_PCT, CREATOR_PAYOUT_MIN_EUR, creatorRef } from "@/lib/commerce/creators";
import { breadcrumbNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/shared/json-ld";
import { Cutout, FloralFrame, TornEdge } from "@/components/marketing/home/cutouts";

/**
 * The standard deal, as the creators table defaults it (commission_pct): a creator with different
 * terms is set up by hand and told so. Earnings carry over until they pass the minimum, so a payout
 * is never eaten by the transfer fee. There is no follower discount: the price is everyone's price.
 */
const COMMISSION_PCT = CREATOR_COMMISSION_PCT;
const TERMS = { commission: COMMISSION_PCT, min: CREATOR_PAYOUT_MIN_EUR };
/** A creator's personal link: the ref is "c-" and their code (lib/commerce/creators.ts). */
const EXAMPLE_LINK = `${BRAND.domain}/?ref=${creatorRef("MAYA")}`;

const STEPS = ["apply", "post", "checkout", "paid"] as const;
const RULES = [
  { key: "disclose", Icon: Megaphone },
  { key: "honest", Icon: BadgeCheck },
  { key: "spam", Icon: Ban },
  { key: "adult", Icon: UserCheck },
] as const;

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/creators">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "growth.creators.meta" });
  return pageMetadata({ locale, path: "/creators", title: t("title", TERMS), description: t("description", TERMS) });
}

/**
 * The creator programme. Attribution is the creator's personal link and nothing else: the ref rides
 * along in memory to checkout (no cookie, so no consent to ask for). No codes and no discount: a code
 * shown to every viewer is a public price cut, and typed codes leak. Applying is an email with the
 * questions already in it; there is no form to keep or secure.
 */
export default async function CreatorsPage({ params }: PageProps<"/[currency]/[locale]/creators">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("growth.creators");
  const payoutMin = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(CREATOR_PAYOUT_MIN_EUR);
  const apply = `mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(t("mail.subject"))}&body=${encodeURIComponent(t("mail.body"))}`;

  return (
    <>
      <JsonLd
        nodes={[
          breadcrumbNode([
            { name: SITE.name, url: localizedUrl(locale) },
            { name: t("eyebrow"), url: localizedUrl(locale, "/creators") },
          ]),
        ]}
      />
      <section className="relative isolate -mt-[var(--header-h)] overflow-hidden bg-blush-paper pt-[var(--header-h)] text-forest">
        <FloralFrame frame="band" ground="light" />
        <div className="relative container-x grid items-center gap-14 pt-12 pb-20 sm:pt-16 lg:grid-cols-12 lg:gap-8 lg:pt-20 lg:pb-24">
          <div className="lg:col-span-7">
            <p className="text-[12px] font-medium tracking-[0.22em] text-rose-deep uppercase">{t("eyebrow")}</p>
            {/* In em, not ch, so the fallback font wraps it as Newsreader will (platform-hero.tsx): 7.8em is Newsreader's 13ch. */}
            <h1 className="mt-6 max-w-[7.8em] display-hero text-balance">
              {t("h1a")} <em className="text-rose-deep">{t("h1b", TERMS)}</em>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-forest/75 sm:text-xl">{t("sub", TERMS)}</p>
            <a href={apply} className="btn-rose mt-9 inline-flex h-13 items-center gap-2 rounded-full px-7 text-base font-semibold transition-transform hover:-translate-y-0.5">
              <Mail aria-hidden="true" className="size-4" />
              {t("apply")}
            </a>
            <p className="mt-4 max-w-md text-sm text-forest/70">{t("applyNote")}</p>

            <dl className="mt-12 grid max-w-xl grid-cols-3 gap-x-6 border-t border-forest/15 pt-7">
              {(["commission", "link", "payout"] as const).map((k) => (
                <div key={k}>
                  <dt className="font-display text-[1.7rem] leading-none tracking-tight text-forest">{t(`deal.${k}.a`, TERMS)}</dt>
                  <dd className="mt-2 text-[12px] leading-snug text-forest/70">{t(`deal.${k}.b`, TERMS)}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* the link as a ticket: what it earns, and when it's paid */}
          <div className="relative mx-auto w-full max-w-[380px] lg:col-span-5 lg:justify-self-end" aria-hidden="true">
            <div className="rotate-[-3deg] rounded-[28px] bg-white p-7 shadow-[0_40px_90px_-40px_rgba(120,20,60,0.6)] ring-1 ring-forest/5">
              <p className="text-eyebrow text-rose-deep">{t("ticket.label")}</p>
              <p className="mt-3 font-mono text-[1.15rem] leading-snug font-medium break-all text-forest">{EXAMPLE_LINK}</p>
              <div className="my-6 border-t-2 border-dashed border-forest/15" />
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="font-display text-[2rem] leading-none text-rose-deep">{COMMISSION_PCT}%</p>
                  <p className="mt-1.5 text-[12.5px] leading-snug text-forest/70">{t("ticket.you")}</p>
                </div>
                <div>
                  <p className="font-display text-[2rem] leading-none text-forest">{payoutMin}</p>
                  <p className="mt-1.5 text-[12.5px] leading-snug text-forest/70">{t("ticket.paid")}</p>
                </div>
              </div>
            </div>
            <Cutout id="bow-gingham" className="absolute -top-9 -right-3 w-24 rotate-[16deg] drop-shadow-[0_10px_16px_rgba(120,50,70,0.3)] sm:w-28" />
          </div>
        </div>
      </section>
      <TornEdge from="#FFE9EC" to="var(--brand-paper)" />

      <section className="bg-paper py-20 lg:py-28">
        <div className="container-x">
          <p className="text-eyebrow text-rose-deep">{t("how.eyebrow")}</p>
          <h2 className="display-xl mt-4 max-w-[18ch]">{t("how.title")}</h2>
          <ol className="mt-12 border-t border-line">
            {STEPS.map((key, i) => (
              <li key={key} className="grid gap-3 border-b border-line py-8 md:grid-cols-[5rem_1fr] md:items-baseline md:gap-10">
                <span className="font-display text-[2.75rem] leading-none text-rose-deep italic">0{i + 1}</span>
                <div className="max-w-2xl">
                  <h3 className="font-display text-[1.6rem] leading-tight">{t(`how.steps.${key}.title`)}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-soft sm:text-base">{t(`how.steps.${key}.body`, { ...TERMS, link: EXAMPLE_LINK })}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-y border-line bg-blush-paper py-20 lg:py-28">
        <div className="container-x grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="text-eyebrow text-rose-deep">{t("count.eyebrow")}</p>
            <h2 className="display-xl mt-4 max-w-[16ch] text-forest">{t("count.title")}</h2>
          </div>
          <div className="space-y-5 text-[16px] leading-relaxed text-forest/80 lg:col-span-7 lg:pt-2">
            <p>{t("count.link")}</p>
            <p>{t("count.browsers")}</p>
            <p>{t("count.forget")}</p>
            <p>{t("count.own")}</p>
            <p>{t("count.base", TERMS)}</p>
          </div>
        </div>
      </section>

      <section className="bg-paper py-20 lg:py-28">
        <div className="container-x">
          <p className="text-eyebrow text-rose-deep">{t("rules.eyebrow")}</p>
          <h2 className="display-xl mt-4 max-w-[18ch]">{t("rules.title")}</h2>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2">
            {RULES.map(({ key, Icon }) => (
              <li key={key} className="rounded-[28px] bg-white p-6 shadow-soft ring-1 ring-forest/5 sm:p-7">
                <span className="grid size-11 place-items-center rounded-2xl bg-rose-mist text-rose-deep">
                  <Icon aria-hidden="true" className="size-[22px]" strokeWidth={1.8} />
                </span>
                <h3 className="mt-5 font-display text-[1.5rem] leading-tight text-forest">{t(`rules.${key}.title`)}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-forest/75">{t(`rules.${key}.body`)}</p>
              </li>
            ))}
          </ul>
          <p className="mt-8 max-w-2xl text-[15px] leading-relaxed text-ink-soft">{t("rules.close")}</p>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-forest py-24 text-cream lg:py-32">
        <FloralFrame frame="closing" ground="dark" />
        <div className="container-x relative flex flex-col items-center text-center">
          <h2 className="display-hero max-w-[14ch] italic">{t("final.title")}</h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-cream/75">{t("final.body")}</p>
          <a href={apply} className="mt-10 inline-flex h-14 items-center gap-2 rounded-full bg-cream px-8 text-base font-semibold text-forest shadow-[0_18px_50px_-18px_rgba(0,0,0,0.7)] transition-transform hover:-translate-y-0.5">
            {t("apply")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </a>
          <p className="mt-5 text-sm text-cream/60">{BRAND.supportEmail}</p>
        </div>
      </section>
    </>
  );
}
