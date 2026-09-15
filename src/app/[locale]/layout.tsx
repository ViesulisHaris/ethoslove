import type { Metadata, Viewport } from "next";
import { Caveat, Caveat_Brush, Fraunces, JetBrains_Mono, Newsreader, Schibsted_Grotesk } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SITE } from "@/config/site";
import { ogImageUrl } from "@/lib/seo";
import { Providers } from "@/components/shared/providers";
import { RefCapture } from "@/components/shared/ref-capture";
import { SiteAnalytics } from "@/components/shared/analytics";
import "../globals.css";

const sans = Schibsted_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
  style: ["normal", "italic"],
});

const display = Newsreader({
  subsets: ["latin", "latin-ext"],
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
const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-gift-display",
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

const coverScript = Caveat_Brush({
  weight: "400",
  subsets: ["latin", "latin-ext"],
  variable: "--font-cover",
  display: "block",
});

const caveat = Caveat({
  subsets: ["latin", "latin-ext"],
  variable: "--font-hand",
  display: "swap",
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
      className={`${sans.variable} ${fraunces.variable} ${display.variable} ${mono.variable} ${caveat.variable} ${coverScript.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <RefCapture />
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
        <SiteAnalytics />
      </body>
    </html>
  );
}
