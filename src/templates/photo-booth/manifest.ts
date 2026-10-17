import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "photo-booth",
  name: { en: "Photo Booth", es: "Fotomatón" },
  tagline: { en: "Pull the curtain, press the button. Four flashes, and a strip of the two of you prints.", es: "Corre la cortina y pulsa el botón. Cuatro flashes, y sale una tira de fotos de los dos." },
  description: {
    en: "An old photo booth in red velvet, with a sign lit up on top. They pull the curtain aside and press the big red button: three, two, one, flash, four times, and each flash freezes one of your photos in the booth's mirror. The machine whirrs, and the strip slides out of the slot still grey, coming up in colour as they watch. They tap it to take it, and it lands on a wall of love letters: your letter on lined paper in handwriting, lipstick kisses, a teddy, envelopes and heart stamps, and a line of yours in pen. Cherry, blush, black or mint; colour, black and white, or sepia.",
    es: "Un fotomatón antiguo de terciopelo rojo, con un letrero encendido encima. Corren la cortina y pulsan el gran botón rojo: tres, dos, uno, flash, cuatro veces, y cada flash congela una de tus fotos en el espejo de la cabina. La máquina zumba y la tira sale por la ranura todavía gris, y el color aparece mientras la miran. La tocan para cogerla y cae en un muro de cartas de amor: tu carta a mano en papel de rayas, besos de pintalabios, un osito, sobres y sellos de corazón, y una frase tuya a boli. Cereza, rosa, negro o menta; en color, en blanco y negro o en sepia.",
  },
  occasions: ["valentines", "anniversary", "just-because"],
  styles: ["retro", "romantic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 1, max: 10 } },
  thumbnail: { poster: "/templates/photo-booth/poster.jpg", webm: "/templates/photo-booth/preview.webm" },
  defaultAccent: "#B8142C",
  heavy: false,
  sortOrder: 9,
};
