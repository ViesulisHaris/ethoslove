import { setRequestLocale } from "next-intl/server";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { StickyCta } from "@/components/marketing/sticky-cta";

export default async function MarketingLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    // The header floats; pages start below it, and a hero can pull itself up underneath it.
    <div className="flex min-h-dvh flex-col" style={{ "--header-h": "76px" } as React.CSSProperties}>
      <MarketingHeader />
      <main id="main" className="flex-1 pt-[var(--header-h)]">
        {children}
      </main>
      <MarketingFooter />
      <StickyCta />
    </div>
  );
}
