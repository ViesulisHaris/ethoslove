import { ClientMessages } from "@/i18n/client-messages";

/** Only there to send the Ethos for Two join page its share of the message catalogue (src/i18n/client-namespaces.ts). */
export default async function ForTwoLayout({ children, params }: LayoutProps<"/[locale]/for-two">) {
  const { locale } = await params;
  return (
    <ClientMessages scope="(marketing)/for-two/layout" locale={locale}>
      {children}
    </ClientMessages>
  );
}
