import { ClientMessages } from "@/i18n/client-messages";

/** Only there to send the occasion pages their share of the message catalogue (src/i18n/client-namespaces.ts). */
export default async function OccasionsLayout({ children, params }: LayoutProps<"/[locale]/occasions">) {
  const { locale } = await params;
  return (
    <ClientMessages scope="(marketing)/occasions/layout" locale={locale}>
      {children}
    </ClientMessages>
  );
}
