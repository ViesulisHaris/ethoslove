import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import SiteNotFound from "@/app/[currency]/[locale]/not-found";
import { GroupLinkGone } from "@/components/group/link-gone";
import { groupGiftsEnabled } from "@/lib/group/flag";

/**
 * An address under /c/ that opens nothing (page.tsx calls notFound() for every such case, and the
 * answer is a 404 either way). While group cards are off there is no such page on the site, so this
 * is the site's own "not found", exactly as before (on the site's own ground: this file sits inside
 * the gift pages' night-coloured layout, which the site's page was never drawn in). Once they are on, a link that was reset or
 * mistyped says what to do about it (components/group/link-gone.tsx), in the reader's language: the
 * address has none in it (/c/… is never redirected to one), so their browser's first language decides
 * unless the address was asked for under /es.
 */
export default async function GroupLinkNotFound() {
  if (!groupGiftsEnabled())
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <SiteNotFound />
      </div>
    );
  const [locale, asked] = await Promise.all([getLocale(), headers()]);
  const spanish = locale === "es" || /^\s*es\b/i.test(asked.get("accept-language") ?? "");
  return <GroupLinkGone locale={spanish ? "es" : "en"} />;
}
