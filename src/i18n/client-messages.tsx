import { getMessages } from "next-intl/server";
import { CLIENT_NAMESPACES, type ClientScope } from "./client-namespaces";
import { pickMessages } from "./messages-subset";
import { MergeMessages } from "./merge-messages";

/**
 * Sends the browser the part of the catalogue that the client components under this route file
 * read (src/i18n/client-namespaces.ts), on top of what the layouts above it already sent.
 * The locale is passed in rather than read, so a statically rendered layout doesn't have to
 * call setRequestLocale first.
 */
export async function ClientMessages({ scope, locale, children }: { scope: ClientScope; locale: string; children: React.ReactNode }) {
  const all = await getMessages({ locale });
  return <MergeMessages messages={pickMessages(all, CLIENT_NAMESPACES[scope])}>{children}</MergeMessages>;
}
