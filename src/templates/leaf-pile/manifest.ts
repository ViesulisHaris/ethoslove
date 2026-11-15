import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "leaf-pile",
  name: { en: "Leaf Pile", es: "El montón de hojas" },
  tagline: {
    en: "A card left out in autumn, buried in leaves. They brush them off with a finger to read it.",
    es: "Una tarjeta olvidada en otoño, cubierta de hojas. Las apartan con el dedo para leerla.",
  },
  description: {
    en: "A card on the porch with a pile of maple, oak and beech leaves blown over it. They sweep the leaves away with a finger, a few at a time, rustling, until the wind takes the rest and the card is clear: thankful for you, and a line in your words. Then your letter, your photos and your song. Garden deck, white porch, stone path or evening lights.",
    es: "Una tarjeta en el porche con un montón de hojas de arce, roble y haya encima. Las apartan con el dedo, unas pocas cada vez, crujiendo, hasta que el viento se lleva el resto y la tarjeta queda a la vista: doy gracias por ti, y una frase con tus palabras. Después llegan tu carta, tus fotos y vuestra canción. Tarima del jardín, porche blanco, camino de piedra o luces de tarde.",
  },
  occasions: ["thanksgiving", "just-because"],
  styles: ["playful", "romantic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 0, max: 8 } },
  thumbnail: { poster: "/templates/leaf-pile/poster.jpg", webm: "/templates/leaf-pile/preview.webm" },
  defaultAccent: "#C8561A",
  heavy: false,
  sortOrder: 9,
};
