import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "thankful-pie",
  name: { en: "Thankful Pie", es: "La tarta de gracias" },
  tagline: {
    en: "A pumpkin pie cut in six. Every slice they lift adds one thing you love to the recipe.",
    es: "Una tarta de calabaza cortada en seis. Cada trozo que levantan añade a la receta algo que te encanta.",
  },
  description: {
    en: "A pumpkin pie on the Thanksgiving table, already cut, and an empty recipe card beside it. They lift the slices out one by one, and each one writes an ingredient onto the card in your words: a pinch of them stealing the blanket, two cups of them humming while they cook. When the tin is empty the recipe is done, and your letter, your photos and your song come after. Cream linen, farmhouse wood, green check or candlelit.",
    es: "Una tarta de calabaza en la mesa de Acción de Gracias, ya cortada, y al lado una ficha de receta en blanco. Van sacando los trozos uno a uno y cada uno escribe en la ficha un ingrediente con tus palabras: una pizca de cómo te roba la manta, dos tazas de cómo tararea mientras cocina. Cuando el molde se queda vacío, la receta está lista y llegan tu carta, tus fotos y vuestra canción. Lino crema, madera de granja, cuadros verdes o a la luz de las velas.",
  },
  occasions: ["thanksgiving", "just-because"],
  styles: ["playful", "romantic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 0, max: 8 } },
  thumbnail: { poster: "/templates/thankful-pie/poster.jpg", webm: "/templates/thankful-pie/preview.webm" },
  defaultAccent: "#C8692A",
  heavy: false,
  sortOrder: 9,
};
