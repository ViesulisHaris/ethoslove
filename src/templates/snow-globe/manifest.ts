import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "snow-globe",
  name: { en: "Snow Globe", es: "Bola de nieve" },
  tagline: {
    en: "Shake it, and it snows on the two of you.",
    es: "Agítala y nieva sobre vosotros dos.",
  },
  description: {
    en: "A snow globe on a shelf, with the two of you inside it. They shake their phone and the snow flies — harder shake, wilder storm — and turning the phone over tips the whole globe. Every time the snow settles something new has appeared in there: one of your lines, or a photo hanging like an ornament. After the last one the brass plaque is engraved and your letter opens. Works without a motion sensor too: there is a button that shakes it.",
    es: "Una bola de nieve en una estantería, con vosotros dos dentro. Agitan el teléfono y la nieve vuela — cuanto más fuerte, mayor la tormenta — y al darle la vuelta al teléfono la bola se vuelca entera. Cada vez que la nieve se posa ha aparecido algo nuevo: una de tus frases, o una foto colgada como un adorno. Después de la última se graba la placa de latón y se abre tu carta. También funciona sin sensor de movimiento: hay un botón que la agita.",
  },
  // Christmas first, but two homes with the lights on is what a long-distance December looks like.
  occasions: ["christmas", "just-because", "anniversary"],
  styles: ["playful", "romantic"],
  tier: "premium",
  features: {
    music: true,
    video: false,
    countdown: true,
    surprise: true,
    captions: true,
    photos: { min: 1, max: 8 },
    needs: ["deviceMotion", "gyroscope"],
  },
  thumbnail: { poster: "/templates/snow-globe/poster.jpg", webm: "/templates/snow-globe/preview.webm" },
  defaultAccent: "#2F6B4F",
  heavy: false,
  sortOrder: 34,
};
