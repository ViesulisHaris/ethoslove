import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "paper-crane",
  name: { en: "Paper Crane", es: "Grulla de papel" },
  tagline: {
    en: "Fold it with me, one crease at a time.",
    es: "Dóblala conmigo, pliegue a pliegue.",
  },
  description: {
    en: "A sheet of paper on a quiet table. They press and hold each crease and the paper folds while they hold it — let go early and it springs open, so it takes patience. Every fold that lands says one more line of what you wanted to say. After the last one it is a crane, and when they blow into their phone it lifts and flies off, leaving your letter where it was. There is a tap-to-fold and a let-it-go button for any phone that can't listen.",
    es: "Una hoja de papel en una mesa tranquila. Mantienen pulsado cada pliegue y el papel se dobla mientras aguantan; si sueltan antes de tiempo, se abre otra vez, así que hace falta paciencia. Cada pliegue que sale dice una frase más de lo que querías decirle. Con el último ya es una grulla, y cuando soplan al teléfono se levanta y se va volando, dejando tu carta donde estaba. Hay un botón para doblar tocando y otro para soltarla, por si el teléfono no puede escuchar.",
  },
  occasions: ["apology", "just-because", "long-distance"],
  styles: ["minimal", "romantic"],
  tier: "premium",
  features: {
    music: true,
    video: false,
    countdown: true,
    surprise: true,
    captions: true,
    photos: { min: 0, max: 6 },
    needs: ["microphone"],
  },
  thumbnail: {
    poster: "/templates/paper-crane/poster.jpg",
    webm: "/templates/paper-crane/preview.webm",
  },
  defaultAccent: "#A8755F",
  heavy: false,
  sortOrder: 39,
};
