import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "front-page",
  name: { en: "Front Page", es: "Portada" },
  tagline: { en: "Breaking news: it's about them.", es: "Última hora: va sobre ellos." },
  description: {
    en: "A newspaper front page with their name on the masthead. Your headline, a lead photo with caption, your message set in columns, a weather box (100% chance of cake), classified ads you write, and a horoscope that is suspiciously accurate. Lands on the doormat with a thud.",
    es: "Una portada de periódico con su nombre en la cabecera. Tu titular, una foto principal con pie, tu mensaje en columnas, el tiempo (100 % de probabilidad de tarta), anuncios clasificados que escribes tú y un horóscopo sospechosamente acertado. Aterriza en el felpudo con un golpe.",
  },
  occasions: ["birthday", "graduation", "fathers-day", "wedding"],
  styles: ["playful", "retro"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 1, max: 8 } },
  thumbnail: { poster: "/templates/front-page/poster.jpg", webm: "/templates/front-page/preview.webm" },
  defaultAccent: "#B23A2E",
  heavy: false,
  sortOrder: 100,
};
