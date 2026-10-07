import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "dark-romance",
  name: { en: "Dark Romance", es: "Dark Romance" },
  tagline: { en: "Turn the key. A gothic love collage of black roses, red velvet and your song.", es: "Gira la llave. Un collage de amor gótico con rosas negras, terciopelo rojo y vuestra canción." },
  description: {
    en: "A black leather diary with their name in gold, locked with a heart. They turn the key, the lock drops and the cover swings open onto a gothic love collage: your photo between dark roses and an anatomical heart, your words in cut-out letters, your song on a little player, your second photo printed on a tarot card, The Lovers, playing cards and a die for the bet you'd make on the two of you, a crow, candles burnt low, and polaroids all the way down to your letter under a wax seal. Every tap on the page leaves a rose. Bordeaux, noir or parchment.",
    es: "Un diario de piel negra con su nombre en dorado, cerrado con un candado en forma de corazón. Giran la llave, el candado cae y la tapa se abre sobre un collage de amor gótico: tu foto entre rosas oscuras y un corazón anatómico, tus palabras en letras recortadas, vuestra canción en un pequeño reproductor, tu segunda foto impresa en una carta del tarot, Los Enamorados, cartas y un dado por la apuesta que harías por los dos, un cuervo, velas consumidas y polaroids hasta tu carta bajo un sello de lacre. Cada toque en la página deja una rosa. Burdeos, noir o pergamino.",
  },
  occasions: ["anniversary", "halloween", "valentines"],
  styles: ["romantic", "cinematic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 1, max: 10 } },
  thumbnail: { poster: "/templates/dark-romance/poster.jpg", webm: "/templates/dark-romance/preview.webm" },
  defaultAccent: "#9B1B30",
  heavy: false,
  sortOrder: 43,
};
