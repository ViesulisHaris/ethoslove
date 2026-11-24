import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { DayRows } from "@/components/pricing/day-rows";
import { formatMonthDay } from "@/lib/lifecycle/reminders";
import { dayAway, dayArgs, dayName, occasionIcon, occasionPath, type NextDay } from "@/lib/lifecycle/next-days";

/**
 * The gifts page's strip for an account with gifts ready (two more gifts): how many, the next two
 * days the account knows of, and one button to the first one's occasion page. Drawn on the server;
 * nothing at all when there are none.
 */
export async function GiftsReady({ count, days }: { count: number; days: NextDay[] }) {
  if (count <= 0) return null;
  const t = await getTranslations("dashboard.ready");
  const pair = await getTranslations("editor.share.pair");
  const remind = await getTranslations("lifecycle.remind");
  const locale = (await getLocale()) === "es" ? "es" : "en";
  const first = days[0];
  const make = first && first.kind !== "other" ? { href: occasionPath(first.kind), label: t("make", dayArgs(first)) } : { href: "/templates", label: t("makeAny") };
  return (
    <section className="mt-10 max-w-xl rounded-2xl border border-ink bg-card p-5" data-testid="gifts-ready">
      <div className="flex items-center gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-ink font-display text-2xl text-paper" aria-hidden="true">
          {count}
        </span>
        <div className="min-w-0">
          {/* A heading of its own on the gifts page; read aloud as one sentence ("2 gifts ready to
              make"), while the eye reads the number in the circle and the words beside it. */}
          <h2 className="font-display text-2xl leading-tight font-normal text-ink">
            <span className="sr-only">{t("countSr", { count })}</span>
            <span aria-hidden="true">{t("count", { count })}</span>
          </h2>
          <p className="mt-0.5 text-[15px] text-ink-soft">{t("line")}</p>
        </div>
      </div>
      {days.length ? (
        <DayRows
          rows={days.map((d) => ({ key: `${d.kind}-${d.month}-${d.day}-${d.name ?? ""}`, icon: occasionIcon(d.kind), name: dayName(d, pair, remind), date: formatMonthDay(d, locale), away: dayAway(d.daysAway, pair) }))}
        />
      ) : null}
      {/* Wraps rather than running past the pill: a day's name can carry a 40-character name. */}
      <Button asChild className="mt-5 h-auto min-h-12 w-full rounded-full py-3 text-center text-base whitespace-normal [overflow-wrap:anywhere]">
        <Link href={make.href}>{make.label}</Link>
      </Button>
    </section>
  );
}
