import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "trick-or-treat",
  name: { en: "Trick or Treat", es: "Truco o trato" },
  tagline: { en: "Ring the bell. A small ghost has something for them.", es: "Llama al timbre. Un fantasmita tiene algo para ellos." },
  description: {
    en: "A moonlit porch on Halloween night: bats cross the sky, a jack-o'-lantern waits by the door and the bell asks trick or treat. Treat lights the pumpkin and rains sweets; trick earns a boo first, then the treat anyway. Inside, a little ghost, cat or pumpkin hands over your photos in haunted frames, your words on a scroll and their song. Midnight, pumpkin, witch or candy.",
    es: "Un porche a la luz de la luna en la noche de Halloween: los murciélagos cruzan el cielo, una calabaza iluminada espera junto a la puerta y el timbre pregunta truco o trato. Trato enciende la calabaza y hace llover caramelos; truco se gana un buu primero, y el trato de todos modos. Dentro, un fantasmita, un gato o una calabaza entregan tus fotos en marcos encantados, tus palabras en un pergamino y su canción. Medianoche, calabaza, bruja o caramelo.",
  },
  occasions: ["halloween"],
  styles: ["playful", "cinematic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 0, max: 8 } },
  thumbnail: { poster: "/templates/trick-or-treat/poster.jpg", webm: "/templates/trick-or-treat/preview.webm" },
  defaultAccent: "#F28C28",
  heavy: false,
  sortOrder: 18,
};
