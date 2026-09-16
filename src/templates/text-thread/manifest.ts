import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "text-thread",
  name: { en: "Text Thread", es: "Hilo de mensajes" },
  tagline: { en: "A conversation that arrives one bubble at a time.", es: "Una conversación que llega burbuja a burbuja." },
  description: {
    en: "You write the messages; they watch them arrive, typing dots, little pops, photos dropped in as attachments, the occasional voice-note-shaped pause. It reads like the chat you actually have, ending on the one message you'd never send by text. Friendly, fast, made for phones.",
    es: "Tú escribes los mensajes; ellos los ven llegar: puntitos de «escribiendo», pequeños pops, fotos adjuntas, alguna pausa con forma de nota de voz. Se lee como el chat que tenéis de verdad, y termina con el mensaje que nunca mandarías por texto. Cercano, rápido, hecho para el móvil.",
  },
  occasions: ["just-because", "apology", "long-distance", "birthday"],
  styles: ["playful", "minimal"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 0, max: 12 } },
  thumbnail: { poster: "/templates/text-thread/poster.jpg", webm: "/templates/text-thread/preview.webm" },
  defaultAccent: "#2E4A62",
  heavy: false,
  sortOrder: 120,
};
