import { setRequestLocale } from "next-intl/server";
import { ClientMessages } from "@/i18n/client-messages";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { StickyCta } from "@/components/marketing/sticky-cta";
import { RevealRoot } from "@/components/motion/reveal-root";
import { TourMount } from "@/components/tour/tour-mount";

export default async function MarketingLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <ClientMessages scope="(marketing)/layout" locale={locale}>
      {/* The header floats; pages start below it, and a hero can pull itself up underneath it. */}
      <div className="flex min-h-dvh flex-col" style={{ "--header-h": "76px" } as React.CSSProperties}>
        <MarketingHeader />
        <main id="main" className="flex-1 pt-[var(--header-h)]">
          {children}
        </main>
        <MarketingFooter />
        <StickyCta />
        <RevealRoot />
        <TourMount />
      </div>
    </ClientMessages>
  );
}
