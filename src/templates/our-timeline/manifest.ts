import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "our-timeline",
  name: { en: "Our Timeline", es: "Nuestra línea del tiempo" },
  tagline: { en: "A road that draws itself as they scroll.", es: "Un camino que se dibuja mientras deslizan." },
  description: {
    en: "Scroll-driven storytelling. A winding road draws itself down the page; every milestone pins a photo with a date and parallax layers. It ends on “and it's only the beginning” with a countdown to whatever comes next.",
    es: "Una historia que avanza al deslizar. Un camino sinuoso se dibuja página abajo; cada hito fija una foto con su fecha y capas en paralaje. Termina en «y esto solo es el principio», con una cuenta atrás hacia lo que venga.",
  },
  occasions: ["anniversary", "wedding", "graduation", "long-distance"],
  styles: ["cinematic", "minimal"],
  tier: "premium",
  features: { music: true, video: true, countdown: true, surprise: true, captions: true, photos: { min: 2, max: 20 } },
  thumbnail: { poster: "/templates/our-timeline/poster.jpg", webm: "/templates/our-timeline/preview.webm" },
  defaultAccent: "#2E4A62",
  heavy: false,
  sortOrder: 70,
};
