import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "constellations",
  name: { en: "Constellations", es: "Constelaciones" },
  tagline: {
    en: "Every photo is a star. Find them all.",
    es: "Cada foto es una estrella. Encuéntralas todas.",
  },
  description: {
    en: "A living night sky. Each memory is a star, tap one to fly to it. Connect them all and they draw a constellation in the shape of a heart, then your message appears under the stars.",
    es: "Un cielo nocturno vivo. Cada recuerdo es una estrella: toca una para volar hasta ella. Conéctalas todas y dibujarán una constelación con forma de corazón; después, tu mensaje aparece bajo las estrellas.",
  },
  occasions: ["anniversary", "long-distance", "valentines", "birthday"],
  styles: ["cinematic", "romantic"],
  tier: "free",
  features: {
    music: true,
    video: false,
    countdown: true,
    surprise: true,
    captions: true,
    photos: { min: 3, max: 12 },
    needs: ["gyroscope"],
  },
  thumbnail: { poster: "/templates/constellations/poster.jpg", webm: "/templates/constellations/preview.webm" },
  defaultAccent: "#F2C879",
  heavy: false,
  sortOrder: 20,
};
