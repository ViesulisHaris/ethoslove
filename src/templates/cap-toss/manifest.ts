import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "cap-toss",
  name: { en: "Cap Toss", es: "Vuela el birrete" },
  tagline: {
    en: "Cheer, and the cap goes up.",
    es: "Grita y el birrete sale volando.",
  },
  description: {
    en: "A mortarboard waiting on its plinth, a crowd in gowns behind it, and a meter that moves the moment you make a noise. They cheer into the phone — shout, whoop, clap — and the cap launches on it, spinning through the confetti and coming back down; the louder the cheer, the higher it goes. Then a rolled diploma drops in, tied with a ribbon: pull the ribbon and it unrolls into your letter, with their photos taped on like a yearbook. No microphone, or nothing to shout about? A “throw it” button does the same thing.",
    es: "Un birrete esperando en su pedestal, una promoción con toga detrás y un medidor que se mueve en cuanto haces ruido. Grita al teléfono — un chillido, un aplauso, lo que salga — y el birrete sale disparado con el ruido, dando vueltas entre el confeti antes de volver a caer: cuanto más fuerte, más alto llega. Luego aparece un diploma enrollado con su cinta: tira de la cinta y se despliega con tu carta, con las fotos pegadas como en un anuario. ¿Sin micrófono o sin ganas de gritar? El botón «lánzalo» hace lo mismo.",
  },
  occasions: ["graduation"],
  styles: ["playful", "cinematic"],
  tier: "premium",
  features: {
    music: true,
    video: false,
    countdown: true,
    surprise: true,
    captions: true,
    photos: { min: 1, max: 10 },
    needs: ["microphone"],
  },
  thumbnail: { poster: "/templates/cap-toss/poster.jpg", webm: "/templates/cap-toss/preview.webm" },
  defaultAccent: "#D4A853",
  heavy: false,
  sortOrder: 38,
};
