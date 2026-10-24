import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "cauldron",
  name: { en: "Witch's Brew", es: "La poción de la bruja" },
  tagline: {
    en: "Drop in three things you love. The potion does the rest.",
    es: "Echa tres cosas que quieres. La poción hace el resto.",
  },
  description: {
    en: "A witch's kitchen at night: a black cat on the windowsill, herbs drying overhead, a cauldron over the fire and three jars on the shelf, each labelled in your words. They tap the jars in one at a time and the potion answers: a splash, a new colour, harder bubbling. After the third it boils over, the steam coils into a heart, and a bottle with their name on the label floats up. One tap and the cork pops, and your letter unrolls, with your photos preserved in glass jars and your song. Witch green, love pink, midnight blue or pumpkin gold.",
    es: "La cocina de una bruja de noche: un gato negro en la ventana, hierbas secándose arriba, un caldero al fuego y tres tarros en la estantería, cada uno con una etiqueta en tus palabras. Tocan los tarros uno a uno y la poción responde: un chapoteo, un color nuevo, un hervor más fuerte. Tras el tercero rebosa, el vapor se enrosca en un corazón y sube una botella con su nombre en la etiqueta. Un toque y salta el corcho, y se despliega tu carta, con tus fotos conservadas en tarros de cristal y vuestra canción. Verde bruja, rosa amor, azul medianoche u oro calabaza.",
  },
  occasions: ["halloween"],
  styles: ["playful", "cinematic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 0, max: 8 } },
  thumbnail: { poster: "/templates/cauldron/poster.jpg", webm: "/templates/cauldron/preview.webm" },
  defaultAccent: "#2F9E57",
  heavy: false,
  sortOrder: 9,
};
