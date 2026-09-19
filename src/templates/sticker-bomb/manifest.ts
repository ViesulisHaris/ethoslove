import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "sticker-bomb",
  name: { en: "Sticker Bomb", es: "Bomba de Stickers" },
  tagline: { en: "Every tap slaps a meme sticker on the page. Twelve taps uncover the card.", es: "Cada toque pega un sticker de meme en la página. Doce toques destapan la tarjeta." },
  description: {
    en: "A blank cutting mat and one instruction: tap anywhere. Every tap slaps down a sticker exactly where their finger landed, a cat in a shark hat, a hamster with cake, your own photos as polaroids, with a label-maker strip under some of them saying whatever you wrote (“certified menace”). Twelve stickers in, the page is a mess, the confetti goes and your card opens. Cats, party animals, the soft ones with bows, or all of it at once.",
    es: "Una base de corte vacía y una instrucción: toca donde quieras. Cada toque pega un sticker justo donde cayó el dedo, un gato con gorro de tiburón, un hámster con tarta, tus propias fotos como polaroids, con una tira de rotuladora bajo algunos que dice lo que tú escribiste («amenaza certificada»). A los doce stickers la página es un desastre, salta el confeti y se abre tu tarjeta. Gatos, animales de fiesta, los tiernos con lazos, o todo a la vez.",
  },
  occasions: ["just-because", "birthday", "apology"],
  styles: ["playful"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 0, max: 6 } },
  thumbnail: { poster: "/templates/sticker-bomb/poster.jpg", webm: "/templates/sticker-bomb/preview.webm" },
  defaultAccent: "#FF5C8A",
  heavy: false,
  sortOrder: 9,
};
