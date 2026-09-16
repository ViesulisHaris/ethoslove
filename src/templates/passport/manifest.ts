import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "passport",
  name: { en: "Passport", es: "Pasaporte" },
  tagline: {
    en: "From your city to theirs, in one flight.",
    es: "De tu ciudad a la suya, en un solo vuelo.",
  },
  description: {
    en: "A passport with their name on the cover. Open it and a globe turns, a route draws itself from your city to theirs (stopovers welcome), and the pages fill with stamps, one per photo, before the visa page reveals your message.",
    es: "Un pasaporte con su nombre en la portada. Al abrirlo gira un globo, una ruta se dibuja desde tu ciudad hasta la suya (con escalas si quieres) y las páginas se llenan de sellos, uno por foto, antes de que la página del visado revele tu mensaje.",
  },
  occasions: ["long-distance", "anniversary"],
  styles: ["3d", "cinematic"],
  tier: "premium",
  features: {
    music: true,
    video: false,
    countdown: true,
    surprise: true,
    captions: true,
    photos: { min: 1, max: 10 },
    needs: ["webgl"],
  },
  thumbnail: { poster: "/templates/passport/poster.jpg", webm: "/templates/passport/preview.webm" },
  defaultAccent: "#D4A853",
  heavy: true,
  sortOrder: 55,
};
