import { ClientMessages } from "@/i18n/client-messages";

/** Only there to send the gallery and the template pages their share of the message catalogue (src/i18n/client-namespaces.ts). */
export default async function TemplatesLayout({ children, params }: LayoutProps<"/[currency]/[locale]/templates">) {
  const { locale } = await params;
  return (
    <ClientMessages scope="(marketing)/templates/layout" locale={locale}>
      {children}
    </ClientMessages>
  );
}
