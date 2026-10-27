import { ClientMessages } from "@/i18n/client-messages";

/** Only there to send the creator campaign page its share of the message catalogue (src/i18n/client-namespaces.ts). */
export default async function CampaignLayout({ children, params }: LayoutProps<"/[currency]/[locale]/campaign">) {
  const { locale } = await params;
  return (
    <ClientMessages scope="(marketing)/campaign/layout" locale={locale}>
      {children}
    </ClientMessages>
  );
}
