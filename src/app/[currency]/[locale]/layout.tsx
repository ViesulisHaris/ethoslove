import type { Metadata, Viewport } from "next";
import { Caveat, Caveat_Brush, DM_Serif_Display, Fraunces, Homemade_Apple, JetBrains_Mono, Newsreader, Schibsted_Grotesk, Special_Elite } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { CLIENT_NAMESPACES } from "@/i18n/client-namespaces";
import { pickMessages } from "@/i18n/messages-subset";
import { SITE } from "@/config/site";
import { ogImageUrl } from "@/lib/seo";
import { env } from "@/lib/env";
import { CHARGED_CURRENCIES } from "@/lib/pricing/products";
import { Providers } from "@/components/shared/providers";
import { RefCapture } from "@/components/shared/ref-capture";
import { SiteAnalytics } from "@/components/shared/analytics";
import "../../globals.css";

// `subsets` is only what gets preloaded. Every subset is still declared, so a name like Mārtiņš
// or Łucja fetches latin-ext the moment it appears; English and Spanish never need it, and
// preloading it cost every first visit five font files (~250 KB) that no page drew.
//
// Preloaded: only what the first screen of a page draws — the body face and Newsreader, whose
// italic is the logo and the headline's second line. Every preload is fetched at high priority
// alongside the render-blocking CSS, so on slow 4G the six the site used to preload (482 KB)
// held first paint back by a second; the rest now load, with `swap`, once text asks for them.
const sans = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  style: ["normal"],
});

// The body face's italic, on its own so it isn't preloaded: no first screen sets sans text in
// italic. Same family name, so the browser pairs it with the upright face above for any italic
// that does turn up; no fallback of its own, since the upright one already declares it.
const sansItalic = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans-italic",
  display: "swap",
  style: ["italic"],
  preload: false,
  adjustFontFallback: false,
});

const display = Newsreader({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  style: ["normal", "italic"],
  axes: ["opsz"],
});

// Small labels (a card's number and price) and a few form fields: never a headline, and when it
// swaps in, a one-line label changes nothing around it.
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
  preload: false,
});

// The gift templates keep Fraunces (their type was tuned to it); the site itself uses Newsreader.
// Not preloaded: `--font-gift-display` is only ever read under `.gift-root`, so a marketing page
// was paying for a font it never draws — and LCP measured 4.4s on an audience that is 92% phones.
const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-gift-display",
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
  preload: false,
});

// Covers only, and `display: block` means it hides text while it loads — the last thing that
// should be competing with the homepage's first paint. It loads when a cover actually renders.
const coverScript = Caveat_Brush({
  weight: "400",
  subsets: ["latin", "latin-ext"],
  variable: "--font-cover",
  display: "block",
  preload: false,
});

// Handwriting on a card or two in the heroes' art; the words beside them come first.
const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-hand",
  display: "swap",
  preload: false,
});

// Lettering for scrapbook-style gifts: typewriter notes, poster headlines and a loopy script.
// Not preloaded, so marketing pages never download them; a gift fetches them when it uses them.
const typewriter = Special_Elite({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-type",
  display: "swap",
  preload: false,
});

const poster = DM_Serif_Display({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin", "latin-ext"],
  variable: "--font-poster",
  display: "swap",
  preload: false,
});

const script = Homemade_Apple({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-script",
  display: "swap",
  preload: false,
});

/**
 * One copy of every page per currency Stripe charges in, and per language. The proxy serves a visitor
 * the copy for their country (src/proxy.ts), so a page built once, statically, still shows dollars in
 * New York and euros in Riga, and a cached page can never hand one country another's prices. With
 * NEXT_PUBLIC_PRICE_CURRENCIES unset that is euros alone: the same pages as before there was a segment.
 */
export function generateStaticParams() {
  return CHARGED_CURRENCIES.flatMap((currency) => routing.locales.map((locale) => ({ currency, locale })));
}

export async function generateMetadata({
  params,
}: Omit<LayoutProps<"/[currency]/[locale]">, "children">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(SITE.url),
    title: { default: t("defaultTitle"), template: t("titleTemplate") },
    description: t("description"),
    openGraph: {
      type: "website",
      siteName: SITE.name,
      title: t("defaultTitle"),
      description: t("description"),
      locale: locale === "es" ? "es_ES" : "en_US",
      images: [{ url: ogImageUrl(locale), width: 1200, height: 630, alt: t("defaultTitle") }],
    },
    twitter: { card: "summary_large_image", site: SITE.twitterHandle, images: [ogImageUrl(locale)] },
    robots: { index: true, follow: true },
    // Absent until a token is set, which is correct: ownership proved by DNS needs no tag.
    verification: {
      ...(env.googleSiteVerification ? { google: env.googleSiteVerification } : {}),
      ...(env.bingSiteVerification ? { other: { "msvalidate.01": env.bingSiteVerification } } : {}),
    },
    icons: { apple: "/icons/apple-touch-icon.png" },
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: SITE.name },
  };
}

export const viewport: Viewport = {
  themeColor: "#F6F1E8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children, params }: LayoutProps<"/[currency]/[locale]">) {
  const { currency, locale } = await params;
  if (!hasLocale(routing.locales, locale) || !(CHARGED_CURRENCIES as string[]).includes(currency)) notFound();
  setRequestLocale(locale);
  // Only the few namespaces every page's client components read; each route group and page adds
  // its own below (src/i18n/client-namespaces.ts). Left to default, this sent the whole catalogue.
  const messages = pickMessages(await getMessages(), CLIENT_NAMESPACES.layout);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${sans.variable} ${sansItalic.variable} ${fraunces.variable} ${display.variable} ${mono.variable} ${caveat.variable} ${coverScript.variable} ${typewriter.variable} ${poster.variable} ${script.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <RefCapture />
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
          {/* Inside the provider: the consent banner is translated and reads the locale-less path. */}
          <SiteAnalytics />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
