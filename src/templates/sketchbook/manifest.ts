import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "sketchbook",
  name: { en: "Sketchbook", es: "Cuaderno" },
  tagline: { en: "A notebook whose doodles draw themselves, page by page.", es: "Un cuaderno cuyos garabatos se dibujan solos, página a página." },
  description: {
    en: "A coil-bound sketchbook with their name on the cover. Every page draws itself in ink as they turn to it: a cake with candles, their age circled twice, a party hat, presents, arrows and hearts, with watercolour bleeding in behind the lines. Your photos are taped in between the doodles with notes in handwriting, and the last page is your letter. White paper, kraft, or black paper and a white pen.",
    es: "Un cuaderno de espiral con su nombre en la portada. Cada página se dibuja sola a tinta cuando la pasan: una tarta con velas, su edad rodeada dos veces, un gorro de fiesta, regalos, flechas y corazones, con acuarela que se cuela detrás de las líneas. Tus fotos van pegadas con cinta entre los garabatos, con notas a mano, y la última página es tu carta. Papel blanco, kraft, o papel negro y boli blanco.",
  },
  occasions: ["birthday", "just-because", "anniversary"],
  styles: ["playful", "romantic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 0, max: 12 } },
  thumbnail: { poster: "/templates/sketchbook/poster.jpg", webm: "/templates/sketchbook/preview.webm" },
  defaultAccent: "#D9667C",
  heavy: false,
  sortOrder: 9,
};
