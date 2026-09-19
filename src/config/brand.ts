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
  },
  /** Shown on free-tier gifts. Keep it short; it is the viral hook. */
  watermark: {
    en: "Made with Ethos",
    es: "Hecho con Ethos",
  },
} as const;

export type Brand = typeof BRAND;
