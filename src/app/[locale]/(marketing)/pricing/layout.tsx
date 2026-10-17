import { ClientMessages } from "@/i18n/client-messages";

/** Only there to send the pricing page its share of the message catalogue (src/i18n/client-namespaces.ts). */
export default async function PricingLayout({ children, params }: LayoutProps<"/[locale]/pricing">) {
  const { locale } = await params;
  return (
    <ClientMessages scope="(marketing)/pricing/layout" locale={locale}>
      {children}
    </ClientMessages>
  );
}
