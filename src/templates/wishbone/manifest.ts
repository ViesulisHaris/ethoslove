import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "wishbone",
  name: { en: "Wishbone", es: "La espoleta" },
  tagline: {
    en: "Pull your side of the wishbone. Whoever gets the big half gets the wish.",
    es: "Tira de tu lado de la espoleta. A quien le toque la mitad grande, se le cumple el deseo.",
  },
  description: {
    en: "A wishbone on a plate at the Thanksgiving table, a name tag tied to each end: yours on one, theirs on the other. They pull their side with a finger, the bone bends and creaks, and then it snaps. You decide who gets the big half. Out comes your wish on a card, then your letter, your photos and your song. Red gingham, harvest orange, sage linen or candlelit.",
    es: "Una espoleta en un plato de la mesa de Acción de Gracias, con una etiqueta en cada punta: la tuya en una y la suya en la otra. Tira de su lado con el dedo, el hueso se dobla, cruje y se parte. Tú decides a quién le toca la mitad grande. Sale tu deseo en una tarjeta y, después, tu carta, tus fotos y vuestra canción. Cuadros rojos, naranja otoño, lino salvia o a la luz de las velas.",
  },
  occasions: ["thanksgiving"],
  styles: ["playful", "romantic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 0, max: 8 } },
  thumbnail: { poster: "/templates/wishbone/poster.jpg", webm: "/templates/wishbone/preview.webm" },
  defaultAccent: "#C4302A",
  heavy: false,
  sortOrder: 9,
};
