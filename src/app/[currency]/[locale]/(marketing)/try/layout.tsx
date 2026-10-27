import { ClientMessages } from "@/i18n/client-messages";

/** Only there to send the ad landing's live demo its share of the message catalogue (src/i18n/client-namespaces.ts). */
export default async function TryLayout({ children, params }: LayoutProps<"/[currency]/[locale]/try">) {
  const { locale } = await params;
  return (
    <ClientMessages scope="(marketing)/try/layout" locale={locale}>
      {children}
    </ClientMessages>
  );
}
