"use client";

import type { AbstractIntlMessages } from "next-intl";
import { NextIntlClientProvider, useLocale, useMessages } from "next-intl";
import { mergeMessages } from "./messages-subset";

/**
 * A provider that adds to the messages above it instead of replacing them, which is what a
 * nested NextIntlClientProvider does on its own. Each layout then sends only its own share of
 * the catalogue, and nothing is sent twice.
 */
export function MergeMessages({ messages, children }: { messages: AbstractIntlMessages; children: React.ReactNode }) {
  const locale = useLocale();
  const inherited = useMessages();
  return (
    <NextIntlClientProvider locale={locale} messages={mergeMessages(inherited, messages)}>
      {children}
    </NextIntlClientProvider>
  );
}
