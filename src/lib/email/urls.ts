import { SITE } from "@/config/site";

/** The origin every emailed link starts with. */
export const siteUrl = (): string => (process.env.NEXT_PUBLIC_SITE_URL ?? SITE.url).replace(/\/$/, "");

/** A page on the site in the reader's language: English at the root, Spanish under /es. */
export const pageUrl = (locale: "en" | "es", path: string): string => `${siteUrl()}${locale === "es" ? "/es" : ""}${path}`;
