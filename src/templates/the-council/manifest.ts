import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "the-council",
  name: { en: "The Council", es: "El Consejo" },
  tagline: { en: "Five cats review their case, read out the evidence, and stamp a verdict.", es: "Cinco gatos revisan su caso, leen las pruebas y sellan un veredicto." },
  description: {
    en: "A council of cats sits behind the bench: the chair with the paperwork, the prosecution, security in a shark hat, a witness already in tears. They call the hearing to order, each cat reads out one of the findings you wrote (“said five minutes away, from bed”), the gavel comes down three times, and the ruling arrives with a rubber stamp: guilty, approved, certified or pardoned. Your photos go in as exhibits, and the full ruling is your letter.",
    es: "Un consejo de gatos se sienta tras el estrado: la presidencia con el papeleo, la fiscalía, seguridad con gorro de tiburón y un testigo ya llorando. Abren la sesión, cada gato lee una de las conclusiones que escribiste («dijo que llegaba en cinco minutos, desde la cama»), el mazo cae tres veces y llega la sentencia con su sello de goma: culpable, visto bueno, certificado o indulto. Tus fotos entran como pruebas, y la sentencia completa es tu carta.",
  },
  occasions: ["just-because", "anniversary", "birthday"],
  styles: ["playful"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 0, max: 6 } },
  thumbnail: { poster: "/templates/the-council/poster.jpg", webm: "/templates/the-council/preview.webm" },
  defaultAccent: "#C0392B",
  heavy: false,
  sortOrder: 9,
};
