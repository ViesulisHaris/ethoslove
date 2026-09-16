import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "museum",
  name: { en: "Museum", es: "Museo" },
  tagline: { en: "A quiet gallery of the two of you.", es: "Una galería silenciosa de vosotros dos." },
  description: {
    en: "A minimal gallery walk. Each photo hangs framed on a wall with a plaque underneath, title, year, a line. The camera dollies from room to room as they swipe; the final room is a wall text with your message. For anniversaries, parents, and people who deserve a museum.",
    es: "Un paseo por una galería minimalista. Cada foto cuelga enmarcada en una pared con su placa: título, año, una frase. La cámara avanza de sala en sala al deslizar; la última sala es un texto de pared con tu mensaje. Para aniversarios, padres y gente que se merece un museo.",
  },
  occasions: ["anniversary", "mothers-day", "fathers-day", "wedding"],
  styles: ["minimal", "cinematic"],
  tier: "premium",
  features: { music: true, video: true, countdown: true, surprise: true, captions: true, photos: { min: 2, max: 20 } },
  thumbnail: { poster: "/templates/museum/poster.jpg", webm: "/templates/museum/preview.webm" },
  defaultAccent: "#8C7B6B",
  heavy: false,
  sortOrder: 90,
};
