import { ClientMessages } from "@/i18n/client-messages";

/** Only there to send the games their share of the message catalogue (src/i18n/client-namespaces.ts). */
export default async function GamesLayout({ children, params }: LayoutProps<"/[locale]/games">) {
  const { locale } = await params;
  return (
    <ClientMessages scope="(marketing)/games/layout" locale={locale}>
      {children}
    </ClientMessages>
  );
}
