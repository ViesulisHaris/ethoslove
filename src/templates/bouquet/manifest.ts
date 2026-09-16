import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "bouquet",
  name: { en: "Bouquet", es: "Ramo" },
  tagline: { en: "Every stem picked by you. It never wilts.", es: "Cada flor elegida por ti. Nunca se marchita." },
  description: {
    en: "Build a bouquet stem by stem: roses, peonies, tulips, sunflowers and more, in the colours you choose, wrapped in paper and tied with a ribbon. They watch it come together one flower at a time, then open the little card tucked inside to find your message.",
    es: "Crea un ramo tallo a tallo: rosas, peonías, tulipanes, girasoles y más, en los colores que elijas, envuelto en papel y atado con un lazo. Lo verán formarse flor a flor y después abrirán la tarjeta escondida dentro para leer tu mensaje.",
  },
  occasions: ["valentines", "mothers-day", "birthday", "anniversary"],
  styles: ["romantic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 0, max: 6 } },
  thumbnail: { poster: "/templates/bouquet/poster.jpg", webm: "/templates/bouquet/preview.webm" },
  defaultAccent: "#C8475A",
  heavy: false,
  sortOrder: 15,
};
