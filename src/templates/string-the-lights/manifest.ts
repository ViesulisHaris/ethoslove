import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "string-the-lights",
  name: { en: "String the Lights", es: "Cuelga las luces" },
  tagline: {
    en: "A dark house in the snow on Christmas Eve. They hang the lights along the roof with a finger, throw the switch, and it all comes on.",
    es: "Una casa a oscuras en la nieve en Nochebuena. Cuelgan las luces por el tejado con el dedo, dan al interruptor y todo se enciende.",
  },
  description: {
    en: "A little house under the snow, dark, a street lamp, the stars out. They run a finger along the roof and over the porch and the bulbs go up one by one behind it. Then the switch: the string lights from end to end, every window warms, and your words come on in bulbs on the board in the garden. After that, your letter, your photos and your song. Barn red, navy blue or sage green.",
    es: "Una casita bajo la nieve, a oscuras, con una farola y las estrellas. Pasan el dedo por el tejado y por el porche y las bombillas se van colgando una a una. Después, el interruptor: la tira se enciende de punta a punta, las ventanas se llenan de luz y tus palabras aparecen con bombillas en el cartel del jardín. Luego llegan tu carta, tus fotos y vuestra canción. Rojo granero, azul marino o verde salvia.",
  },
  occasions: ["christmas"],
  styles: ["playful", "cinematic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 0, max: 8 } },
  thumbnail: { poster: "/templates/string-the-lights/poster.jpg", webm: "/templates/string-the-lights/preview.webm" },
  defaultAccent: "#C21E1E",
  heavy: false,
  sortOrder: 9,
};
