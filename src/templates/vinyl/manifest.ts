import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "vinyl",
  name: { en: "Vinyl", es: "Vinilo" },
  tagline: { en: "Drop the needle on their song.", es: "Pon la aguja en su canción." },
  description: {
    en: "A turntable. They drop the needle and the record spins in real time with the music. Your photos sit in a crate as album covers to flip through; your message is printed on the liner notes.",
    es: "Un tocadiscos. Ponen la aguja y el disco gira en tiempo real con la música. Tus fotos esperan en una caja como portadas de discos para ir pasando; tu mensaje va impreso en las notas del libreto.",
  },
  occasions: ["anniversary", "valentines", "just-because", "long-distance"],
  styles: ["retro", "romantic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 1, max: 12 } },
  thumbnail: { poster: "/templates/vinyl/poster.jpg", webm: "/templates/vinyl/preview.webm" },
  defaultAccent: "#C8743A",
  heavy: false,
  sortOrder: 80,
};
