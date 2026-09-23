import { setRequestLocale } from "next-intl/server";
import { ClientMessages } from "@/i18n/client-messages";
import { TourMount } from "@/components/tour/tour-mount";
import { SiteMotion } from "@/components/motion/site-motion";

/** The editor is full-bleed: no marketing chrome, always light. */
export default async function EditorLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <ClientMessages scope="(editor)/layout" locale={locale}>
      <div className="min-h-dvh bg-paper">
        {children}
        <TourMount />
        <SiteMotion />
      </div>
    </ClientMessages>
  );
}
