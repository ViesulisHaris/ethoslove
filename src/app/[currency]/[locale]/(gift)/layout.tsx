import type { Viewport } from "next";
import { setRequestLocale } from "next-intl/server";

/**
 * Not repainted by a browser's forced dark mode: a gift keeps the colours it was made in. The meta
 * tag is read before the page is drawn; `data-gift-page` carries the same into the CSS (globals.css).
 */
export const viewport: Viewport = { colorScheme: "only light" };

/** Recipient pages: no chrome at all. Templates own the full viewport. */
export default async function GiftLayout({ children, params }: LayoutProps<"/[currency]/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div data-gift-page className="min-h-dvh bg-night text-paper">
      {children}
    </div>
  );
}
