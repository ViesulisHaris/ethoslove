import type { Metadata, Viewport } from "next";
import { Caveat, Caveat_Brush, DM_Serif_Display, Fraunces, Homemade_Apple, JetBrains_Mono, Newsreader, Schibsted_Grotesk, Special_Elite } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SITE } from "@/config/site";
import { ogImageUrl } from "@/lib/seo";
import { env } from "@/lib/env";
import { Providers } from "@/components/shared/providers";
import { RefCapture } from "@/components/shared/ref-capture";
import { SiteAnalytics } from "@/components/shared/analytics";
import "../globals.css";

// `subsets` is only what gets preloaded. Every subset is still declared, so a name like Mārtiņš
// or Łucja fetches latin-ext the moment it appears; English and Spanish never need it, and
// preloading it cost every first visit five font files (~250 KB) that no page drew.
const sans = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  style: ["normal", "italic"],
});

const display = Newsreader({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  style: ["normal", "italic"],
  axes: ["opsz"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
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

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-hand",
  display: "swap",
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

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: Omit<LayoutProps<"/[locale]">, "children">): Promise<Metadata> {
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

export default async function RootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${sans.variable} ${fraunces.variable} ${display.variable} ${mono.variable} ${caveat.variable} ${coverScript.variable} ${typewriter.variable} ${poster.variable} ${script.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <RefCapture />
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
          {/* Inside the provider: the consent banner is translated and reads the locale-less path. */}
          <SiteAnalytics />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
