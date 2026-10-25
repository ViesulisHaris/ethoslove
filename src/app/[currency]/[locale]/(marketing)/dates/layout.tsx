import { ClientMessages } from "@/i18n/client-messages";

/** Only there to send Dates and the city pages their share of the message catalogue (src/i18n/client-namespaces.ts). */
export default async function DatesLayout({ children, params }: LayoutProps<"/[currency]/[locale]/dates">) {
  const { locale } = await params;
  return (
    <ClientMessages scope="(marketing)/dates/layout" locale={locale}>
      {children}
    </ClientMessages>
  );
}
