import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "the-letter",
  name: { en: "The Letter", es: "La carta" },
  tagline: {
    en: "A wax-sealed envelope, opened by hand.",
    es: "Un sobre lacrado que se abre a mano.",
  },
  description: {
    en: "Tap to break the seal. The letter slides out and unfolds on a candle-lit desk, your words appear in handwriting, and your photos drop in as polaroids.",
    es: "Toca para romper el sello. La carta sale del sobre y se despliega sobre un escritorio a la luz de una vela, tus palabras aparecen escritas a mano y tus fotos caen como polaroids.",
  },
  occasions: ["anniversary", "valentines", "apology", "just-because", "long-distance"],
  styles: ["romantic", "minimal"],
  tier: "free",
  features: {
    music: true,
    video: true,
    countdown: true,
    surprise: true,
    captions: true,
    photos: { min: 1, max: 20 },
  },
  thumbnail: { poster: "/templates/the-letter/poster.jpg", webm: "/templates/the-letter/preview.webm" },
  defaultAccent: "#B23A2E",
  heavy: false,
  sortOrder: 10,
};
