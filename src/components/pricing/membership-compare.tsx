import type { ReactNode } from "react";
import { ArrowRight, Check, Minus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { FREE_SAVED_DATES, formatAmount, membershipAmount, type Currency } from "@/lib/pricing/products";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { SealMark } from "./seal-mark";

type Cell = boolean | ReactNode;
type Row = { key: "ideas" | "plan" | "saved" | "shared" | "reminders" | "maps" | "templates" | "packs" | "ldr" | "price"; free: Cell; forTwo: Cell };

/**
 * Free next to Ethos for Two, the way Wanderlog lays its plans side by side: a real table, one row
 * per thing you can do, so the first four rows say at a glance that finding, planning and sending a
 * date costs nothing. The membership's column wears the hero's dusk, with gold checks.
 */
export async function MembershipCompare({
  currency,
  subscriptions,
  freeTemplates,
  templateCount,
}: {
  currency: Currency;
  subscriptions: boolean;
  /** The free templates' names, in the page's language. */
  freeTemplates: string[];
  templateCount: number;
}) {
  const t = await getTranslations("membership.compare");
  const locale = (await getLocale()) === "es" ? "es" : "en";
  const money = (minor: number) => formatAmount(minor, currency, locale);
  const names = new Intl.ListFormat(locale, { type: "conjunction" }).format(freeTemplates);

  const rows: Row[] = [
    { key: "ideas", free: true, forTwo: true },
    { key: "plan", free: true, forTwo: true },
    { key: "saved", free: t("values.upTo", { n: FREE_SAVED_DATES }), forTwo: t("values.unlimited") },
    { key: "shared", free: false, forTwo: true },
    { key: "reminders", free: false, forTwo: true },
    { key: "maps", free: false, forTwo: true },
    {
      key: "templates",
      // A phone's column can't hold "Constellations": there it's the count, from sm the names.
      free: (
        <>
          <span className="sm:hidden">{t("values.freeTemplatesCount", { free: freeTemplates.length, n: templateCount })}</span>
          <span className="hidden sm:inline">{t("values.freeTemplates", { names })}</span>
        </>
      ),
      forTwo: t("values.allTemplates", { n: templateCount }),
    },
    { key: "packs", free: t("values.freeDecks"), forTwo: t("values.everyPack") },
    { key: "ldr", free: true, forTwo: true },
    {
      key: "price",
      free: t("values.freeForGood"),
      forTwo: subscriptions
        ? t("values.priceSub", { monthly: money(membershipAmount("monthly", currency)), yearly: money(membershipAmount("yearly", currency)) })
        : t("values.pricePass", { yearly: money(membershipAmount("yearly", currency)) }),
    },
  ];

  const mark = (cell: Cell, dark: boolean) =>
    cell === true ? (
      <>
        <span aria-hidden="true" className={cn("inline-grid size-7 place-items-center rounded-full", dark ? "bg-starlight text-dusk-deep" : "bg-moss-soft text-moss")}>
          <Check className="size-4" strokeWidth={2.6} />
        </span>
        <span className="sr-only">{t("included")}</span>
      </>
    ) : cell === false ? (
      <>
        <Minus aria-hidden="true" className="inline size-4 text-forest/30" />
        <span className="sr-only">{t("notIncluded")}</span>
      </>
    ) : (
      <span className={cn("block text-[12.5px] leading-snug font-semibold break-words hyphens-auto sm:text-[14.5px]", dark ? "text-cream" : "text-forest")}>{cell}</span>
    );

  return (
    <section className="relative bg-paper pt-14 pb-20 sm:pt-20 lg:pb-28" aria-labelledby="compare-title">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center" data-reveal>
          <p className="text-eyebrow text-rose-ink">{t("eyebrow")}</p>
          <h2 id="compare-title" className="mt-4 display-lg text-balance text-forest">
            {t("title")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-ink-soft">{t("sub")}</p>
        </div>

        {/* overflow-clip, not hidden: hidden would make this box the sticky heads' scroller and pin them to nothing. */}
        <div className="mx-auto mt-10 max-w-4xl overflow-clip rounded-[28px] bg-white shadow-lift ring-1 ring-forest/5 sm:mt-12" data-reveal style={{ "--reveal-delay": "80ms" } as React.CSSProperties}>
          {/* Separate borders, not collapsed: a collapsed one is painted over the table's white, not the cell's dusk. */}
          <table className="w-full table-fixed border-separate border-spacing-0 text-left" data-testid="membership-compare">
            <caption className="sr-only">{t("title")}</caption>
            <colgroup>
              <col className="w-[45%] sm:w-[48%]" />
              <col className="w-[25%] sm:w-[22%]" />
              <col className="w-[30%] sm:w-[30%]" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className="sticky top-0 z-10 bg-white px-3.5 py-4 align-bottom text-eyebrow font-medium text-ink-soft sm:px-7 sm:py-5">
                  {t("feature")}
                </th>
                <th scope="col" className="sticky top-0 z-10 bg-white px-2 py-4 text-center align-bottom sm:px-4 sm:py-5">
                  <span className="font-display text-[19px] text-forest sm:text-[22px]">{t("free")}</span>
                </th>
                <th scope="col" className="sticky top-0 z-10 bg-dusk px-2 py-4 text-center align-bottom text-cream sm:px-4 sm:py-5">
                  <span className="flex flex-col items-center gap-1.5 sm:flex-row sm:justify-center sm:gap-2">
                    <SealMark className="size-6" />
                    <span className="font-display text-[17px] leading-tight sm:text-[22px]">{t("forTwo")}</span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className={cn(row.key === "price" && "align-top")}>
                  <th scope="row" className={cn("border-t border-line px-3.5 py-4 align-middle text-[14px] leading-snug font-medium text-forest sm:px-7 sm:text-[15.5px]", row.key === "price" && "font-semibold")}>
                    {t(`rows.${row.key}`)}
                  </th>
                  <td className="border-t border-line px-2 py-4 text-center align-middle sm:px-4">{mark(row.free, false)}</td>
                  <td className="border-t border-white/10 bg-dusk px-2 py-4 text-center align-middle sm:px-4">{mark(row.forTwo, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5" data-reveal>
          {/* In-page: a plain anchor, since the locale-aware Link would make "#for-two" the home page's. */}
          <a href="#for-two" className="btn-star inline-flex h-13 w-full items-center justify-center gap-2 rounded-full px-8 text-[15.5px] font-semibold sm:w-auto">
            {t("cta")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </a>
          <Link href="/dates" className="inline-flex min-h-11 items-center px-3 text-[15px] font-semibold text-forest underline-offset-4 hover:underline">
            {t("noAccount")}
          </Link>
        </div>
      </div>
    </section>
  );
}
