import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "frosted-window",
  name: { en: "Frosted Window", es: "La ventana helada" },
  tagline: {
    en: "A window frosted over on Christmas Eve. They wipe the frost away with a finger to see what is waiting outside.",
    es: "Una ventana cubierta de escarcha en Nochebuena. La limpian con el dedo para ver lo que les espera fuera.",
  },
  description: {
    en: "A window on Christmas Eve, candles on the sill, two stockings with your names on them, and the glass frosted over, with \"look outside\" written in it by a finger. They wipe the frost away themselves, and outside in the snow a snowman is holding up a little blackboard with your words on it. Then your letter, your photos and your song. Cream cottage, log cabin or midnight blue.",
    es: "Una ventana en Nochebuena, velas en el alféizar, dos calcetines con vuestros nombres y el cristal cubierto de escarcha, con \"mira fuera\" escrito con el dedo. Ellos mismos limpian la escarcha y, fuera, en la nieve, un muñeco sujeta una pizarrita con tus palabras. Después llegan tu carta, tus fotos y vuestra canción. Casita crema, cabaña de troncos o azul medianoche.",
  },
  occasions: ["christmas"],
  styles: ["romantic", "playful"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 0, max: 8 } },
  thumbnail: { poster: "/templates/frosted-window/poster.jpg", webm: "/templates/frosted-window/preview.webm" },
  defaultAccent: "#B3241E",
  heavy: false,
  sortOrder: 9,
};
