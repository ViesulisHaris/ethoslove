import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "picnic",
  name: { en: "Picnic", es: "Pícnic" },
  tagline: {
    en: "A basket on a gingham blanket. Every thing they take out carries a line from you.",
    es: "Una cesta sobre una manta de cuadros. Cada cosa que sacan lleva una frase tuya.",
  },
  description: {
    en: "A picnic basket waits on a gingham blanket in the grass. They tap it and the lid creaks open; every tap after that takes one thing out and sets it on the blanket: strawberries, cherries tied with a bow, a bottle of pink lemonade, tulips, a ticket to happiness, your photos in gingham frames. Each thing carries a tag with a line you wrote, and butterflies land on them as they arrive. The last thing out is a folded note with your letter inside. If you have planned a date, it comes out of the basket too. Pink, blue, red or lilac.",
    es: "Una cesta de pícnic espera sobre una manta de cuadros, en la hierba. La tocan y la tapa se abre con un crujido; cada toque saca una cosa y la deja sobre la manta: fresas, cerezas atadas con un lazo, una botella de limonada rosa, tulipanes, un billete a la felicidad, vuestras fotos en marcos de cuadros. Cada cosa lleva una etiqueta con una frase tuya, y las mariposas se posan en ellas según llegan. Lo último que sale es una nota doblada con tu carta dentro. Si has planeado una cita, también sale de la cesta. Rosa, azul, roja o lila.",
  },
  occasions: ["just-because", "anniversary", "birthday"],
  styles: ["romantic", "playful"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 0, max: 6 } },
  thumbnail: { poster: "/templates/picnic/poster.jpg", webm: "/templates/picnic/preview.webm" },
  defaultAccent: "#D9577E",
  heavy: false,
  sortOrder: 9,
};
