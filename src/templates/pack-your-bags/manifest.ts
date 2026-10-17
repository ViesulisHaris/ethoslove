import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "pack-your-bags",
  name: { en: "Pack Your Bags", es: "Haz la maleta" },
  tagline: {
    en: "A surprise trip, revealed on a departures board.",
    es: "Un viaje sorpresa, desvelado en un panel de salidas.",
  },
  description: {
    en: "They pack an open suitcase with your clues, one luggage tag at a time. The lid shuts, the zip runs and a tag with the date swings from the handle. Then a departures board clatters letter by letter to where you're going, a boarding pass, train ticket or road-trip map slides up with both your names on it, and when they tear off the stub, your letter is underneath.",
    es: "Mete tus pistas en una maleta abierta, una etiqueta cada vez. La tapa se cierra, la cremallera corre y del asa cuelga una etiqueta con la fecha. Luego un panel de salidas va girando letra a letra hasta el destino, sube una tarjeta de embarque, un billete de tren o un mapa de ruta con vuestros dos nombres y, al arrancar el resguardo, aparece tu carta.",
  },
  occasions: ["anniversary", "birthday", "long-distance", "valentines"],
  styles: ["playful", "cinematic"],
  tier: "premium",
  features: {
    music: true,
    video: false,
    countdown: true,
    surprise: false,
    captions: true,
    photos: { min: 0, max: 6 },
  },
  thumbnail: { poster: "/templates/pack-your-bags/poster.jpg", webm: "/templates/pack-your-bags/preview.webm" },
  defaultAccent: "#C8553D",
  heavy: false,
  sortOrder: 9,
};
