import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "jack-o-lantern",
  name: { en: "Jack-o'-Lantern", es: "Calabaza tallada" },
  tagline: {
    en: "Watch a pumpkin get carved with their name. Then light the candle.",
    es: "Mira cómo tallan una calabaza con su nombre. Luego, enciende la vela.",
  },
  description: {
    en: "A pumpkin on a table in a dark room, and a knife. One tap and it starts to carve: the eyes, the nose, the grin, then their name across the belly, each piece dropping out onto the table. Then they light the candle, and the whole face glows through the cuts, flickering, with embers rising. Underneath, your letter on old paper, your photos as candlelit polaroids, and your song. Orange, ghost white, witch purple or blush pink; a classic grin, heart eyes or a cat.",
    es: "Una calabaza sobre una mesa en una habitación a oscuras y un cuchillo. Un toque y empieza a tallar: los ojos, la nariz, la sonrisa y, en la barriga, su nombre, y cada trozo cae sobre la mesa. Después encienden la vela y toda la cara brilla por los cortes, parpadeando, con brasas que suben. Debajo, tu carta en papel viejo, tus fotos como polaroids a la luz de las velas y vuestra canción. Naranja, blanco fantasma, morado bruja o rosa suave; una sonrisa clásica, ojos de corazón o un gato.",
  },
  occasions: ["halloween"],
  styles: ["playful", "romantic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 0, max: 8 } },
  thumbnail: { poster: "/templates/jack-o-lantern/poster.jpg", webm: "/templates/jack-o-lantern/preview.webm" },
  defaultAccent: "#FFC23D",
  heavy: false,
  sortOrder: 54,
};
