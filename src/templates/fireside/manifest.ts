import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "fireside",
  name: { en: "Fireside", es: "Junto al fuego" },
  tagline: { en: "A candle, a blanket and a letter by the window.", es: "Una vela, una manta y una carta junto a la ventana." },
  description: {
    en: "A cabin at dusk, leaves falling past the window. They light the candle, the room turns gold, and a letter unfolds from the blanket with your words. Your photos hang from a string on wooden pegs, sparks drift up from the candle, and their song plays low. Amber, maple or moss; leaves or snow outside.",
    es: "Una cabaña al anochecer, con hojas cayendo tras la ventana. Encienden la vela, la habitación se vuelve dorada y una carta se despliega de la manta con tus palabras. Tus fotos cuelgan de un hilo con pinzas de madera, saltan chispas de la vela y suena su canción bajito. Ámbar, arce o musgo; hojas o nieve fuera.",
  },
  occasions: ["anniversary", "just-because", "long-distance", "birthday", "apology", "christmas"],
  styles: ["romantic", "cinematic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 0, max: 8 } },
  thumbnail: { poster: "/templates/fireside/poster.jpg", webm: "/templates/fireside/preview.webm" },
  defaultAccent: "#D9822B",
  heavy: false,
  sortOrder: 17,
};
