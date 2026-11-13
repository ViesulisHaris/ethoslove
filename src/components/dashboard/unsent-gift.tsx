import { ArrowRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { resumePath } from "@/components/pricing/offers";
import { getManifest } from "@/templates/manifests";

/**
 * A template paid for and not sent yet (lib/commerce/unsent.ts), at the top of My gifts: the way back
 * to it with the publish step already open. The gift itself is still only on the device it was made
 * on, so the card says to open it there.
 */
export async function UnsentGift({ slug }: { slug: string }) {
  const t = await getTranslations("dashboard");
  const locale = (await getLocale()) === "es" ? "es" : "en";
  const name = getManifest(slug)?.name[locale] ?? slug;
  return (
    <div className="rounded-3xl border border-coral/30 bg-accent p-6 sm:p-7" data-testid="unsent-gift">
      <p className="font-display text-xl sm:text-2xl">{t("unsentTitle", { template: name })}</p>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">{t("unsentBody")}</p>
      <Button asChild className="mt-5 rounded-full">
        <Link href={resumePath(slug)}>
          {t("unsentCta")}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
