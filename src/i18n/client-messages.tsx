import { getMessages } from "next-intl/server";
import { GROUP_WORDS, messagesForScope, type ClientScope } from "./client-namespaces";
import { pickMessages } from "./messages-subset";
import { MergeMessages } from "./merge-messages";

/**
 * Sends the browser the part of the catalogue that the client components under this route file
 * read (src/i18n/client-namespaces.ts), on top of what the layouts above it already sent.
 * The locale is passed in rather than read, so a statically rendered layout doesn't have to
 * call setRequestLocale first. A group card's words are never among them (GROUP_WORDS).
 */
export async function ClientMessages({ scope, locale, children }: { scope: ClientScope; locale: string; children: React.ReactNode }) {
  const all = await getMessages({ locale });
  return <MergeMessages messages={messagesForScope(all, scope)}>{children}</MergeMessages>;
}

/**
 * A group card's words, for a page that can draw its panel: the editor of a template made for group
 * cards, and the development previews. Wrapped round only that, so the words are in no other page's
 * source.
 */
export async function GroupMessages({ locale, children }: { locale: string; children: React.ReactNode }) {
  const all = await getMessages({ locale });
  return <MergeMessages messages={pickMessages(all, GROUP_WORDS.browser)}>{children}</MergeMessages>;
}
