import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "recipe-box",
  name: { en: "Recipe Box", es: "Caja de recetas" },
  tagline: {
    en: "Her recipe, card by card, in her kitchen's handwriting.",
    es: "Su receta, ficha a ficha, con la letra de su cocina.",
  },
  description: {
    en: "The recipe for her, on a card on the kitchen counter. She tilts the phone and the jar tips with it, pouring one ingredient into the bowl — two cups of patience, a whole Sunday of her time — and each one is written on the card as it lands. When the last is in she shakes the phone to stir, and the card turns over into your letter, with the photos clipped to it. A pour button and a stir button are there for any phone that can't feel a tilt.",
    es: "La receta de ella, en una ficha sobre la encimera. Inclina el móvil y el tarro se inclina con él: cada ingrediente cae en el bol —dos tazas de paciencia, un domingo entero de su tiempo— y se escribe a mano en la ficha al caer. Cuando entra el último, agita el móvil para mezclar y la ficha se convierte en tu carta, con las fotos sujetas con clip. Hay un botón para verter y otro para mezclar, por si el móvil no nota la inclinación.",
  },
  occasions: ["mothers-day", "birthday"],
  styles: ["retro", "playful"],
  tier: "premium",
  features: {
    music: true,
    video: false,
    countdown: true,
    surprise: true,
    captions: true,
    photos: { min: 1, max: 8 },
    needs: ["gyroscope", "deviceMotion"],
  },
  thumbnail: { poster: "/templates/recipe-box/poster.jpg", webm: "/templates/recipe-box/preview.webm" },
  defaultAccent: "#C8743A",
  heavy: false,
  sortOrder: 36,
};
