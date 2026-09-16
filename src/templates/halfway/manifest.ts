import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "halfway",
  name: { en: "Halfway", es: "A medio camino" },
  tagline: {
    en: "Blow a paper plane from your door to theirs.",
    es: "Sopla un avión de papel de tu puerta a la suya.",
  },
  description: {
    en: "A little postcard map: your home on one island, theirs on the other, each town on a ribbon, and the real distance between you in big numbers. They blow into their phone and a paper plane, a balloon or a little bird rides their breath along the dotted path, the kilometres counting down (stop blowing and it drifts back), until the path turns into a heart and the postcard flips over to your letter, with your photos taped beside it. No microphone? A tap flies it home.",
    es: "Una postal con un mapita: tu casa en una isla, la suya en la otra, cada pueblo en una cinta y la distancia real entre vosotros en grande. Sopla al teléfono y un avión de papel, un globo o un pajarito vuela con su aliento por el camino de puntos mientras los kilómetros bajan (si deja de soplar, retrocede), hasta que el camino se vuelve un corazón y la postal se da la vuelta: tu carta, con tus fotos pegadas al lado. ¿Sin micrófono? Un toque lo lleva a casa.",
  },
  occasions: ["long-distance", "anniversary"],
  styles: ["playful", "romantic"],
  tier: "premium",
  features: {
    music: true,
    video: false,
    countdown: true,
    surprise: true,
    captions: true,
    photos: { min: 1, max: 8 },
    needs: ["microphone"],
  },
  thumbnail: { poster: "/templates/halfway/poster.jpg", webm: "/templates/halfway/preview.webm" },
  defaultAccent: "#E2587C",
  heavy: false,
  sortOrder: 30,
};
