import { ArrowRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { resumePath } from "@/components/pricing/offers";
import { getManifest } from "@/templates/manifests";

/**
 * A template paid for and not sent yet (lib/commerce/unsent.ts), at the top of My gifts: the way back
 * to it with the publish step already open. The gift itself is still only on the device it was made
 * on, so the card says to open it there. Drawn as the account page's upgrade card is, the site's one
 * call to act in a list of sections.
 */
export async function UnsentGift({ slug }: { slug: string }) {
  const t = await getTranslations("dashboard");
  const locale = (await getLocale()) === "es" ? "es" : "en";
  const name = getManifest(slug)?.name[locale] ?? slug;
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-coral/30 bg-coral/5 p-6" data-testid="unsent-gift">
      <div className="min-w-0 flex-1 basis-64">
        <h2 className="font-display text-xl">{t("unsentTitle", { template: name })}</h2>
        {/* My gifts' own grey: the brand ink-soft has no dark-theme colour (2.2:1 there). */}
        <p className="mt-1 text-sm text-muted-foreground">{t("unsentBody")}</p>
      </div>
      <Button asChild className="h-11 rounded-full px-5">
        <Link href={resumePath(slug)}>
          {t("unsentCta")}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </Button>
    </section>
  );
}
