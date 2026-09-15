import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "kawaii",
  name: { en: "Kawaii", es: "Kawaii" },
  tagline: { en: "Bows, blush and a plushie who's happy to see them.", es: "Lazos, rubor y un peluche que se alegra de verles." },
  description: {
    en: "A pastel sticker-book of a gift. A plush bunny, bear or kitten in a bow waves hello, hearts and sparkles drift across the screen, and a ribboned gift box pops open with a burst of confetti. Inside: your photos as taped-in stickers, your message in a speech bubble, their song. Pink, lavender, mint or cherry.",
    es: "Un regalo hecho álbum de pegatinas en tonos pastel. Un conejito, osito o gatito de peluche con lazo saluda, corazones y destellos cruzan la pantalla, y una caja con lazo se abre con una lluvia de confeti. Dentro: tus fotos como pegatinas con celo, tu mensaje en un bocadillo, su canción. Rosa, lavanda, menta o cereza.",
  },
  occasions: ["birthday", "valentines", "anniversary", "just-because", "apology", "long-distance", "christmas"],
  styles: ["playful", "romantic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 0, max: 8 } },
  thumbnail: { poster: "/templates/kawaii/poster.jpg", webm: "/templates/kawaii/preview.webm" },
  defaultAccent: "#F06292",
  heavy: false,
  sortOrder: 16,
};
