/**
 * Numbers the way the reader writes them: "4,5" and "2,5 h" in Spanish, "4.5" and "2.5 h" in English.
 * `toFixed` always writes a full stop, which is how the pins and the idea cards came to say "1.2 km"
 * and "2.5 h" on /es while the list beside them said "1,2 km".
 */

/** A star rating, always with its one decimal: "4.0", "4,5". */
export const formatStars = (stars: number, locale: "en" | "es"): string => stars.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** A number with at most one decimal and none when it is whole: "2", "2.5", "2,5". */
export const formatShort = (n: number, locale: "en" | "es"): string => n.toLocaleString(locale, { maximumFractionDigits: 1 });

/** How long an idea takes, in hours: "2", "1.5", "1,5". */
export const ideaHours = (minutes: number, locale: "en" | "es"): string => formatShort(minutes / 60, locale);
