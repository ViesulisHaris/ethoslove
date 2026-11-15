import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "gingerbread-house",
  name: { en: "Gingerbread House", es: "La casita de jengibre" },
  tagline: {
    en: "A plain gingerbread house on the kitchen counter. They stick on the sweets and pipe the icing with a finger, and then the little door opens.",
    es: "Una casita de jengibre sin decorar en la encimera. Le pegan los dulces y le ponen el glaseado con el dedo, y entonces se abre la puertecita.",
  },
  description: {
    en: "A gingerbread house fresh out of the oven, bowls of sweets either side, fairy lights along the shelf. They pick a gumdrop, a peppermint, a star or a heart and press it on wherever they like, or drag a finger to pipe a line of icing, as much or as little as they want. No two come out the same. When it is dressed, the little door opens on a warm light, and your letter, your photos and your song are inside. Cream tiles, midnight blue or red gingham.",
    es: "Una casita de jengibre recién salida del horno, cuencos de dulces a los lados y lucecitas en la balda. Eligen una gominola, un caramelo de menta, una estrella o un corazón y lo pegan donde quieran, o arrastran el dedo para trazar una línea de glaseado, tanto o tan poco como les apetezca. No hay dos iguales. Cuando está vestida, la puertecita se abre a una luz cálida, y dentro están tu carta, tus fotos y vuestra canción. Azulejos crema, azul medianoche o cuadros rojos.",
  },
  occasions: ["christmas"],
  styles: ["playful", "cinematic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 0, max: 8 } },
  thumbnail: { poster: "/templates/gingerbread-house/poster.jpg", webm: "/templates/gingerbread-house/preview.webm" },
  defaultAccent: "#C4202A",
  heavy: false,
  sortOrder: 9,
};
