import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "keepsake",
  name: { en: "Keepsake", es: "Recuerdo" },
  tagline: { en: "Break the wax seal. Pressed flowers, a gold locket that opens, and a typed letter.", es: "Rompe el sello de lacre. Flores prensadas, un relicario de oro que se abre y una carta a máquina." },
  description: {
    en: "A kraft-paper parcel tied with twine and closed with a wax seal. They break it and scroll through a box of kept things: your first photo on deckle-edged paper under dried flowers, a ticket with a number only the two of you would recognise, one word torn out of a book, and a gold locket with your initials that opens on a tap to the photo inside. The rest of the photos are pressed in like pages, and your letter is typed on aged paper with the seal at the bottom and a P.S. in its own envelope. Kraft, ivory or dusty rose.",
    es: "Un paquete de papel kraft atado con cordel y cerrado con un sello de lacre. Lo rompen y bajan por una caja de cosas guardadas: tu primera foto en papel de borde irregular bajo flores secas, un billete con un número que solo reconoceríais vosotros, una palabra arrancada de un libro y un relicario de oro con vuestras iniciales que se abre con un toque a la foto de dentro. El resto de las fotos van prensadas como páginas, y tu carta está escrita a máquina en papel envejecido, con el sello al pie y una posdata en su propio sobre. Kraft, marfil o rosa empolvado.",
  },
  occasions: ["anniversary", "long-distance", "mothers-day", "just-because"],
  styles: ["romantic", "retro"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 1, max: 9 } },
  thumbnail: { poster: "/templates/keepsake/poster.jpg", webm: "/templates/keepsake/preview.webm" },
  defaultAccent: "#8E2B2B",
  heavy: false,
  sortOrder: 9,
};
