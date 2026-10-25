import { ClientMessages } from "@/i18n/client-messages";

/** Only there to send a shared plan their share of the message catalogue (src/i18n/client-namespaces.ts). */
export default async function PlanLayout({ children, params }: LayoutProps<"/[currency]/[locale]/plan">) {
  const { locale } = await params;
  return (
    <ClientMessages scope="(marketing)/plan/layout" locale={locale}>
      {children}
    </ClientMessages>
  );
}
