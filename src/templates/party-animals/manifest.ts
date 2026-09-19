import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "party-animals",
  name: { en: "Party Animals", es: "Fiesta Animal" },
  tagline: { en: "A birthday collage crashed by hamsters in party hats. Tap every guest.", es: "Un collage de cumpleaños invadido por hámsters con gorrito. Toca a cada invitado." },
  description: {
    en: "Your photos land in polaroids and a photo-booth strip, and then the guests arrive: cats, hamsters, puppies and two ferrets, all in party hats, all with something to yell. They tap every animal; each one jumps, squeaks and shouts a line you wrote. When everyone has been greeted the confetti goes off and your card opens. Linen, bubblegum, lime or midnight.",
    es: "Tus fotos caen en polaroids y en una tira de fotomatón, y entonces llegan los invitados: gatos, hámsters, cachorros y dos hurones, todos con gorrito y todos con algo que gritar. Tocan a cada animal; cada uno salta, chilla y grita una frase que tú escribiste. Cuando han saludado a todos salta el confeti y se abre tu tarjeta. Lino, chicle, lima o medianoche.",
  },
  occasions: ["birthday", "just-because"],
  styles: ["playful"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 1, max: 7 } },
  thumbnail: { poster: "/templates/party-animals/poster.jpg", webm: "/templates/party-animals/preview.webm" },
  defaultAccent: "#F0588C",
  heavy: false,
  sortOrder: 9,
};
