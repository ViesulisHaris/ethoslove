import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "unwrapped",
  name: { en: "Unwrapped", es: "Nuestro año, desenvuelto" },
  tagline: {
    en: "Your year together, one present at a time. Tear the paper and a number counts up.",
    es: "Vuestro año juntos, regalo a regalo. Rompe el papel y un número empieza a contar.",
  },
  description: {
    en: "A row of presents, each wrapped in paper and tied with a ribbon, and a gold one at the end. They tear the paper off with a tap or a swipe, and inside each is a number from your year that counts up as it appears: 1,284 voice notes, 41 nights they stole the blanket, 3 cities you got lost in. Up to eight, written by you. The gold present prints the whole year as a receipt, total included, with your names on the barcode. Then your letter, your photos and your song. Red and green, brown paper, tartan or pink.",
    es: "Una fila de regalos, cada uno envuelto en papel y con su lazo, y uno dorado al final. Rompe el papel con un toque o deslizando el dedo y dentro de cada uno hay un número de vuestro año que sube al aparecer: 1.284 audios, 41 noches que te robó la manta, 3 ciudades donde os perdisteis. Hasta ocho, escritos por ti. El dorado imprime el año entero como un tique, con el total y vuestros nombres en el código de barras. Después, tu carta, tus fotos y vuestra canción. Rojo y verde, papel de estraza, escocés o rosa.",
  },
  occasions: ["christmas", "anniversary"],
  styles: ["playful", "romantic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 0, max: 10 } },
  thumbnail: { poster: "/templates/unwrapped/poster.jpg", webm: "/templates/unwrapped/preview.webm" },
  defaultAccent: "#C62F2A",
  heavy: false,
  sortOrder: 9,
};
