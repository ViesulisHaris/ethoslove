import type { TemplateManifest } from "../types";

/**
 * The reference template for group cards (src/lib/group): the plainest gift that keeps the whole
 * contract, so the engine can be built, tested and looked at before a gallery template adopts it.
 * It is never registered: the three lookups by slug find it in development only (DEV_MANIFESTS in
 * ../manifests), so it is in no list the gallery, the sitemap, the app's catalogue or checkout
 * reads, and nobody can be sold it.
 */
export const manifest: TemplateManifest = {
  slug: "group-reference",
  name: { en: "Group card (reference)", es: "Tarjeta en grupo (referencia)" },
  tagline: { en: "One card, signed by everyone.", es: "Una tarjeta firmada por todos." },
  description: {
    en: "Your words first, then a note from each person you invited, with their name and a photo if they added one.",
    es: "Primero tus palabras y después una nota de cada persona que invitaste, con su nombre y una foto si la añadió.",
  },
  occasions: ["birthday"],
  styles: ["minimal"],
  tier: "premium",
  features: {
    music: false,
    video: false,
    countdown: false,
    surprise: false,
    captions: false,
    photos: { min: 0, max: 8 },
    group: { min: 0, max: 25, noteMax: 140, photos: true },
  },
  thumbnail: { poster: "/templates/the-letter/poster.jpg" },
  defaultAccent: "#B4552D",
  heavy: false,
  sortOrder: 9999,
};
