import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/**
 * The success page's ending after two more gifts, paid on Stripe's page: two ways on and nothing that
 * leaves by itself (the gifts wait on the account until they are wanted).
 */
export async function PairSuccessButtons() {
  const tm = await getTranslations("money.success");
  const tp = await getTranslations("editor.share.pair");
  return (
    <div className="mt-8 grid w-full max-w-sm gap-2.5" data-testid="pair-success">
      <Button asChild className="h-12 rounded-full px-6 text-base">
        <Link href="/dashboard">{tm("toGifts")}</Link>
      </Button>
      <Button asChild variant="outline" className="h-12 rounded-full px-6 text-base">
        <Link href="/templates">{tp("startAny")}</Link>
      </Button>
    </div>
  );
}
