import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "party-animals",
  name: { en: "Party Animals", es: "Fiesta Animal" },
  tagline: { en: "You're invited. A birthday collage crashed by hamsters in party hats: tap one and it yells your line.", es: "Una invitación y un collage de cumpleaños invadido por hámsters con gorrito: toca uno y grita tu frase." },
  description: {
    en: "An invitation sealed with a hamster in a party hat. They open it and scroll down a birthday collage: their name under cut-out letters, their age in foil balloons, your photos in polaroids and a photo-booth strip, your song, and ten animals in party hats in between — cats, hamsters, puppies and two ferrets nobody invited. Tap an animal and it jumps, squeaks and yells a line you wrote; tap anywhere else and confetti pops under their finger. Further down, a cake with their age in candles: they tap it, or blow into the phone, to put them out. Your letter is at the bottom. Linen, bubblegum, lime or midnight.",
    es: "Una invitación sellada con un hámster con gorrito. La abren y bajan por un collage de cumpleaños: su nombre bajo letras recortadas, su edad en globos metalizados, tus fotos en polaroids y en una tira de fotomatón, tu canción, y entre medias diez animales con gorrito: gatos, hámsters, cachorros y dos hurones que nadie invitó. Tocan un animal y salta, chilla y grita una frase que tú escribiste; tocan en cualquier otro sitio y salta confeti bajo su dedo. Más abajo, una tarta con su edad en velas: la tocan, o soplan al móvil, para apagarlas. Tu carta está al final. Lino, chicle, lima o medianoche.",
  },
  occasions: ["birthday", "just-because"],
  styles: ["playful"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 1, max: 7 }, needs: ["microphone"] },
  thumbnail: { poster: "/templates/party-animals/poster.jpg", webm: "/templates/party-animals/preview.webm" },
  defaultAccent: "#F0588C",
  heavy: false,
  sortOrder: 9,
};
