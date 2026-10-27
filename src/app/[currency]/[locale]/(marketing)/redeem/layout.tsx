import { ClientMessages } from "@/i18n/client-messages";

/** Only there to send the gift card redeem page its share of the message catalogue (src/i18n/client-namespaces.ts). */
export default async function RedeemLayout({ children, params }: LayoutProps<"/[currency]/[locale]/redeem">) {
  const { locale } = await params;
  return (
    <ClientMessages scope="(marketing)/redeem/layout" locale={locale}>
      {children}
    </ClientMessages>
  );
}
