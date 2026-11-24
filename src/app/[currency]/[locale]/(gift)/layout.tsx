import type { Viewport } from "next";
import { setRequestLocale } from "next-intl/server";
import { DocumentMark } from "@/components/shared/document-mark";

/**
 * Not repainted by a browser's forced dark mode: a gift keeps the colours it was made in. The meta
 * tag is read before the page is drawn; `data-gift-route` on <html> carries the same into the CSS (globals.css).
 */
export const viewport: Viewport = { colorScheme: "only light" };

/** Recipient pages: no chrome at all. Templates own the full viewport. */
export default async function GiftLayout({ children, params }: LayoutProps<"/[currency]/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      {/* For the whole document's rules on a gift route (globals.css, :root[data-gift-route]). */}
      <DocumentMark on="html" name="data-gift-route" />
      <div data-gift-page className="min-h-dvh bg-night text-paper">
        {children}
      </div>
    </>
  );
}
