import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "evergreen",
  name: { en: "Evergreen", es: "Siempreverde" },
  tagline: { en: "Unwrap the newspaper. Butterflies fly out of a sage collage of old print, a record and your photos.", es: "Desenvuelve el periódico. Salen mariposas de un collage verde salvia con papel de periódico, un disco y vuestras fotos." },
  description: {
    en: "A parcel wrapped in old newspaper and tied with twine, a tag with their name on it and a butterfly resting on the corner. They unwrap it, the paper falls open and cream butterflies fly out over a sage green collage: your photos on white polaroids, a record with your words on the label, torn newsprint, green leaves, white flowers, a sage ribbon, your song on a little player and your letter at the end. Every tap lets a butterfly go. Sage, olive or mint.",
    es: "Un paquete envuelto en papel de periódico y atado con cordel, con una etiqueta con su nombre y una mariposa posada en la esquina. Lo desenvuelve, el papel se abre y salen mariposas color crema sobre un collage verde salvia: tus fotos en polaroids blancas, un disco con tus palabras en la etiqueta, papel de periódico rasgado, hojas verdes, flores blancas, un lazo salvia, vuestra canción en un pequeño reproductor y tu carta al final. Cada toque suelta una mariposa. Salvia, oliva o menta.",
  },
  occasions: ["anniversary", "just-because"],
  styles: ["romantic", "cinematic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 1, max: 10 } },
  thumbnail: { poster: "/templates/evergreen/poster.jpg", webm: "/templates/evergreen/preview.webm" },
  defaultAccent: "#4F6B42",
  heavy: false,
  sortOrder: 46,
};
