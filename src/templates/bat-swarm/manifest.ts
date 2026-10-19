import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "bat-swarm",
  name: { en: "Bat Swarm", es: "Bandada de murciélagos" },
  tagline: {
    en: "Tap the moon. A swarm of bats spells out their name across it.",
    es: "Toca la luna. Una bandada de murciélagos escribe su nombre sobre ella.",
  },
  description: {
    en: "A huge moon over a graveyard, and a few bats circling it. One tap and hundreds pour out of the moon, whirl into a vortex, then fly in to spell their name across it, a line of your choosing and a heart, wings still beating, before they burst away into the night. Underneath, your letter on dark glass, your photos hung in the moonlight and your song. Midnight, harvest moon, blood moon or frost.",
    es: "Una luna enorme sobre un cementerio y unos pocos murciélagos que la rodean. Un toque y cientos salen de la luna, giran en un remolino y se lanzan a escribir su nombre sobre ella, una frase que elijas y un corazón, con las alas aún batiendo, antes de salir disparados hacia la noche. Debajo, tu carta sobre cristal oscuro, tus fotos colgadas a la luz de la luna y vuestra canción. Medianoche, luna de cosecha, luna de sangre o escarcha.",
  },
  occasions: ["halloween", "just-because"],
  styles: ["cinematic", "romantic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 0, max: 8 } },
  thumbnail: { poster: "/templates/bat-swarm/poster.jpg", webm: "/templates/bat-swarm/preview.webm" },
  defaultAccent: "#CDB9FF",
  heavy: false,
  sortOrder: 52,
};
