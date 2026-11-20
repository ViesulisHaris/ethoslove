/**
 * Single source of truth for brand identity.
 * Change the name here and it propagates everywhere (metadata, emails, watermark, QR).
 */
export const BRAND = {
  name: "Ethos",
  legalName: "Ethos Love",
  tagline: {
    en: "Gifts that open like a story.",
    es: "Regalos que se abren como una historia.",
  },
  /**
   * What Ethos makes, set like a maker's mark: under the footer's wordmark, over the front page's
   * headline, and for machines (the Organization's slogan, the first words of /llms.txt). A quiet
   * signature in a few chosen places, never a banner and never in a page title (the owner, 20 Nov
   * 2026: "sleek, so it doesn't ruin it"). Read it from here and nowhere else.
   */
  categoryLine: {
    en: "Digital cards by Tryethos",
    es: "Tarjetas digitales de Tryethos",
  },
  domain: "tryethos.io",
  supportEmail: "support@secuora.xyz",
  /**
   * Profiles that exist and are ours: they become the Organization's `sameAs`, which is how search
   * engines and AI assistants tie "Ethos" the gift site to its accounts. Only add one once it is
   * live — instagram.com/tryethos didn't exist (checked 19 Sep 2026), and a dead link here tells
   * them the wrong thing about who we are.
   */
  socials: {
    tiktok: "https://www.tiktok.com/@tryethos",
    youtube: "https://www.youtube.com/@tryethos",
    // The shop the templates are also sold in (open since 27 Oct 2026) and the account that pins
    // every new page (since 28 Oct 2026); both checked live on 20 Nov 2026.
    etsy: "https://www.etsy.com/shop/TryEthos",
    pinterest: "https://www.pinterest.com/tryethosgifts/",
  },
  /** Shown on free-tier gifts. Keep it short; it is the viral hook. */
  watermark: {
    en: "Made with Ethos",
    es: "Hecho con Ethos",
  },
} as const;

export type Brand = typeof BRAND;
