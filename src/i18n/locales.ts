/**
 * The site's languages as plain values, importing nothing. routing.ts builds next-intl's routing
 * from them; the root error screen reads them directly, because it has to render when the site's
 * own script failed to download, and every module it imports is one more chunk that could have
 * failed with the rest (see global-error.tsx).
 */
export const LOCALES = ["en", "es"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
