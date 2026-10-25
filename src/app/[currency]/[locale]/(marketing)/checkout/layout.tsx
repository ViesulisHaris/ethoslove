import { ClientMessages } from "@/i18n/client-messages";

/** Only there to send the page a buyer comes back to from Stripe its share of the message catalogue (src/i18n/client-namespaces.ts). */
export default async function CheckoutLayout({ children, params }: LayoutProps<"/[currency]/[locale]/checkout">) {
  const { locale } = await params;
  return (
    <ClientMessages scope="(marketing)/checkout/layout" locale={locale}>
      {children}
    </ClientMessages>
  );
}
