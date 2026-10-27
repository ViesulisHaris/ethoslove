import { ClientMessages } from "@/i18n/client-messages";

/** Only there to send the Etsy order page's live demo its share of the message catalogue (src/i18n/client-namespaces.ts). */
export default async function EtsyLayout({ children, params }: LayoutProps<"/[currency]/[locale]/etsy">) {
  const { locale } = await params;
  return (
    <ClientMessages scope="(marketing)/etsy/layout" locale={locale}>
      {children}
    </ClientMessages>
  );
}
