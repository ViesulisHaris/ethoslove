import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "popup-card",
  name: { en: "Pop-up Card", es: "Tarjeta pop-up" },
  tagline: { en: "A paper card that opens, and a cake that stands up out of the fold.", es: "Una tarjeta de papel que se abre, y una tarta que se levanta del pliegue." },
  description: {
    en: "A cut-paper card with their name on the front. It opens like a real one: a three-tier paper cake rises out of the fold with their age on the topper, paper balloons and a pennant line stand up behind it, and a little present waits at the front. They tap the candles to light them, make a wish, and blow into the phone (or swipe) to put them out. Inside the lid, your letter in handwriting; behind it, your photos on pegs. Vanilla, midnight, kraft or cherry.",
    es: "Una tarjeta de papel recortado con su nombre en la portada. Se abre como una de verdad: una tarta de tres pisos se levanta del pliegue con su edad en el topper, detrás se alzan globos de papel y una guirnalda de banderines, y delante espera un regalito. Tocan las velas para encenderlas, piden un deseo y soplan al móvil (o deslizan) para apagarlas. Dentro de la tapa, tu carta a mano; detrás, tus fotos con pinzas. Vainilla, medianoche, kraft o cereza.",
  },
  occasions: ["birthday", "mothers-day", "just-because"],
  styles: ["playful", "romantic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 0, max: 8 }, needs: ["microphone"] },
  thumbnail: { poster: "/templates/popup-card/poster.jpg", webm: "/templates/popup-card/preview.webm" },
  defaultAccent: "#D9667C",
  heavy: false,
  sortOrder: 9,
};
