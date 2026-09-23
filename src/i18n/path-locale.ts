import { DEFAULT_LOCALE, LOCALES, type Locale } from "./locales";

/**
 * The locale a path is in, read off its prefix (English has none). For the one screen that renders
 * outside next-intl, the root error boundary, which has only the address bar to go by. Built on
 * ./locales, not ./routing, so that screen doesn't bring next-intl's code in with it.
 */
export function pathLocale(pathname: string): Locale {
  const first = pathname.split("/")[1] ?? "";
  return (LOCALES as readonly string[]).includes(first) ? (first as Locale) : DEFAULT_LOCALE;
}
