import { ClientMessages } from "@/i18n/client-messages";

/** Only there to send Trips and each trip their share of the message catalogue (src/i18n/client-namespaces.ts). */
export default async function TripsLayout({ children, params }: LayoutProps<"/[locale]/trips">) {
  const { locale } = await params;
  return (
    <ClientMessages scope="(marketing)/trips/layout" locale={locale}>
      {children}
    </ClientMessages>
  );
}
