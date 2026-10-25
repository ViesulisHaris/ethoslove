import { ClientMessages } from "@/i18n/client-messages";

/** Only there to send the long-distance room their share of the message catalogue (src/i18n/client-namespaces.ts). */
export default async function LongDistanceLayout({ children, params }: LayoutProps<"/[currency]/[locale]/long-distance">) {
  const { locale } = await params;
  return (
    <ClientMessages scope="(marketing)/long-distance/layout" locale={locale}>
      {children}
    </ClientMessages>
  );
}
