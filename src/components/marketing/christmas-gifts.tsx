import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FINDER_PATH, christmasPicks } from "@/content/finder";
import type { Recipient } from "@/content/recipients";
import type { GiftLocale } from "@/lib/gift/schema";
import { cn } from "@/lib/utils";
import { getManifest } from "@/templates/manifests";
import { IdeasDots } from "@/components/templates/page/ideas-dots";
import { GiftPosterLink } from "@/components/templates/page/sections";
import { Intro, SPREAD } from "@/components/templates/page/spread";

/** The two people whose page gets the row: the searches that peak in December are theirs (docs/marketing/growth-build/SEO-PICTURE.md, section 3). */
export const CHRISTMAS_RECIPIENTS = ["boyfriend", "girlfriend"] as const satisfies readonly Recipient[];
export type ChristmasRecipient = (typeof CHRISTMAS_RECIPIENTS)[number];

export const hasChristmasGifts = (recipient: Recipient): recipient is ChristmasRecipient => (CHRISTMAS_RECIPIENTS as readonly Recipient[]).includes(recipient);

/**
 * "Christmas gifts for your boyfriend" (and girlfriend), on that person's page of gift ideas while
 * Christmas is in season: the search is ten times its usual size in December and the page had no
 * Christmas on it. Built from a gift's page (components/templates/page): a short left column with
 * a label, a heading, one line and one button, beside four gifts as tall pictures with their
 * names. The four are the finder's own first four for that person at Christmas, and the button
 * opens the finder on that answer, so the two never disagree. On a phone the four are one row, one
 * card to a screen, swiped sideways, with dots under it. The site's own colours: the page tokens'
 * defaults (globals.css, :root).
 */
export async function ChristmasGifts({ recipient, locale, className }: { recipient: ChristmasRecipient; locale: GiftLocale; className?: string }) {
  const t = await getTranslations({ locale, namespace: "recipients.christmas" });
  const gifts = christmasPicks(recipient).flatMap((slug) => getManifest(slug) ?? []);
  if (gifts.length === 0) return null;
  const row = `christmas-${recipient}`;
  return (
    <section className={cn("relative", className)} aria-labelledby="christmas-gifts">
      <div className={cn(SPREAD, "gap-y-7")}>
        <Intro id="christmas-gifts" label={t("label")} heading={t(`heading.${recipient}`)} line={t("line")}>
          <Link
            href={`${FINDER_PATH}?for=${recipient}&occasion=christmas`}
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-page-ink/30 px-5 text-[0.9375rem] font-medium text-page-ink transition-[background-color,border-color,scale] duration-200 ease-(--ease-out-quint) hover:border-page-ink/50 hover:bg-page-raised active:scale-[0.98]"
          >
            {t("more")}
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </Intro>
        <div className="min-w-0">
          <ul id={row} className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-5 overflow-x-auto px-5 pt-1 pb-2 scrollbar-none sm:mx-0 sm:grid sm:snap-none sm:grid-cols-4 sm:gap-x-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:gap-x-6">
            {gifts.map((m) => (
              <li key={m.slug} data-card className="w-full shrink-0 snap-start sm:w-auto">
                <GiftPosterLink manifest={m} locale={locale} sizes="(min-width: 1280px) 190px, (min-width: 640px) 22vw, 90vw" />
              </li>
            ))}
          </ul>
          <IdeasDots target={row} count={gifts.length} className="mt-3 sm:hidden" />
        </div>
      </div>
    </section>
  );
}
